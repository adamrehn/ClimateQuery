import { DataRequest } from './DataRequest';

export class Dataset
{
	public name : string;
	public request : DataRequest;
	public timestamp : number;
	public database : string;
	public present : number;
}
