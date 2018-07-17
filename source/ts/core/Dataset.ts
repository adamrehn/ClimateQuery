import { DatasetGranularity } from './DatasetGranularities';
import { DataRequest } from './DataRequest';

export class Dataset
{
	public name : string = "";
	public request! : DataRequest;
	public timestamp : number = 0;
	public database : string = "";
	public present : number = 0;
	public granularity : DatasetGranularity = DatasetGranularity.Unknown;
}
