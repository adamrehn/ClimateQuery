import { DatatypeCode } from './DatatypeCodes';

//Imports for modules without type declarations
const isNumeric : any = require('isnumeric');

export class DataRequest
{
	public stations : number[];
	public datatypeCodes : DatatypeCode[];
	public datatypeDirs : Map<DatatypeCode, string>;
	public startYear : number;
	public endYear : number;
	
	constructor(stations : number[], datatypeCodes : DatatypeCode[], datatypeDirs : Map<DatatypeCode, string>, startYear : number, endYear : number)
	{
		this.stations = stations;
		this.datatypeCodes = datatypeCodes;
		this.datatypeDirs = datatypeDirs;
		this.startYear = startYear;
		this.endYear = endYear;
		
		//Validate that a source directory was specified for each datatype
		let typesWithDirs = this.datatypeCodes.filter((dtype : DatatypeCode) => { return this.datatypeDirs.has(dtype); });
		if (typesWithDirs.length != this.datatypeCodes.length) {
			throw new Error('Source directories must be specified for all selected measures');
		}
		
		//Validate the specified time range
		if (this.startYear > this.endYear) {
			throw new Error('End year must be greater than or equal to start year');
		}
	}
}
