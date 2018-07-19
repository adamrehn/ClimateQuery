export abstract class PreprocessingTool
{
	public parameters : Map<string,Object>;
	public parameterTypes : Map<string,string>;
	protected parameterHooks : Map<string,()=>void>;
	
	constructor()
	{
		this.parameters = new Map<string,Object>();
		this.parameterTypes = new Map<string,string>();
		this.parameterHooks = new Map<string,()=>void>();
	}
	
	//Clones this object
	public abstract clone() : PreprocessingTool;
	
	//Returns the name of this preprocessing tool
	public abstract name() : string;
	
	//Returns the short description for this preprocessing tool
	public abstract descriptionShort() : string;
	
	//Returns the full description for this preprocessing tool
	public abstract descriptionLong() : string;
	
	//Sets the specified parameter to the supplied value
	public setParameter(parameter : string, value : Object) {
		this.parameters.set(parameter, value);
	}
	
	//Validates the values of our input parameters
	public abstract validate() : boolean;
	
	//Provides the list of custom actions for modifying parameters
	public parameterActions() {
		return this.parameterHooks;
	}
	
	//Runs the tool using the previously set parameter values
	public abstract async execute(progressCallback : (percentage : number)=>void) : Promise<void>;
}
