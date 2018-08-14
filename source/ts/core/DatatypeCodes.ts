export const enum DatatypeCode
{
	MinMaxMeanTemperature  = 122123,
	Rainfall               = 136,
	SolarExposure          = 193,
	WindDewHumidityAirTemp = 2,
	Unknown                = -1
}

export class DatatypeCodeHelper
{
	private static stringMappings() : [DatatypeCode, string][]
	{
		return [
			[DatatypeCode.MinMaxMeanTemperature,  'Min/Max/Mean Temperature'],
			[DatatypeCode.Rainfall,               'Rainfall'],
			[DatatypeCode.SolarExposure,          'Solar Exposure'],
			[DatatypeCode.WindDewHumidityAirTemp, 'Wind / Dew Point / Humidity / Air Temperature'],
		];
	}
	
	public static enumValues() : DatatypeCode[]
	{
		return [
			DatatypeCode.MinMaxMeanTemperature,
			DatatypeCode.Rainfall,
			DatatypeCode.SolarExposure,
			DatatypeCode.WindDewHumidityAirTemp
		];
	}
	
	public static toString(code : DatatypeCode) : string
	{
		//Build a map from datatype code enum value to string representation and retrieve the correct value
		let mappings = new Map<DatatypeCode, string>(DatatypeCodeHelper.stringMappings());
		return <string>(mappings.get(code));
	}
	
	public static fromString(code : string) : DatatypeCode
	{
		//Build a map from string representation to granularity enum value
		let reversed = DatatypeCodeHelper.stringMappings().map((entry : [DatatypeCode, string]) : [string, DatatypeCode] => { return [entry[1], entry[0]]; });
		let mappings = new Map<string, DatatypeCode>(reversed);
		
		//Attempt to retrieve the correct value
		let result = mappings.get(code);
		if (result !== undefined) {
			return result;
		}
		
		//Invalid string representation
		return DatatypeCode.Unknown;
	}
}
