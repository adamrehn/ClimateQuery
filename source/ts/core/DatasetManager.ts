import * as fs from 'fs';
import * as path from 'path';
import * as mkdirp from 'mkdirp';
import { SHA256 } from 'crypto-js';
import { EventEmitter } from 'events';
import { EnvironmentUtil } from './EnvironmentUtil';
import { DatabaseUtil, DatabaseHandle } from './DatabaseUtil';
import { DataRequest } from './DataRequest';
import { Dataset } from './Dataset'
import { DatasetBuilder } from './DatasetBuilder';
import { DatatypeCode, DatatypeCodeHelper } from './DatatypeCodes';
import { DatasetGranularity, DatasetGranularityHelper } from './DatasetGranularities';
import { SummaryWriter } from './SummaryWriter'

//Wrap fs.unlink() in a Promise-based interface
require('util.promisify/shim')();
import { promisify } from 'util';
const unlink = promisify(fs.unlink);

//Imports for modules without type declarations
const isNumeric : any = require('isnumeric');

export class DatasetManager
{
	//Wraps instance creation in a Promise interface
	public static createManager()
	{
		return new Promise<DatasetManager>((resolve : Function, reject : Function) =>
		{
			let manager = new DatasetManager();
			manager.on('ready', () => {
				resolve(manager);
			});
			manager.on('error', (err : Error) => {
				reject(err);
			});
		});
	}
	
	private events : EventEmitter;
	private datasets : Dataset[];
	
	public constructor()
	{
		this.events = new EventEmitter();
		this.datasets = [];
		
		//If an index file exists, parse it and verify that its entries are valid
		let indexFile = this.indexFilePath();
		fs.readFile(indexFile, (err : Error, indexData : Buffer) =>
		{
			if (err)
			{
				//Index file doesn't exist yet
				this.events.emit('ready');
			}
			else
			{
				try
				{
					//Attempt to parse the index file JSON
					let parsedIndex : any = JSON.parse(indexData.toString());
					this.datasets = this.parseAndValidateIndex(parsedIndex);
				}
				catch (e) {
					//The index file did not contain valid JSON data
				}
				
				//Clean up any stray SQLite database files left over from failed dataset builds
				let datasetFiles = this.datasets.map((d : Dataset) => { return d.database; });
				EnvironmentUtil.glob(path.join(this.databaseDirectory(), '*.sqlite')).then((matches : string[]) =>
				{
					let filesToRemove = matches.filter((file : string) => { return (datasetFiles.indexOf(file) == -1); });
					Promise.all(filesToRemove.map((file : string) => { return unlink(file); })).then((result : any) => {
						this.events.emit('ready');
					})
					.catch((err : Error) => {
						this.events.emit('error', err);
					});
				})
				.catch((err : Error) => {
					this.events.emit('error', err);
				});
			}
		});
	}
	
	public on(event : string, handler : (...args: any[]) => void) {
		this.events.on(event, handler);
	}
	
	public listDatasets() {
		return this.datasets;
	}
	
	//Builds the query for determining the number of dataset rows with a 'Y' quality value
	private qualityQueryForDatatypes(codes : DatatypeCode[], aggregateBy? : string[])
	{
		//Retrieve the presence count and any aggregation fields
		let query = 'SELECT COUNT(*) AS TotalPresent';
		if (aggregateBy !== undefined) {
			query += ', ' + aggregateBy.join(',');
		}
		query += ' FROM dataset WHERE ';
		
		//Include the quality fields for each datatype code
		let mappings = new Map<DatatypeCode, string[]>([
			[DatatypeCode.Rainfall,               ['QualityRainfall']],
			[DatatypeCode.MinMaxMeanTemperature,  ['QualityMaxTemp', 'QualityMinTemp']],
			[DatatypeCode.SolarExposure,          ['QualitySolarExposure']],
			[DatatypeCode.WindDewHumidityAirTemp, ['QualityAirTemp', 'QualityDewPoint', 'QualityHumidity', 'QualityWindSpeed', 'QualityWindDirection', 'QualityMaxWindGust']]
		]);
		query += codes.map((code : DatatypeCode) =>
		{
			return (<string[]>mappings.get(code)).map((field : string) => {
				return `${field} = "Y"`;
			})
			.join(' AND ');
		})
		.join(' AND ');
		
		//If we are performing aggregation, append the GROUP BY clause
		if (aggregateBy !== undefined) {
			query += ' GROUP BY ' + aggregateBy.join(',') + ' ORDER BY ' + aggregateBy.join(',');
		}
		
		query += ';';
		return query;
	}
	
	//Returns the "data presence report" for a dataset, listing percentages of data present, aggregated by station and year
	public async generatePresenceReport(dataset : Dataset)
	{
		try
		{
			//Create the nested map to hold the presence results
			let presence = new Map<number, Map<number, number>>();
			
			//Open the database for the dataset
			let db = await DatabaseUtil.createHandle(dataset.database);
			
			//Build the query to determine the number of entries with a 'Y' value for the quality
			let query = this.qualityQueryForDatatypes(dataset.request.datatypeCodes, ['Station', 'Year']);
			
			//Query the dataset for the number of quality entries
			let presentRowsQuery : any[] = await DatabaseUtil.all(db, query);
			
			//Iterate over the results and populate our nested map
			presentRowsQuery.forEach((row : any) =>
			{
				//Extract the details for the row
				let station = Number.parseInt(<string>row['Station']);
				let year = Number.parseInt(<string>row['Year']);
				let present = (Number.parseInt(<string>row['TotalPresent']) / 365.0) * 100.0;
				
				//Update the nested map
				if (presence.has(station) === false) {
					presence.set(station, new Map<number, number>());
				}
				(<Map<number, number>>presence.get(station)).set(year, present);
			});
			
			//Close the database
			db.close();
			
			return presence;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Attempts to create a temporary (in-memory) dataset
	public async createTemporaryDataset(request : DataRequest, progressCallback : (...args: any[]) => void)
	{
		try
		{
			//Attempt to create the dataset
			let builder = new DatasetBuilder();
			builder.on('progress', progressCallback);
			return await builder.buildDataset('', request);
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Attempts to create a new dataset and add it to the index
	public async createDataset(datasetName : string, request : DataRequest, progressCallback : (...args: any[]) => void)
	{
		try
		{
			//Create an index entry for the dataset
			let timestamp = Math.floor(Date.now() / 1000);
			let entry = new Dataset();
			entry.name = datasetName;
			entry.request = request;
			entry.timestamp = timestamp;
			entry.database = this.generateDatabaseFilename(datasetName, timestamp);
			
			//Determine the dataset granularity (ensuring we only have a single granularity)
			entry.granularity = await DatasetBuilder.detectSingleGranularity(request);
			
			//Attempt to create the dataset
			let builder = new DatasetBuilder();
			builder.on('progress', progressCallback);
			let db : DatabaseHandle = await builder.buildDataset(entry.database, entry.request);
			
			//Build the query to determine the number of entries with a 'Y' value for the quality
			let query = this.qualityQueryForDatatypes(request.datatypeCodes);
			
			//Query the dataset for the number of quality entries
			let queryResult : any = await DatabaseUtil.get(db, query);
			let totalPresent = Number.parseInt(<string>queryResult['TotalPresent']);
			
			//Query the dataset for the total number of rows
			queryResult = await DatabaseUtil.get(db, 'SELECT COUNT(*) AS TotalRows FROM dataset;');
			let totalRows = Number.parseInt(<string>queryResult['TotalRows']);
			
			//Compute the percentage of entries that have values present
			let percentPresent = ((totalPresent / totalRows) * 100.0);
			entry.present = (isNaN(percentPresent) == true) ? 0 : percentPresent;
			
			//Close the database
			db.close();
			
			//Append the entry into our index and commit it to disk
			let entryIndex = this.datasets.push(entry);
			await this.saveIndex();
			return entryIndex;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Attempts to delete the specified dataset
	public deleteDataset(entryIndex : number)
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			//Verify that the specified index is valid
			if (entryIndex < 0 || entryIndex >= this.datasets.length)
			{
				reject(new Error('Dataset index out of bounds: ' + entryIndex));
				return;
			}
			
			//Attempt to delete the database file for the dataset
			let entry = this.datasets[entryIndex];
			fs.unlink(entry.database, (err : Error) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else
				{
					//Remove the entry from the index and attempt to save it to disk
					this.datasets.splice(entryIndex, 1);
					this.saveIndex().then((result : any) => {
						resolve(true);
					}).catch((err : Error) => {
						reject(err);
					});
				}
			});
		});
	}
	
	public async exportDatasetWithQuery(entryIndex : number, csvFile : string, queryName : string, querySQL : string, params : Map<string,Object>)
	{
		try
		{
			//Verify that the specified index is valid
			if (entryIndex < 0 || entryIndex >= this.datasets.length) {
				throw new Error('Dataset index out of bounds: ' + entryIndex);
			}
			
			//Open the database and export the query results to file
			let entry = this.datasets[entryIndex];
			let db : DatabaseHandle = await DatabaseUtil.createHandle(entry.database, true);
			await DatabaseUtil.exportToCsv(db, querySQL, params, csvFile);
			await DatabaseUtil.close(db);
			
			//Write the dataset and query details to a sibling file of the CSV file
			let siblingFile = csvFile + '.txt';
			await SummaryWriter.writeSummary(siblingFile, entry, queryName, querySQL, params);
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	public exportDataset(entryIndex : number, csvFile : string) {
		return this.exportDatasetWithQuery(entryIndex, csvFile, '', 'SELECT * FROM dataset;', new Map<string,Object>());
	}
	
	private indexFilePath() : string {
		return EnvironmentUtil.getDataDirectory() + '/datasets.json';
	}
	
	private databaseDirectory() : string
	{
		let databaseDir = EnvironmentUtil.getDataDirectory().replace(/\\/g, '/') + '/datasets';
		mkdirp.sync(databaseDir);
		return databaseDir;
	}
	
	private generateDatabaseFilename(datasetName : string, datasetTimestamp : number)
	{
		let generator = (counter : number) =>
		{
			return this.databaseDirectory() + '/' +
				SHA256(
					datasetName +
					datasetTimestamp +
					counter
				).toString()
				+ '.sqlite';
		}
		
		let counter = 0;
		let filename = generator(counter);
		while (fs.existsSync(filename))
		{
			counter++;
			filename = generator(counter);
		}
		
		return filename;
	}
	
	private saveIndex()
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			//Transform the granularity enum values for all datasets to their string representations
			let transformed = this.datasets.map((dataset : Dataset) =>
			{
				let d = JSON.parse(JSON.stringify(dataset))
				d['granularity'] = DatasetGranularityHelper.toString(dataset.granularity);
				return d;
			});
			
			//Attempt to write the index to file
			let json = JSON.stringify(transformed, null, 4);
			fs.writeFile(this.indexFilePath(), json, (err : Error) =>
			{
				if (err) {
					reject(err);
				}
				else {
					resolve(true);
				}
			});
		});
	}
	
	private parseAndValidateIndex(rawData : any)
	{
		//Create an array to hold the validated results
		let index : Dataset[] = [];
		
		//We set the source directories for each request to empty strings,
		//since the data is already in the SQLite database for the dataset
		let sourceDirs = new Map<DatatypeCode, string>();
		DatatypeCodeHelper.enumValues().forEach((dtype : DatatypeCode) => {
			sourceDirs.set(dtype, "");
		});
		
		//Verify that the index is an array of valid Dataset entries
		if (Array.isArray(rawData) === true)
		{
			rawData.forEach((candidateEntry : any) =>
			{
				//Verify that the index entry contains a valid Request child object
				if (
					candidateEntry['request'] === undefined ||
					Array.isArray(candidateEntry['request']) === true ||
					
					candidateEntry['request']['stations'] === undefined ||
					Array.isArray(candidateEntry['request']['stations']) === false ||
					
					candidateEntry['request']['datatypeCodes'] === undefined ||
					Array.isArray(candidateEntry['request']['datatypeCodes']) === false ||
					
					candidateEntry['request']['startYear'] === undefined ||
					isNumeric(candidateEntry['request']['startYear']) === false ||
					
					candidateEntry['request']['endYear'] === undefined ||
					isNumeric(candidateEntry['request']['endYear']) === false
				) {
					return;
				}
				try
				{
					let request = new DataRequest(
						candidateEntry['request']['stations'],
						candidateEntry['request']['datatypeCodes'],
						sourceDirs,
						candidateEntry['request']['startYear'],
						candidateEntry['request']['endYear']
					);
				}
				catch (e) {
					return;
				}
				
				//Verify that the index entry contains a valid dataset name
				if (
					candidateEntry['name'] === undefined ||
					typeof(candidateEntry['name']) != 'string'
				) {
					return;
				}
				
				//Verify that the index entry contains a valid database file path
				if (
					candidateEntry['database'] === undefined ||
					typeof(candidateEntry['database']) != 'string' ||
					fs.existsSync(candidateEntry['database']) === false
				) {
					return;
				}
				
				//Verify that the index entry contains a valid timestamp
				if (
					candidateEntry['timestamp'] === undefined ||
					isNumeric(candidateEntry['timestamp']) === false
				) {
					return;
				}
				
				//Verify that the index entry contains a valid "percent present" value
				if (
					candidateEntry['present'] === undefined ||
					isNumeric(candidateEntry['present']) === false
				) {
					return;
				}
				
				//Verify that the index entry contains a valid granularity
				let granularity = DatasetGranularityHelper.fromString(candidateEntry['granularity']);
				if (granularity == DatasetGranularity.Unknown) {
					return;
				}
				
				//If we reach this point, the entry passed all validation checks, and we can add it to the list
				let entry = new Dataset();
				entry.name = <string>candidateEntry['name'];
				entry.timestamp = <number>candidateEntry['timestamp'];
				entry.database = <string>candidateEntry['database'];
				entry.present = <number>candidateEntry['present'];
				entry.granularity = granularity;
				entry.request = new DataRequest(
					candidateEntry['request']['stations'],
					candidateEntry['request']['datatypeCodes'],
					sourceDirs,
					candidateEntry['request']['startYear'],
					candidateEntry['request']['endYear']
				);
				index.push(entry);
			});
		}
		
		//Return only the entries that passed validation
		return index;
	}
}
