import { CsvDataUtil } from './CsvDataUtil';
import { DataUtils } from './DataUtils';
import * as sqlite3 from 'sqlite3';

//Imports for modules without type declarations
const isNumeric : any = require('isnumeric');

//Export the sqlite3 database handle type with an alias
export {Database as DatabaseHandle} from 'sqlite3';

//Controls whether we are in database debug mode
const DB_DEBUG : boolean = false;

export class DatabaseUtil
{
	//Helper function to sanitise a table or column name, since sqlite doesn't support
	//using bound parameters for table or column names in queries
	private static sanitiseName(n : string) {
		return '[' + n.replace(/[\s|'|"|\(|\)|\[|\]]/g, '') + ']';
	}
	
	//Helper function to filter an array to remove empty values
	private static filterEmptyValues(arr : any[]) {
		return arr.filter((elem) => { return (elem !== undefined && elem !== null && (elem.length === undefined || elem.length > 0)); });
	}
	
	//Helper function to retrieve 10 non-empty samples from the specified column of a 2D array
	private static extractSamples(arr : any[], colIndex : number, offset : number) {
		return DatabaseUtil.filterEmptyValues(DataUtils.extractColumn(arr.slice(offset,offset+10), colIndex));
	}
	
	//Helper function to convert query output to a format suitable for writing to a CSV file
	public static reshapeForCsv(rows : any[]) : any[][]
	{
		let fields = ((rows.length == 0) ? [] : Object.keys(rows[0]));
		return [fields].concat(rows.map((row) => { return (<any>Object).values(row); }));
	}
	
	//Renames fields from a 2D array where the first row contains the field names
	public static renameFields(arr : any[], replacements : Map<string,string>)
	{
		let fields = arr[0];
		for (let i = 0; i < fields.length; ++i)
		{
			let oldName = fields[i];
			let newName = replacements.get(oldName);
			if (newName !== undefined) {
				fields[i] = newName;
			}
		}
		
		arr[0] = fields;
	}
	
	//Creates a database handle for the specified filename (use ":memory:" for an in-memory DB)
	public static createHandle(filename : string, readOnly? : boolean) : Promise<sqlite3.Database>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			let mode = ((readOnly === true) ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
			let db = new sqlite3.Database(filename, mode, (err : Error | null) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else
				{
					//If debug mode is enabled, activate verbose logging for the database
					if (DB_DEBUG == true)
					{
						sqlite3.verbose();
						db.on('trace', (sql : string) => {
							console.log(sql);
						});
					}
					
					resolve(db);
				}
			});
		});
	}
	
	//Closes a database
	public static close(db : sqlite3.Database)
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			db.close((err : Error | null) =>
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
	
	//Runs a query that returns a single row of results, wrapping get() in a Promise interface
	public static get(db : sqlite3.Database, query : string, params? : any) : Promise<any>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			db.get(query, params, (err : Error, row : any) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else {
					resolve(row);
				}
			});
		});
	}
	
	//Runs a query that returns multiple rows of results, wrapping all() in a Promise interface
	public static all(db : sqlite3.Database, query : string, params? : any) : Promise<any[]>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			db.all(query, params, (err : Error, rows : any[]) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else {
					resolve(rows);
				}
			});
		});
	}
	
	//Runs a query that doesn't return results, wrapping run() in a Promise interface
	public static run(db : sqlite3.Database, query : string, params? : any)
	{
		//console.log('RUN QUERY: ' + query + ' WITH PARAMS: ' + JSON.stringify(params));
		return new Promise((resolve : Function, reject : Function) =>
		{
			db.run(query, params, (err : Error) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else {
					resolve(true);
				}
			});
		});
	}
	
	//Drops a table
	public static dropTable(db : sqlite3.Database, tableName : string) {
		return DatabaseUtil.run(db, 'DROP TABLE ' + tableName, []);
	}
	
	//Renames a table
	public static renameTable(db : sqlite3.Database, oldName : string, newName : string) {
		return DatabaseUtil.run(db, 'ALTER TABLE ' + oldName + ' RENAME TO ' + newName, []);
	}
	
	//Determines if a table exists
	public static async tableExists(db : sqlite3.Database, tableName : string) : Promise<boolean>
	{
		try
		{
			let row = await DatabaseUtil.get(db, "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name=?", [tableName]);
			return (row['count'] == '1');
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Retrieves the list of fields for the specified table
	public static async listFields(db : sqlite3.Database, tableName : string)
	{
		try
		{
			let rows = await DatabaseUtil.all(db, 'PRAGMA table_info(' + DatabaseUtil.sanitiseName(tableName) + ');', []);
			return (rows.map((row) => { return row['name']; }));
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Retrieves the mapping from field name to datatype for the specified table
	public static async getFieldTypes(db : sqlite3.Database, tableName : string)
	{
		try
		{
			let rows = await DatabaseUtil.all(db, 'PRAGMA table_info(' + DatabaseUtil.sanitiseName(tableName) + ');', []);
			let mapping = new Map<string,string>();
			for (let row of rows) {
				mapping.set(row['name'], row['type']);
			}
			
			return mapping;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Inserts large numbers of rows into a table in batches to improve performance
	public static async batchInsert(db : sqlite3.Database, table : string, rows : any[])
	{
		try
		{
			//If there are no rows to insert, do nothing
			if (rows.length == 0) {
				return true;
			}
			
			//The default value for SQLITE_MAX_VARIABLE_NUMBER is 999 (see <https://www.sqlite.org/limits.html>),
			//and we will have one SQL variable for each field in each row, so we set our batch size to be the max
			//number of variables divided by the number of fields in each row, which must be the same for all rows.
			let batchSize = Math.floor(999 / rows[0].length);
			
			//Split the rows into individual batches and create an insertion promise for each batch
			let insertPromises : Promise<any>[] = [];
			for (let i = 0; i < rows.length; i += batchSize)
			{
				let currBatch = rows.slice(i, i+batchSize);
				insertPromises.push(new Promise((resolve : Function, reject : Function) =>
				{
					let query = 'INSERT INTO ' + table + ' VALUES ';
					query += currBatch.map((row) => { return '(' + row.map((f : any) => { return '?'; }).join(',') + ')'; }).join(',') + ';';
					let params = Array.prototype.concat.apply([], currBatch);
					DatabaseUtil.run(db, query, params).then((result : any) => {
						resolve(true);
					})
					.catch((err : Error) => {
						reject(err);
					});
				}));
			}
			
			//Run all of the batches
			return await Promise.all(insertPromises);
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Clones the structure of a table without copying its data
	public static async cloneStructure(db : sqlite3.Database, origTable : string, cloneTable : string)
	{
		try
		{
			//Retrieve the structure details for the original table
			let rows = await DatabaseUtil.all(db, 'PRAGMA table_info(' + DatabaseUtil.sanitiseName(origTable) + ');', []);
			let fieldDecls = rows.map((row) => { return row['name'] + ' ' + row['type']; })
			
			//Create the new table
			await DatabaseUtil.run(db, 'CREATE TABLE ' + DatabaseUtil.sanitiseName(cloneTable) + ' (' + fieldDecls.join(', ') + ')', []);
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Creates a table in a database using the supplied data
	public static tableFromData(db : sqlite3.Database, tableName : string, data : any[], createOnly : boolean)
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			//Extract the list of field names and the remaining rows
			let fields = data[0];
			let rows = data.slice(1);
			
			//Sanitise the table name
			tableName = DatabaseUtil.sanitiseName(tableName);
			
			//Sanitise each of the field names
			fields = fields.map(DatabaseUtil.sanitiseName);
			
			//Scan the data in each column to determine if it is a string or numeric field
			let fieldTypes = new Map<string,string>();
			for (let i = 0; i < fields.length; ++i)
			{
				//Retrieve a representative set of non-empty values to scan in order to determine the datatype
				let offset = 0;
				let samples = DatabaseUtil.extractSamples(rows, i, offset);
				while (samples.length == 0 && offset < data.length - 10)
				{
					offset += 10;
					samples = DatabaseUtil.extractSamples(rows, i, offset);
				}
				
				//If the entire column was empty, treat it as a text column
				let fieldName = fields[i];
				if (samples.length == 0) {
					console.log(`THE COLUMN ${fieldName} WAS EMPTY, USING TEXT!`);
					fieldTypes.set(fieldName, 'TEXT');
				}
				else
				{
					//Only mark the field as numeric if all sample values are numeric, otherwise treat it as a string field
					var numericSamples = samples.filter((sample) => { return (isNumeric(sample) === true); });
					fieldTypes.set(fieldName, ((numericSamples.length == samples.length) ? 'NUMERIC' : 'TEXT'));
				}
			}
			
			//Create the table and populate it (unless requested otherwise)
			db.serialize(function()
			{
				//Create the table
				let fieldDecls = fields.map((field : string) => { return field + ' ' + fieldTypes.get(field); });
				DatabaseUtil.run(db, 'CREATE TABLE ' + tableName + ' (' + fieldDecls.join(', ') + ')', []).then((result : any) =>
				{
					//Determine if we are populating the table
					if (createOnly === true) {
						resolve(true);
					}
					else
					{
						DatabaseUtil.batchInsert(db, tableName, rows).then((result : any) => {
							resolve(true);
						}).catch((err : Error) => {
							reject(err);
						});
					}
				})
				.catch((err : Error) => {
					reject(err);
				});
			});
		});
	}
	
	//Exports the results of a database query to a CSV file
	public static async exportToCsv(db : sqlite3.Database, query : string, params : Map<string,Object>, csvFile : string)
	{
		try
		{
			//Unpack the params Map to a plain key-value pair object to pass to sqlite
			let paramsUnpacked : any = {};
			params.forEach((value : Object, key : string) => { paramsUnpacked[key] = value; });
			
			//Perform the query
			let rows = await DatabaseUtil.all(db, query, paramsUnpacked);
			let data = DatabaseUtil.reshapeForCsv(rows);
			
			//Write the data to the CSV file
			await CsvDataUtil.writeCsv(csvFile, data);
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Joins two tables using an INNER JOIN on the specified fields
	public static async joinTables(db : sqlite3.Database, leftTable : string, rightTable : string, resultTable : string, joinFields : string[], excludeOtherFields? : boolean)
	{
		try
		{
			//Sanitise all three table names
			leftTable = DatabaseUtil.sanitiseName(leftTable);
			rightTable = DatabaseUtil.sanitiseName(rightTable);
			resultTable = DatabaseUtil.sanitiseName(resultTable);
			
			//Retrieve the list of field names for the two tables being merged
			let fieldsLeft = await DatabaseUtil.listFields(db, leftTable);
			let fieldsRight = await DatabaseUtil.listFields(db, rightTable);
			
			//Extract the list of fields unique to their respective tables
			let uniqueFieldsLeft  = fieldsLeft.filter((field : string) => { return (fieldsRight.indexOf(field) == -1); });
			let uniqueFieldsRight = fieldsRight.filter((field : string) => { return (fieldsLeft.indexOf(field) == -1); });
			let uniqueFields = uniqueFieldsLeft.concat(uniqueFieldsRight);
			
			//Build the query
			let selectFields = ((excludeOtherFields === true) ? joinFields.map((field) => { return leftTable + '.' + field; }).concat(uniqueFields) : ['*']);
			let query = 'CREATE TABLE ' + resultTable +
				' AS SELECT ' + selectFields.join(',') + ' FROM ' + leftTable +
				' INNER JOIN ' + rightTable +
				' ON (';
			query += joinFields.map((field) => { return leftTable + '.' + field + ' = ' + rightTable + '.' + field }).join(' AND ');
			query += ')';
			
			//Run the query
			await DatabaseUtil.run(db, query, []);
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	//Appends the rows from one table to another
	public static appendTables(db : sqlite3.Database, destTable : string, sourceTable : string) {
		return DatabaseUtil.run(db, 'INSERT INTO ' + DatabaseUtil.sanitiseName(destTable) + ' SELECT * FROM ' + DatabaseUtil.sanitiseName(sourceTable) + ';', []);
	}
}
