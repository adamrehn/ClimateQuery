import * as csv_stringify from 'csv-stringify';
import * as csv_parse from 'csv-parse';
import * as fs from 'fs';
import { DatatypeCode } from './DatatypeCodes';

//Wrap fs.readFile() fs.writeFile() in a Promise-based interface
require('util.promisify/shim')();
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export class CsvDataUtil
{
	//Parses a headerless, single-column CSV file and returns the values as a list
	public static async csvToList(csvFile : string)
	{
		try
		{
			//Attempt to parse the CSV file
			let result = await CsvDataUtil.parseCsv(csvFile);
			
			//Flatten the result array
			let flattened : string[] = [];
			for (let row of result)
			{
				if (row.length != 1) {
					throw new Error('CSV file contains more than one column');
				}
				
				flattened.push(row[0]);
			}
			
			return flattened;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Parses data in the hybrid fixed-width CSV format that BOM supplies data in
	public static async parseBOMCsv(csvFile : string) : Promise<string[][]>
	{
		try
		{
			//Attempt to parse the CSV file, removing any double-quotes that would make the data ill-formed
			let transform = (rawData : string) => { return rawData.replace(/"/g, ''); };
			let result = await CsvDataUtil.parseCsv(csvFile, transform);
			
			//Strip away the excess whitespace introduced by the fixed-width formatting
			result = result.map((row : any) => {
				return row.map((field : string) => { return field.trim(); });
			});
			
			return result;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Parses a CSV file, applying the data transformation callback (if supplied) prior to parsing
	public static parseCsv(csvFile : string, transform? : (rawData : string) => string) : Promise<string[][]>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			readFile(csvFile).then((data : Buffer) => 
			{
				//Apply the transformation function (if supplied)
				let transformed = data.toString('utf-8');
				if (transform !== undefined) {
					transformed = transform(transformed);
				}
				
				//Attempt to parse the transformed data
				let parser = csv_parse(transformed, undefined, (err : Error, result : string[][]) =>
				{
					if (err) {
						reject(err);
					}
					else {
						resolve(result);
					}
				});
			})
			.catch((err : Error) => {
				reject(err);
			});
		});
	}
	
	//Writes data to a CSV file
	public static writeCsv(csvFile : string, data : string[][]) : Promise<boolean>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			csv_stringify(data, (err : Error, output : any) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else
				{
					writeFile(csvFile, output).then((result : any) => {
						resolve(true);
					})
					.catch((err : Error) => {
						reject(err);
					});
				}
			});
		});
	}
}
