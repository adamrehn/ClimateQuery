import * as csv_stringify from 'csv-stringify';
import * as fs from 'fs';

//Wrap the needed filesystem methods in a Promise-based interface
require('util.promisify/shim')();
import { promisify } from 'util';
const fsOpen = promisify(fs.open);
const fsClose = promisify(fs.close);
const fsWrite = promisify(fs.write);

export class CsvFileWriter
{
	//private fileStream : fs.WriteStream;
	//private csvStringifier : csv_stringify.Stringifier;
	
	//The file descriptor of our output file
	private outfile : number = -1;
	
	public static async createWriter(csvFile : string)
	{
		try
		{
			let writer = new CsvFileWriter();
			await writer.open(csvFile);
			return writer;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	protected constructor() {}
	
	public async open(csvFile : string)
	{
		try
		{
			//Attempt to open our output file
			this.outfile = await fsOpen(csvFile, 'w');
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	public write(rows : any)
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			csv_stringify(rows, (err : Error, output : any) =>
			{
				if (err)
				{
					Error.captureStackTrace(err);
					reject(err);
				}
				else
				{
					fsWrite(this.outfile, output).then((result : any) => {
						resolve(true);
					})
					.catch((err : Error) => {
						reject(err);
					});
				}
			});
		});
	}
	
	public async close()
	{
		try
		{
			if (this.outfile != -1)
			{
				await fsClose(this.outfile);
				this.outfile = -1;
			}
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
