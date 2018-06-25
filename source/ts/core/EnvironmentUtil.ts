import * as mkdirp from 'mkdirp';
import * as glob from 'glob';

export class EnvironmentUtil
{
	//Determines the location of the data directory where we store application config files
	public static getDataDirectory() : string
	{
		var dataDir = (
			(process.platform == 'win32') ?
			process.env['APPDATA'] :
			process.env['HOME'] + '/.config'
		) + '/ClimateQuery';
		
		mkdirp.sync(dataDir);
		return dataDir;
	}
	
	//Wraps glob() in a Promise interface, and normalises path separators under Windows
	public static glob(pattern : string) : Promise<string[]>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			glob(pattern.replace(/\\/g, '/'), (err : Error | null, matches : string[]) =>
			{
				if (err) {
					reject(err);
				}
				else {
					resolve(matches);
				}
			});
		});
	}
}
