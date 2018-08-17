import { DatasetGranularity } from './DatasetGranularities';
import { DatatypeCode } from './DatatypeCodes';
import { Dataset } from './Dataset';
import { Query } from './Query';

export class QueryManager
{
	private queries : Query[];
	
	public constructor()
	{
		this.queries = [
			
			//Rainfall queries
			
			new Query(
				'Average daily rainfall',
				'SELECT AVG(Rainfall) as AverageRainfall FROM dataset',
				[ 'Rainfall != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Total rainfall',
				'SELECT SUM(Rainfall) as TotalRainfall FROM dataset',
				[ 'Rainfall != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with no rainfall',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'Rainfall != ""',
					'Rainfall = 0.0'
				],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with rainfall above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'Rainfall != ""',
					'Rainfall > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.Rainfall ],
				DatasetGranularity.Day
			),
			
			
			//Temperature queries
			
			new Query(
				'Average maximum daily temperature',
				'SELECT AVG(MaxTemp) as AverageMaxTemp FROM dataset',
				[ 'MaxTemp != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.MinMaxMeanTemperature ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Average minimum daily temperature',
				'SELECT AVG(MinTemp) as AverageMinTemp FROM dataset',
				[ 'MinTemp != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.MinMaxMeanTemperature ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with maximum temperature above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MaxTemp != ""',
					'MaxTemp > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.MinMaxMeanTemperature ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with minimum temperature below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinTemp != ""',
					'MinTemp < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.MinMaxMeanTemperature ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with temperature within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinTemp != ""',
					'MaxTemp != ""',
					'MinTemp > $lowerBound',
					'MaxTemp < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.MinMaxMeanTemperature ],
				DatasetGranularity.Day
			),
			
			
			//Solar Exposure queries
			
			new Query(
				'Average daily solar exposure',
				'SELECT AVG(SolarExposure) as AverageSolarExposure FROM dataset',
				[ 'SolarExposure != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.SolarExposure ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with solar exposure above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'SolarExposure != ""',
					'SolarExposure > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.SolarExposure ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with solar exposure below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'SolarExposure != ""',
					'SolarExposure < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.SolarExposure ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with solar exposure within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'SolarExposure != ""',
					'SolarExposure > $lowerBound',
					'SolarExposure < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.SolarExposure ],
				DatasetGranularity.Day
			),
			
			
			//Humidity queries
			
			new Query(
				'Average maximum daily humidity',
				'SELECT AVG(MaxHumidity) as AverageMaxHumidity FROM dataset',
				[ 'MaxHumidity != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Average minimum daily humidity',
				'SELECT AVG(MinHumidity) as AverageMinHumidity FROM dataset',
				[ 'MinHumidity != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with maximum humidity above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MaxHumidity != ""',
					'MaxHumidity > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with minimum humidity below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinHumidity != ""',
					'MinHumidity < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with humidity within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinHumidity != ""',
					'MaxHumidity != ""',
					'MinHumidity > $lowerBound',
					'MaxHumidity < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with average humidity above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'AverageHumidity != ""',
					'AverageHumidity > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with average humidity below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'AverageHumidity != ""',
					'AverageHumidity < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with average humidity within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'AverageHumidity != ""',
					'AverageHumidity > $lowerBound',
					'AverageHumidity < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			
			//Dew point queries
			
			new Query(
				'Average maximum daily dew point',
				'SELECT AVG(MaxDewPoint) as AverageMaxDewPoint FROM dataset',
				[ 'MaxDewPoint != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Average minimum daily dew point',
				'SELECT AVG(MinDewPoint) as AverageMinDewPoint FROM dataset',
				[ 'MinDewPoint != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with maximum dew point above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MaxDewPoint != ""',
					'MaxDewPoint > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with minimum dew point below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinDewPoint != ""',
					'MinDewPoint < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with dew point within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinDewPoint != ""',
					'MaxDewPoint != ""',
					'MinDewPoint > $lowerBound',
					'MaxDewPoint < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			
			//Wind speed queries
			
			new Query(
				'Average maximum daily wind speed',
				'SELECT AVG(MaxWindSpeed) as AverageMaxWindSpeed FROM dataset',
				[ 'MaxWindSpeed != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Average minimum daily wind speed',
				'SELECT AVG(MinWindSpeed) as AverageMinWindSpeed FROM dataset',
				[ 'MinWindSpeed != ""' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with maximum wind speed above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MaxWindSpeed != ""',
					'MaxWindSpeed > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with minimum wind speed below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinWindSpeed != ""',
					'MinWindSpeed < $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with wind speed within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MinWindSpeed != ""',
					'MaxWindSpeed != ""',
					'MinWindSpeed > $lowerBound',
					'MaxWindSpeed < $upperBound'
				],
				new Map<string,Object>([
					['$lowerBound', 0.0],
					['$upperBound', 0.0]
				]),
				new Map<string,string>([
					['$lowerBound', 'number'],
					['$upperBound', 'number']
				]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			),
			
			new Query(
				'Number of days with maximum wind gust above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
					'MaxWindGust != ""',
					'MaxWindGust > $threshold'
				],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.WindDewHumidityAirTemp ],
				DatasetGranularity.Day
			)
			
		];
	}
	
	//Retrieves the list of queries that are supported for the specified dataset
	public getSupportedQueries(datasetDetails : Dataset) : Query[]
	{
		//Filter queries to keep only those whose requirements are satisfied by the dataset's datatypes and granularity
		let datasetFields = new Set<DatatypeCode>(datasetDetails.request.datatypeCodes);
		return this.queries.filter((query : Query) =>
		{
			let intersection = query.requiredFields.filter((field : DatatypeCode) => { return datasetFields.has(field); });
			return (intersection.length == query.requiredFields.length && query.requiredGranularity == datasetDetails.granularity);
		});
	}
}
