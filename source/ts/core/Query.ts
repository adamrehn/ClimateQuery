import { DatatypeCode } from './DatatypeCodes';
import { DatasetManager } from './DatasetManager';

export class Query
{
	public name : string;
	public selectClause : string;
	public whereClauses : string[];
	public groupByFields : string[];
	public parameters : Map<string,Object>;
	public parameterTypes : Map<string,string>;
	public requiredFields : DatatypeCode[];
	
	public constructor(name : string, selectClause : string, whereClauses : string[], parameters : Map<string,Object>, parameterTypes : Map<string,string>, requiredFields : DatatypeCode[])
	{
		this.name           = name;
		this.selectClause   = selectClause;
		this.whereClauses   = whereClauses;
		this.groupByFields  = [];
		this.parameters     = parameters;
		this.parameterTypes = parameterTypes;
		this.requiredFields = requiredFields;
	}
	
	public clone()
	{
		//String deep-copy trick from: <https://stackoverflow.com/a/31733628>
		return new Query(
			(' ' + this.name).slice(1),
			(' ' + this.selectClause).slice(1),
			this.whereClauses.slice(),
			new Map<string,Object>(this.parameters),
			new Map<string,string>(this.parameterTypes),
			this.requiredFields.slice()
		);
	}
	
	//Sets the specified parameter to the supplied value
	public setParameter(parameter : string, value : Object) {
		this.parameters.set(parameter, value);
	}
	
	//Appends a WHERE clause to the query to constrain results to the specified time range
	public applyTimeRange(startYear : number, startMonth : number, endYear : number, endMonth : number)
	{
		this.whereClauses.push('(Year + ((Month - 1.0) / 12.0)) BETWEEN $decimalYearStart AND $decimalYearEnd');
		this.parameters.set('$decimalYearStart', startYear + ((startMonth - 1) / 12.0));
		this.parameters.set('$decimalYearEnd',   endYear   + ((endMonth   - 1) / 12.0));
	}
	
	//Updates the query's GROUP BY clause to set the aggregation level
	public applyAggregation(aggregationFields : string[]) {
		this.groupByFields = aggregationFields;
	}
	
	//Generates the SQL string for the query
	public generateSQL() : string
	{
		//Apply the SELECT clause
		let sql = this.selectClause;
		
		//Apply each of the WHERE clauses
		if (this.whereClauses.length > 0) {
			sql += ' WHERE (' + this.whereClauses.join(') AND (') + ')';
		}
		
		//Apply any GROUP BY clause
		if (this.groupByFields.length > 0)
		{
			sql = sql.replace(/SELECT /i, 'SELECT ' + this.groupByFields.join(',') + ', ');
			sql += ' GROUP BY ' + this.groupByFields.join(', ');
			sql += ' ORDER BY ' + this.groupByFields.join(' ASC, ') + ' ASC';
		}
		
		return sql;
	}
	
	//Runs the query on the specified dataset from the supplied dataset manager, and exports the results in CSV format
	public exportAsCsv(datasetManager : DatasetManager, datasetIndex : number, csvFile : string) {
		return datasetManager.exportDatasetWithQuery(datasetIndex, csvFile, this.name, this.generateSQL(), this.parameters);
	}
}
