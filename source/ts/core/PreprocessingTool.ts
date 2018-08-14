import { ApplicationController } from './ApplicationController';

export abstract class PreprocessingTool
{
	//Our parameter values
	public parameters : Map<string,Object>;
	
	//Our parameter datatypes
	public parameterTypes : Map<string,string>;
	
	//The list of options for selection-based parameters such as dropdown lists
	public parameterOptions : Map<string,string[]>;
	
	//Our parameter mutation hooks
	protected parameterHooks : Map<string,()=>void>;
	
	constructor()
	{
		this.parameters = new Map<string,Object>();
		this.parameterTypes = new Map<string,string>();
		this.parameterOptions = new Map<string,string[]>();
		this.parameterHooks = new Map<string,()=>void>();
	}
	
	//Helper for derived class clone() implementations
	protected cloneParameters(cloned : PreprocessingTool)
	{
		cloned.parameters = new Map<string,Object>(this.parameters);
		cloned.parameterTypes = new Map<string,string>(this.parameterTypes);
		cloned.parameterOptions = new Map<string,string[]>(this.parameterOptions);
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
	public abstract async execute(controller : ApplicationController, progressCallback : (percentage : number)=>void) : Promise<void>;
}
