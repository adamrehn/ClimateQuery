export const enum DatasetGranularity
{
	Year = 0,
	Month = 1,
	Day = 2,
	Hour = 3,
	Minute = 4,
	Second = 5,
	Unknown = -1
}

export class DatasetGranularityHelper
{
	private static stringMappings() : [DatasetGranularity, string][]
	{
		return [
			[DatasetGranularity.Year,    'Yearly'],
			[DatasetGranularity.Month,   'Monthly'],
			[DatasetGranularity.Day,     'Daily'],
			[DatasetGranularity.Hour,    'Hourly'],
			[DatasetGranularity.Minute,  'Per Minute'],
			[DatasetGranularity.Second,  'Per Second'],
			[DatasetGranularity.Unknown, 'Unknown']
		];
	}
	
	public static toString(granularity : DatasetGranularity) : string
	{
		//Build a map from granularity enum value to string representation and retrieve the correct value
		let mappings = new Map<DatasetGranularity, string>(DatasetGranularityHelper.stringMappings());
		return <string>(mappings.get(granularity));
	}
	
	public static fromString(granularity : string) : DatasetGranularity
	{
		//Build a map from string representation to granularity enum value
		let reversed = DatasetGranularityHelper.stringMappings().map((entry : [DatasetGranularity, string]) : [string, DatasetGranularity] => { return [entry[1], entry[0]]; });
		let mappings = new Map<string, DatasetGranularity>(reversed);
		
		//Attempt to retrieve the correct value
		let result = mappings.get(granularity);
		if (result !== undefined) {
			return result;
		}
		
		//Invalid string representation
		return DatasetGranularity.Unknown;
	}
	
	public static detectGranularity(columns : string[]) : DatasetGranularity
	{
		if (columns.indexOf('Second') != -1) {
			return DatasetGranularity.Second;
		}
		else if (columns.indexOf('Minute') != -1) {
			return DatasetGranularity.Minute;
		}
		else if (columns.indexOf('Hour') != -1) {
			return DatasetGranularity.Hour;
		}
		else if (columns.indexOf('Day') != -1) {
			return DatasetGranularity.Day;
		}
		else if (columns.indexOf('Month') != -1) {
			return DatasetGranularity.Month;
		}
		else if (columns.indexOf('Year') != -1) {
			return DatasetGranularity.Year;
		}
		
		return DatasetGranularity.Unknown;
	}
}
