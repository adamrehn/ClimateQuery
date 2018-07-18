import { PreprocessingTool } from './PreprocessingTool';

export class PreprocessingToolManager
{
	private tools : PreprocessingTool[];
	
	public constructor()
	{
		this.tools = [];
	}
	
	//Retrieves the list of available preprocessing tools
	public getPreprocessingTools() {
		return this.tools;
	}
}
