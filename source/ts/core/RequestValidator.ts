import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import { EventEmitter } from 'events';
import { CsvDataUtil } from './CsvDataUtil';
import { DatabaseUtil, DatabaseHandle } from './DatabaseUtil';
import { DataRequest } from './DataRequest';
import { DatatypeCode, DatatypeCodeHelper } from './DatatypeCodes';
import { EnvironmentUtil } from './EnvironmentUtil';

export class ValidationReportItem
{
	public supported : boolean;
	public station : number;
	public datatype : DatatypeCode;
	public start : number;
	public end : number;
	
	public constructor(supported : boolean, station : number, datatype : DatatypeCode, start : number, end : number)
	{
		this.supported = supported;
		this.station = station;
		this.datatype = datatype;
		this.start = start;
		this.end = end;
	}
}

export class ValidationReport
{
	public valid : boolean;
	public request : DataRequest;
	public details : ValidationReportItem[];
	
	public constructor(valid : boolean, request : DataRequest, details : ValidationReportItem[])
	{
		this.valid = valid;
		this.request = request;
		this.details = details;
	}
}

export class RequestValidator
{
	public static async validateRequest(request : DataRequest)
	{
		try
		{
			//Create an in-memory database to hold the tables for the stations supporting each datatype
			let db : DatabaseHandle = await DatabaseUtil.createHandle(':memory:');
			
			//Retrieve the list of stations supporting each requested datatype code and store them as database tables
			let promises = request.datatypeCodes.map((code : DatatypeCode) => { return RequestValidator.processStationList(db, code, <string>(request.datatypeDirs.get(code))); });
			await Promise.all(promises);
			
			//Build the list of queries to determine if all stations and datatype combinations are supported
			let queries : Promise<ValidationReportItem>[] = [];
			request.stations.forEach((station : number) =>
			{
				request.datatypeCodes.forEach((code : DatatypeCode) => {
					queries.push(RequestValidator.validationQuery(db, station, code, request.startYear, request.endYear));
				});
			});
			
			//Run all of the queries
			let results : ValidationReportItem[] = await Promise.all(queries);
			
			//The request is only valid if all requested combinations are supported
			let valid = (results.filter((r) => { return r.supported == true; })).length == results.length;
			let report = new ValidationReport(valid, request, results);
			
			//Close the database and resolve the Promise with the report
			db.close();
			return report;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	private static retrieveSupportedYears(db : DatabaseHandle, request : DataRequest)
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			//Build the list of queries to determine if all stations and datatype combinations are supported
			let queries : Promise<ValidationReportItem>[] = [];
			request.stations.forEach((station : number) =>
			{
				request.datatypeCodes.forEach((code : DatatypeCode) => {
					queries.push(RequestValidator.validationQuery(db, station, code, request.startYear, request.endYear));
				});
			});
			
			//Run all of the queries
			Promise.all(queries).then((results : ValidationReportItem[]) =>
			{
				//The request is only valid if all requested combinations are supported
				let valid = (results.filter((r) => { return r.supported == true; })).length == results.length;
				resolve(new ValidationReport(valid, request, results));
			})
			.catch((err : Error) => {
				reject(err);
			});
		});
	}
	
	private static validationQuery(db : DatabaseHandle, station : number, datatypeCode : DatatypeCode, startYear : number, endYear : number)
	{
		return new Promise<ValidationReportItem>((resolve : Function, reject : Function) =>
		{
			let query = 'SELECT Site, Start, End, (Start <= ? AND End >= ?) AS Supported FROM stations_' + datatypeCode + ' WHERE Site = ?';
			db.get(query, [startYear, endYear, station], (err : Error, row : any) =>
			{
				if (err) {
					reject(err);
				}
				else
				{
					//Determine if the station supports the datatype at all
					if (row === undefined)
					{
						//Datatype not supported at all, or invalid station number
						resolve(new ValidationReportItem(false, station, datatypeCode, 0, 0));
					}
					else
					{
						//Datatype supported, but not for the requested years
						resolve(new ValidationReportItem(
							(row['Supported'] == '1'),
							station,
							datatypeCode,
							Number.parseInt(row['Start']),
							Number.parseInt(row['End'])
						));
					}
				}
			});
		});
	}
	
	private static async processStationList(db : DatabaseHandle, datatypeCode : number, datatypeDir : string)
	{
		try
		{
			//Find the "station details" CSV file in the specified source directory
			let matches : string[] = await EnvironmentUtil.glob(path.join(datatypeDir, '*_StnDet_*.txt'));
			
			//We should have exactly one matching file
			if (matches.length != 1) {
				throw new Error('failed to find station details file in source directory "' + datatypeDir + '"');
			}
			
			//Attempt to parse the CSV file
			let stations : string[][] = await CsvDataUtil.parseBOMCsv(matches[0]);
			
			//Remap the column names to more SQL-friendly versions
			DatabaseUtil.renameFields(stations, new Map<string,string>([
				["Record identifier",                                    "ID"],
				["Bureau of Meteorology Station Number",                 "Site"],
				["Rainfall district code",                               "District"],
				["Station Name",                                         "Name"],
				["Month/Year site opened. (MM/YYYY)",                    "Opened"],
				["Month/Year site closed. (MM/YYYY)",                    "Closed"],
				["Latitude to 4 decimal places in decimal degrees",      "Latitude"],
				["Longitude to 4 decimal places in decimal degrees",     "Longitude"],
				["Method by which latitude/longitude was derived",       "LocMethod"],
				["State",                                                "State"],
				["Height of station above mean sea level in metres",     "StationHeight"],
				["Height of barometer above mean sea level in metres",   "BarometerHeight"],
				["WMO (World Meteorological Organisation) Index Number", "WMOIndex"],
				["First year of data supplied in data file",             "Start"],
				["Last year of data supplied in data file",              "End"],
				["Percentage complete between first and last records",   "Percent"],
				["Percentage of values with quality flag 'Y'",           "PercentY"],
				["Percentage of values with quality flag 'N'",           "PercentN"],
				["Percentage of values with quality flag 'W'",           "PercentW"],
				["Percentage of values with quality flag 'S'",           "PercentS"],
				["Percentage of values with quality flag 'I'",           "PercentI"]
			]));
			
			//Store the list as a database table
			await DatabaseUtil.tableFromData(db, 'stations_' + datatypeCode, stations);
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
