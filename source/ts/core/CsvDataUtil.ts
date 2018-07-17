import * as csv_stringify from 'csv-stringify';
import * as csv_parse from 'csv-parse';
import * as fs from 'fs';
import * as mathjs from 'mathjs';
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
			//We need to transform the raw data before we can safely parse it
			let transform = (rawData : string) =>
			{
				//Remove any double-quotes that would make the data ill-formed
				let transformed = rawData.replace(/"/g, '');
				
				//Reformat combined column names for timestamps
				transformed = transformed.replace('Year Month Day Hour Minutes in YYYY,MM,DD,HH24,MI format in Local standard time', 'Year,Month,Day,Hour,Minute');
				
				//If there are extraneous lines of text (e.g. notes) before or after the actual data, discard them
				transformed = CsvDataUtil.stripExtraneousLines(transformed, true);
				
				return transformed;
			};
			
			//Attempt to parse the CSV file, performing our transforms prior to parsing
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
	
	//Concatenates multiple station list CSV files, using the specified notes file to construct the common header
	public static async concatenateStationLists(listFiles : string[], notesFile : string)
	{
		try
		{
			//Read the notes data and discard all text prior to the section describing the site details file format
			let notesData = (await readFile(notesFile, {encoding: 'utf-8'})).replace(/\r\n/g, '\n');
			notesData = notesData.substr(notesData.indexOf('\nSITE DETAILS FILE'));
			
			//Extract the list of header fields
			let headerFields : string[] = [];
			let sitesTableRegex = new RegExp('[0-9\\- ]+,[0-9 ]+,([^\n]+)\n', 'g');
			let match : RegExpExecArray|null = null;
			while ((match = sitesTableRegex.exec(notesData)) !== null) {
				headerFields.push(match[1].trim().replace(/\.$/, '').replace(/,/g, ''));
			}
			
			//Read all of the station lists into memory, discarding their individual headers
			let rows : string[] = [];
			for (let listFile of listFiles) {
				rows = rows.concat(CsvDataUtil.stripExtraneousLines(await readFile(listFile, {encoding: 'utf-8'}), false));
			}
			
			//Construct our common header and concatenate it with the extracted data rows
			return headerFields.join(',') + '\n' + rows.join('\n');
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Determines the length of a row of data in a BOM-format CSV file
	private static dataRowLength(lines : string[]) : number {
		return mathjs.mode(lines.map((line : string) => { return line.length; }));
	}
	
	//Strips extraneous lines of text (e.g. notes) before or after the actual data in BOM-format CSV file
	private static stripExtraneousLines(csvData : string, keepHeader : boolean)
	{
		let lines = csvData.split('\n');
		let rowLength = CsvDataUtil.dataRowLength(lines);
		return lines.filter((line : string, index : number) =>
		{
			//Determine if this is a data row
			if (line.length == rowLength) {
				return true;
			}
			
			//If we are keeping the header, determine if this is the header row
			if (keepHeader === true && index < lines.length-1 && lines[index+1].length == rowLength)
			{
				//If the line immediately preceding a data row does not have the correct comma count, it's not a header
				//(Substring counting technique adapted from here: <https://stackoverflow.com/a/4009768>)
				let dataCommas = (lines[index+1].match(/,/g) || []).length;
				let lineCommas = (line.match(/,/g) || []).length;
				if (dataCommas == lineCommas) {
					return true;
				}
			}
			
			return false;
		})
		.join('\n');
	}
}
