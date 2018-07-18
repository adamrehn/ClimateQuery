export class PreprocessingTool
{
	public name : string;
	public descriptionShort : string;
	public descriptionLong : string;
	public parameters : Map<string,Object>;
	public parameterTypes : Map<string,string>;
	
	public constructor(name : string, descriptionShort : string, descriptionLong : string, parameters : Map<string,Object>, parameterTypes : Map<string,string>)
	{
		this.name             = name;
		this.descriptionShort = descriptionShort;
		this.descriptionLong  = descriptionLong;
		this.parameters       = parameters;
		this.parameterTypes   = parameterTypes;
	}
	
	public clone()
	{
		//String deep-copy trick from: <https://stackoverflow.com/a/31733628>
		return new PreprocessingTool(
			(' ' + this.name).slice(1),
			(' ' + this.descriptionShort).slice(1),
			(' ' + this.descriptionLong).slice(1),
			new Map<string,Object>(this.parameters),
			new Map<string,string>(this.parameterTypes)
		);
	}
	
	//Sets the specified parameter to the supplied value
	public setParameter(parameter : string, value : Object) {
		this.parameters.set(parameter, value);
	}
}
