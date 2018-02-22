import { DatatypeCode, DatatypeCodeHelper } from './DatatypeCodes';

export const enum BuildPhase
{
	Started,
	Processing,
	Merging,
	Completed
}

export class BuildProgress
{
	public phase : BuildPhase;
	public processed : number;
	public total : number;
	
	public constructor(phase : BuildPhase, processed : number, total : number)
	{
		this.phase = phase;
		this.processed = processed;
		this.total = total;
	}
	
	public calculatePercentComplete() : number
	{
		switch(this.phase)
		{
			case BuildPhase.Started:
				return 0.0;
				
			case BuildPhase.Processing:
				return ((this.processed / this.total) * 90.0);
				
			case BuildPhase.Merging:
				return 90.0;
				
			case BuildPhase.Completed:
				return 100.0;
		}
	}
	
	public toString() : string
	{
		switch(this.phase)
		{
			case BuildPhase.Started:
				return 'Dataset build started';
				
			case BuildPhase.Processing:
				return 'Processed CSV data file ' + this.processed + ' of ' + this.total;
				
			case BuildPhase.Merging:
				return 'Merging extracted datasets into a single table';
				
			case BuildPhase.Completed:
				return 'Dataset build completed';
		}
	}
}
