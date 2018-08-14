import { PreprocessingTool } from './PreprocessingTool';
import { AggregateDataDirectoryTool } from './tools/AggregateDataDirectoryTool';
import { MergeDataDirectoriesTool } from './tools/MergeDataDirectoriesTool';

export class PreprocessingToolManager
{
	private tools : PreprocessingTool[];
	
	public constructor()
	{
		this.tools = [
			
			new AggregateDataDirectoryTool(),
			new MergeDataDirectoriesTool()
			
		];
	}
	
	//Retrieves the list of available preprocessing tools
	public getPreprocessingTools() {
		return this.tools;
	}
}
