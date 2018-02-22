import { BuildProgress } from './BuildProgress'
import { DataRequest } from './DataRequest'
import { DatasetManager } from './DatasetManager'
import { Dataset } from './Dataset'
import { DatatypeCode, DatatypeCodeHelper } from './DatatypeCodes'
import { QueryManager } from './QueryManager'
import { Query } from './Query'
import { RequestValidator } from './RequestValidator'

export class ApplicationController
{
	private datasetManager : DatasetManager;
	private queryManager : QueryManager;
	
	//Wraps instance creation in a Promise interface
	public static async createController()
	{
		try
		{
			let manager = await DatasetManager.createManager();
			let controller = new ApplicationController();
			controller.datasetManager = manager;
			return controller;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
	
	private constructor() {
		this.queryManager = new QueryManager();
	}
	
	//Returns the dataset manager instance
	public getDatasetManager() {
		return this.datasetManager;
	}
	
	//Lists the current datasets
	public listDatasets()
	{
		return new Promise<Dataset[]>((resolve : Function, reject : Function) => {
			resolve(this.datasetManager.listDatasets());
		});
	}
	
	//Exports an existing dataset to a CSV file
	public exportDataset(index : number, csvFile : string) {
		return this.datasetManager.exportDataset(index, csvFile);
	}
	
	//Deletes an existing dataset
	public deleteDataset(index : number) {
		return this.datasetManager.deleteDataset(index);
	}
	
	//Creates a new dataset
	public createDataset(name : string, request : DataRequest, progressCallback : (...args: any[]) => void) {
		return this.datasetManager.createDataset(name, request, progressCallback);
	}
	
	//Validates a data request
	public validateRequest(request : DataRequest) {
		return RequestValidator.validateRequest(request);
	}
	
	//Lists the queries that are supported for the specified dataset
	public listSupportedQueries(dataset : Dataset)
	{
		return new Promise<Query[]>((resolve : Function, reject : Function) => {
			resolve(this.queryManager.getSupportedQueries(dataset));
		});
	}
	
	//Runs the supplied query on the specified dataset and exports the results to a CSV file
	public exportQueryResult(entryIndex : number, query : Query, csvFile : string) {
		return query.exportAsCsv(this.datasetManager, entryIndex, csvFile);
	}
}
