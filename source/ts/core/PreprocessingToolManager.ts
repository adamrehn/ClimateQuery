import { PreprocessingTool } from './PreprocessingTool';
import { MergeDataDirectoriesTool } from './tools/MergeDataDirectoriesTool';

export class PreprocessingToolManager
{
	private tools : PreprocessingTool[];
	
	public constructor()
	{
		this.tools = [
			
			new MergeDataDirectoriesTool()
			
		];
	}
	
	//Retrieves the list of available preprocessing tools
	public getPreprocessingTools() {
		return this.tools;
	}
}
