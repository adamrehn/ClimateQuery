import * as path from 'path';
import { EventEmitter } from 'events';
import { BuildProgress, BuildPhase } from './BuildProgress';
import { CsvDataUtil } from './CsvDataUtil';
import { DatabaseUtil, DatabaseHandle } from './DatabaseUtil';
import { DataRequest } from './DataRequest';
import { DatatypeCode } from './DatatypeCodes';
import { EnvironmentUtil } from './EnvironmentUtil';

class ProgressDetails
{
	public current : number = 0;
	public total : number = 0;
}

export class DatasetBuilder
{
	//Lists the fields that are common to all datatypes
	public static commonFields() {
		return ['Station', 'Year', 'Month', 'Day'];
	}
	
	private events : EventEmitter;
	
	public constructor() {
		this.events = new EventEmitter();
	}
	
	public on(event : string, handler : (...args: any[]) => void) {
		this.events.on(event, handler);
	}
	
	public async buildDataset(dbFilename : string, request : DataRequest)
	{
		try
		{
			//Attempt to create the database to hold the dataset
			let db : DatabaseHandle = await DatabaseUtil.createHandle(dbFilename);
			
			//Emit the progress event to indicate that building started
			this.events.emit('progress', new BuildProgress(BuildPhase.Started, 0, 0));
			
			//Retrieve the list of CSV data files for each of the requested datatype codes
			//and determine the total number of CSV data files to be parsed
			let totalDataFiles = 0;
			let dataFiles = new Map<DatatypeCode, string[]>();
			for (let code of request.datatypeCodes)
			{
				dataFiles.set(code, await this.getDataFiles(code, <string>(request.datatypeDirs.get(code))));
				totalDataFiles += (<string[]>(dataFiles.get(code))).length;
			}
			
			//Create the progress object that we will update throughout the build process
			let datasetProgress = new ProgressDetails();
			datasetProgress.total = totalDataFiles;
			datasetProgress.current = 0;
			
			//Iterate over the list of requested datatype codes and load the CSV data for each into the database
			for (let code of request.datatypeCodes) {
				await this.extractCsvToTable(db, code, <string[]>(dataFiles.get(code)), request.stations, request.startYear, request.endYear, datasetProgress);
			}
			
			//Emit a progress event
			this.events.emit('progress', new BuildProgress(BuildPhase.Merging, 0, 0));
			
			//Merge the tables for each of the datatypes into a single table
			await this.mergeMultipleDatatypes(db, request.datatypeCodes);
			
			//Emit the progress event to indicate that building completed
			this.events.emit('progress', new BuildProgress(BuildPhase.Completed, 0, 0));
			
			return db;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	private fieldReplacements()
	{
		return new Map<string,string>([
			['dc',                                                                            'DC'],
			['Station Number',                                                                'Station'],
			['Year',                                                                          'Year'],
			['Month',                                                                         'Month'],
			['Day',                                                                           'Day'],
			['Precipitation in the 24 hours before 9am (local time) in mm',                   'Rainfall'],
			['Quality of precipitation value',                                                'QualityRainfall'],
			['Number of days of rain within the days of accumulation',                        'AccumulationDaysRainfall'],
			['Accumulated number of days over which the precipitation was measured',          'Period'],
			['Maximum temperature in 24 hours after 9am (local time) in Degrees C',           'MaxTemp'],
			['Quality of maximum temperature in 24 hours after 9am (local time)',             'QualityMaxTemp'],
			['Days of accumulation of maximum temperature',                                   'AccumulationDaysMaxTemp'],
			['Minimum temperature in 24 hours before 9am (local time) in Degrees C',          'MinTemp'],
			['Quality of minimum temperature in 24 hours before 9am (local time)',            'QualityMinTemp'],
			['Days of accumulation of minimum temperature',                                   'AccumulationDaysMinTemp'],
			['Average daily air temperature (using all available observations) in Degrees C', 'AverageTemp'],
			['Quality of average daily temperature (sum_obs/count_obs)',                      'QualityAverageTemp'],
			['Total daily global solar exposure - derived from satellite data in MJ.m-2',     'SolarExposure'],
			['Quality Flag (refer to notes)',                                                 'QualitySolarExposure'],
			['#',                                                                             'Sentinel']
		]);
	}
	
	private tableName(datatypeCode : DatatypeCode|string) {
		return 't' + datatypeCode;
	}
	
	//Retrieves the list of CSV data files in the directory for the specified datatype
	private async getDataFiles(datatypeCode : DatatypeCode, datatypeDir : string)
	{
		//Retrieve the list of CSV data files
		let matches : string[] = await EnvironmentUtil.glob(path.join(datatypeDir, '*_Data_*.txt'));
		
		//We should have at least one CSV file
		if (matches.length == 0) {
			throw new Error('failed to find data CSV files in source directory "' + datatypeDir + '"');
		}
		
		return matches;
	}
	
	//Loads all of the CSV data files in the directory for the specified datatype into a database table
	private async extractCsvToTable(db : DatabaseHandle, datatypeCode : DatatypeCode, csvFiles : string[], stations : number[], startYear : number, endYear : number, datasetProgress : ProgressDetails)
	{
		try
		{
			//Parse the first CSV file to retrieve the column names
			let firstFile : string[][] = await CsvDataUtil.parseBOMCsv(csvFiles[0]);
			let headerRow = firstFile.slice(0, 1);
			
			//Remap the column names to more SQL-friendly versions
			DatabaseUtil.renameFields(headerRow, this.fieldReplacements());
			
			//Keep track of the column indices for the "Station" and "Year" fields
			let stationColumn = headerRow[0].indexOf('Station');
			let yearColumn = headerRow[0].indexOf('Year');
			
			//Create the database table
			let tableName = this.tableName(datatypeCode);
			await DatabaseUtil.tableFromData(db, tableName, headerRow);
			
			//Parse each of the CSV files in sequence
			//NOTE: due to the single-threaded nature of Node.js, initiating processing for multiple files
			//at a time asynchronously does not provide a performance benefit (since processing is not
			//actually taking place in parallel) and instead only increases memory usage. As such, a serial
			//loop is the most resource-efficient implementation (without resorting to using native code to
			//perform multithreading), and also has the benefit of providing the smoothest updating of the
			//UI progress bar for the end user.
			for (let csvFile of csvFiles)
			{
				//Attempt to parse the CSV file
				let rows : string[][] = await CsvDataUtil.parseBOMCsv(csvFile);
				
				//Keep only the rows for those stations and years we are interested in, discarding the header row
				rows = rows.filter((row : string[], index : number) =>
				{
					if (index == 0) { return false; }
					let station = Number.parseInt(row[stationColumn]);
					let year = Number.parseInt(row[yearColumn]);
					return (stations.indexOf(station) != -1 && year >= startYear && year <= endYear);
				});
				
				//Insert the filtered data into the database table
				await DatabaseUtil.batchInsert(db, tableName, rows);
				
				//Emit a progress event
				datasetProgress.current += 1
				this.events.emit('progress', new BuildProgress(BuildPhase.Processing, datasetProgress.current, datasetProgress.total));
			}
			
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Recursively merges tables for multiple datatypes
	private async mergeMultipleDatatypes(db : DatabaseHandle, datatypeCodes : DatatypeCode[], isInsideRecursion? : boolean)
	{
		try
		{
			//Check how many datatypes we are merging
			if (datatypeCodes.length == 1)
			{
				//Rename the final merge table to discard the reference to any datatype codes
				let tableName = this.tableName(datatypeCodes[0]);
				await DatabaseUtil.renameTable(db, tableName, 'dataset');
			}
			else if (datatypeCodes.length == 2)
			{
				//If there are two datatypes, merge them together
				var tableLeft = this.tableName(datatypeCodes[0]);
				var tableRight = this.tableName(datatypeCodes[1]);
				var tableResult = this.tableName('mergetemp');
				await DatabaseUtil.joinTables(db, tableLeft, tableRight, tableResult, DatasetBuilder.commonFields(), false);
				
				//Drop the original tables
				await DatabaseUtil.dropTable(db, tableLeft),
				await DatabaseUtil.dropTable(db, tableRight)
				
				//Rename the result table to the name of the RHS table
				await DatabaseUtil.renameTable(db, tableResult, tableRight);
			}
			else
			{
				//Merge recursively until we have only one table
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(0,2), true);
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(1), true);
			}
			
			//If this is the root call to this method and we had more than one datatype, finalise the merge
			if (!(isInsideRecursion === true) && datatypeCodes.length > 1) {
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(-1), true);
			}
			
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
