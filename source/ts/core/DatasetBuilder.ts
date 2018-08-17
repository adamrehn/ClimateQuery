import * as path from 'path';
import { EventEmitter } from 'events';
import { BuildProgress, BuildPhase } from './BuildProgress';
import { CsvDataUtil } from './CsvDataUtil';
import { DatabaseUtil, DatabaseHandle } from './DatabaseUtil';
import { DataRequest } from './DataRequest';
import { DatatypeCode } from './DatatypeCodes';
import { DatasetGranularity, DatasetGranularityHelper } from './DatasetGranularities';
import { EnvironmentUtil } from './EnvironmentUtil';

class ProgressDetails
{
	public current : number = 0;
	public total : number = 0;
}

export class DatasetBuilder
{
	//Lists the fields that are common to all datatypes
	public static commonFields(granularity : DatasetGranularity)
	{
		switch (granularity)
		{
			case DatasetGranularity.Year:
				return ['Station', 'Year'];
			
			case DatasetGranularity.Month:
				return ['Station', 'Year', 'Month'];
			
			case DatasetGranularity.Day:
				return ['Station', 'Year', 'Month', 'Day'];
			
			case DatasetGranularity.Hour:
				return ['Station', 'Year', 'Month', 'Day', 'Hour'];
			
			case DatasetGranularity.Minute:
				return ['Station', 'Year', 'Month', 'Day', 'Hour', 'Minute'];
			
			case DatasetGranularity.Second:
				return ['Station', 'Year', 'Month', 'Day', 'Hour', 'Minute', 'Second'];
			
			case DatasetGranularity.Unknown:
				return ['Station'];
		}
	}
	
	//Determines the overall granularity of a dataset request, throwing an error if multiple granularities are detected
	public static async detectSingleGranularity(request : DataRequest, dataFiles? : Map<DatatypeCode, string[]>)
	{
		//Compute the set of unique granularities
		let granularities = await DatasetBuilder.detectGranularities(request, dataFiles);
		let uniqueGranularities = new Set<DatasetGranularity>(granularities.values());
		
		//Ensure we only have one granularity
		if (uniqueGranularities.size > 1) {
			throw new Error('multiple granularities detected in dataset input files');
		}
		
		return [...uniqueGranularities.values()][0];
	}
	
	//Determines the granularity of each of the datatypes in a dataset request
	public static async detectGranularities(request : DataRequest, dataFiles? : Map<DatatypeCode, string[]>)
	{
		//If a set of data files were not supplied, compute the list of files
		if (dataFiles === undefined) {
			dataFiles = await DatasetBuilder.getRequestDataFiles(request);
		}
		
		//Iterate over the datatypes and determine the granularity for each
		let granularities = new Map<DatatypeCode, DatasetGranularity>();
		for (let code of request.datatypeCodes)
		{
			//Parse the first CSV file to retrieve the column names
			let firstFile : string[][] = await CsvDataUtil.parseBOMCsv((<string[]>dataFiles.get(code))[0]);
			
			//Remap the column names to more SQL-friendly versions
			DatabaseUtil.renameFields(firstFile, DatasetBuilder.fieldReplacements());
			
			//Detect the granularity based on the transformed column names
			granularities.set(code, DatasetGranularityHelper.detectGranularity(firstFile[0]));
		}
		
		return granularities
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
			let dataFiles = await DatasetBuilder.getRequestDataFiles(request);
			for (let code of request.datatypeCodes) {
				totalDataFiles += (<string[]>(dataFiles.get(code))).length;
			}
			
			//Determine the dataset granularity (ensuring we only have a single granularity)
			let granularity = await DatasetBuilder.detectSingleGranularity(request, dataFiles);
			
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
			await this.mergeMultipleDatatypes(db, request.datatypeCodes, granularity);
			
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
	
	private static fieldReplacements()
	{
		return new Map<string,string>([
			
			//Rename BOM-supplied field names
			
			['dc',                                                                            'DC'],
			['hm',                                                                            'HM'],
			['Station Number',                                                                'Station'],
			['Year',                                                                          'Year'],
			['Month',                                                                         'Month'],
			['Day',                                                                           'Day'],
			['Hour',                                                                          'Hour'],
			['Minute',                                                                        'Minute'],
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
			['Air Temperature in degrees C',                                                  'AirTemp'],
			['Quality of air temperature',                                                    'QualityAirTemp'],
			['Dew point temperature in degrees C',                                            'DewPoint'],
			['Quality of dew point temperature',                                              'QualityDewPoint'],
			['Relative humidity in percentage %',                                             'Humidity'],
			['Quality of relative humidity',                                                  'QualityHumidity'],
			['Wind speed in km/h',                                                            'WindSpeed'],
			['Wind speed quality',                                                            'QualityWindSpeed'],
			['Wind direction in degrees true',                                                'WindDirection'],
			['Wind direction quality',                                                        'QualityWindDirection'],
			['Speed of maximum windgust in last 10 minutes in  km/h',                         'MaxWindGust'],
			['Quality of speed of maximum windgust in last 10 minutes',                       'QualityMaxWindGust'],
			['AWS Flag',                                                                      'WeatherStationType'],
			['#',                                                                             'Sentinel'],
			
			//Rename some of the redundant field names generated by the "Aggregate Data Directory" datapreprocessing tool
			
			['MaxMaxWindGust',                                                                'MaxWindGust']
		]);
	}
	
	private tableName(datatypeCode : DatatypeCode|string) {
		return 't' + datatypeCode;
	}
	
	//Retrieves the list of CSV data files in the directory for the all datatypes in a dataset request
	public static async getRequestDataFiles(request : DataRequest)
	{
		let dataFiles = new Map<DatatypeCode, string[]>();
		for (let code of request.datatypeCodes) {
			dataFiles.set(code, await DatasetBuilder.getCodeDataFiles(<string>(request.datatypeDirs.get(code))));
		}
		
		return dataFiles;
	}
	
	//Retrieves the list of CSV data files in the directory for the specified datatype
	public static async getCodeDataFiles(datatypeDir : string)
	{
		//Retrieve the list of CSV data files
		let matches : string[] = await EnvironmentUtil.glob(path.join(datatypeDir, '*_Data_*.txt'));
		
		//We should have at least one CSV file
		if (matches.length == 0) {
			throw new Error('failed to find data CSV files in source directory "' + datatypeDir + '"');
		}
		
		return matches;
	}
	
	//Retrieves the list of station list files in the directory for the all datatypes in a dataset request
	public static async getRequestStationLists(request : DataRequest)
	{
		let stationLists = new Map<DatatypeCode, string>();
		for (let code of request.datatypeCodes) {
			stationLists.set(code, await DatasetBuilder.getCodeStationList(<string>(request.datatypeDirs.get(code))));
		}
		
		return stationLists;
	}
	
	//Retrieves the station list file in the directory for the specified datatype
	public static async getCodeStationList(datatypeDir : string)
	{
		//Find the "station details" CSV file in the specified source directory
		let matches : string[] = await EnvironmentUtil.glob(path.join(datatypeDir, '*_StnDet_*.txt'));
		
		//We should have exactly one matching file
		if (matches.length != 1) {
			throw new Error('failed to find station details file in source directory "' + datatypeDir + '"');
		}
		
		return matches[0];
	}
	
	//Retrieves the list of notes files in the directory for the all datatypes in a dataset request
	public static async getRequestNotes(request : DataRequest)
	{
		let notesFiles = new Map<DatatypeCode, string>();
		for (let code of request.datatypeCodes) {
			notesFiles.set(code, await DatasetBuilder.getCodeNotes(<string>(request.datatypeDirs.get(code))));
		}
		
		return notesFiles;
	}
	
	//Retrieves the notes file in the directory for the specified datatype
	public static async getCodeNotes(datatypeDir : string)
	{
		//Find the "notes" text file in the specified source directory
		let matches : string[] = await EnvironmentUtil.glob(path.join(datatypeDir, '*_Notes_*.txt'));
		
		//We should have exactly one matching file
		if (matches.length != 1) {
			throw new Error('failed to find notes file in source directory "' + datatypeDir + '"');
		}
		
		return matches[0];
	}
	
	//Loads all of the CSV data files in the directory for the specified datatype into a database table
	private async extractCsvToTable(db : DatabaseHandle, datatypeCode : DatatypeCode, csvFiles : string[], stations : number[], startYear : number, endYear : number, datasetProgress : ProgressDetails)
	{
		try
		{
			//Parse the first CSV file to retrieve the column names and representative values
			let firstFile : string[][] = await CsvDataUtil.parseBOMCsv(csvFiles[0]);
			
			//Remap the column names to more SQL-friendly versions
			DatabaseUtil.renameFields(firstFile, DatasetBuilder.fieldReplacements());
			
			//Keep track of the column indices for the "Station" and "Year" fields
			let headerRow = firstFile.slice(0, 1);
			let stationColumn = headerRow[0].indexOf('Station');
			let yearColumn = headerRow[0].indexOf('Year');
			
			//Create the database table
			let tableName = this.tableName(datatypeCode);
			await DatabaseUtil.tableFromData(db, tableName, firstFile, true);
			
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
					
					//Determine if we are filtering by station
					if (stations.length > 0 && stations.indexOf(station) == -1) {
						return false;
					}
					
					//Determine if we are filtering by year
					if (startYear != DataRequest.AllYears && endYear != DataRequest.AllYears && (year < startYear || year > endYear)) {
						return false;
					}
					
					return true;
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
	private async mergeMultipleDatatypes(db : DatabaseHandle, datatypeCodes : DatatypeCode[], granularity : DatasetGranularity, isInsideRecursion? : boolean)
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
				await DatabaseUtil.joinTables(db, tableLeft, tableRight, tableResult, DatasetBuilder.commonFields(granularity), false);
				
				//Drop the original tables
				await DatabaseUtil.dropTable(db, tableLeft),
				await DatabaseUtil.dropTable(db, tableRight)
				
				//Rename the result table to the name of the RHS table
				await DatabaseUtil.renameTable(db, tableResult, tableRight);
			}
			else
			{
				//Merge recursively until we have only one table
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(0,2), granularity, true);
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(1), granularity, true);
			}
			
			//If this is the root call to this method and we had more than one datatype, finalise the merge
			if (!(isInsideRecursion === true) && datatypeCodes.length > 1) {
				await this.mergeMultipleDatatypes(db, datatypeCodes.slice(-1), granularity, true);
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
