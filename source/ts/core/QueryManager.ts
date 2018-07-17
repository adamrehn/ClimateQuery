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
