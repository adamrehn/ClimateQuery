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
				[],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ]
			),
			
			new Query(
				'Total rainfall',
				'SELECT SUM(Rainfall) as TotalRainfall FROM dataset',
				[],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ]
			),
			
			new Query(
				'Number of days with no rainfall',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[ 'Rainfall = 0.0' ],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.Rainfall ]
			),
			
			new Query(
				'Number of days with rainfall above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[ 'Rainfall > $threshold' ],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.Rainfall ]
			),
			
			
			//Temperature queries
			
			new Query(
				'Average maximum daily temperature',
				'SELECT AVG(MaxTemp) as AverageMaxTemp FROM dataset',
				[],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.MinMaxMeanTemperature ]
			),
			
			new Query(
				'Average minimum daily temperature',
				'SELECT AVG(MinTemp) as AverageMinTemp FROM dataset',
				[],
				new Map<string,Object>(),
				new Map<string,string>(),
				[ DatatypeCode.MinMaxMeanTemperature ]
			),
			
			new Query(
				'Number of days with maximum temperature above threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[ 'MaxTemp > $threshold' ],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.MinMaxMeanTemperature ]
			),
			
			new Query(
				'Number of days with minimum temperature below threshold',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[ 'MinTemp < $threshold' ],
				new Map<string,Object>([[ '$threshold', 0.0 ]]),
				new Map<string,string>([[ '$threshold', 'number' ]]),
				[ DatatypeCode.MinMaxMeanTemperature ]
			),
			
			new Query(
				'Number of days with temperature within range',
				'SELECT COUNT(*) as NumDays FROM dataset',
				[
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
				[ DatatypeCode.MinMaxMeanTemperature ]
			)
			
		];
	}
	
	//Retrieves the list of queries that are supported for the specified dataset
	public getSupportedQueries(datasetDetails : Dataset) : Query[]
	{
		//Filter queries to keep only those whose requirements are satisfied by request.datatypeCodes
		let datasetFields = new Set<DatatypeCode>(datasetDetails.request.datatypeCodes);
		return this.queries.filter((query : Query) =>
		{
			let intersection = query.requiredFields.filter((field : DatatypeCode) => { return datasetFields.has(field); });
			return (intersection.length == query.requiredFields.length);
		});
	}
}
