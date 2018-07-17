export const enum DatatypeCode
{
	MinMaxMeanTemperature  = 122123,
	Rainfall               = 136,
	SolarExposure          = 193,
	WindDewHumidityAirTemp = 2
}

export class DatatypeCodeHelper
{
	public static enumValues() : number[]
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
		switch (code)
		{
			case DatatypeCode.MinMaxMeanTemperature:
				return 'Min/Max/Mean Temperature';
			
			case DatatypeCode.Rainfall:
				return 'Rainfall';
			
			case DatatypeCode.SolarExposure:
				return 'Solar Exposure';
			
			case DatatypeCode.WindDewHumidityAirTemp:
				return 'Wind / Dew Point / Humidity / Air Temperature';
		}
	}
}
