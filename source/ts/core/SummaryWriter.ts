import { DatatypeCode, DatatypeCodeHelper } from './DatatypeCodes';
import { Dataset } from './Dataset';

//Wrap fs.writeFile() in a Promise-based interface
import * as fs from 'fs';
require('util.promisify/shim')();
import { promisify } from 'util';
const writeFile = promisify(fs.writeFile);

export class SummaryWriter
{
	private static addHeading(lines : string[], heading : string)
	{
		lines.push(heading);
		lines.push('='.repeat(heading.length));
		lines.push('');
	}
	
	private static addSubHeading(lines : string[], subheading : string)
	{
		lines.push('');
		lines.push(subheading);
		lines.push('-'.repeat(subheading.length));
		lines.push('');
	}
	
	public static async writeSummary(outfile : string, dataset : Dataset, queryName : string, querySQL : string, params : Map<string,Object>)
	{
		try
		{
			//Generate the summary header
			let lines : string[] = []
			SummaryWriter.addHeading(lines, `Export of dataset "${dataset.name}"` + ((queryName.length > 0) ? ` with query "${queryName}"` : ''));
			
			//Generate the dataset summary
			SummaryWriter.addSubHeading(lines, 'Dataset details');
			lines.push(`Start Year: ${dataset.request.startYear}`);
			lines.push(`End Year:   ${dataset.request.endYear}`);
			lines.push('');
			lines.push('Measures:');
			lines = lines.concat(dataset.request.datatypeCodes.map((code : DatatypeCode) => {
				return '\t' + DatatypeCodeHelper.toString(code);
			}));
			lines.push('');
			lines.push('Stations:');
			lines.push(dataset.request.stations.join(', '));
			lines.push('');
			
			//Generate the query summary
			if (queryName.length > 0)
			{
				SummaryWriter.addSubHeading(lines, 'Query details');
				lines.push('Query string:');
				lines.push('');
				lines.push(querySQL);
				lines.push('');
				lines.push('Query parameters:');
				for (let param of params) {
					lines.push('\t' + param[0] + ': ' + JSON.stringify(param[1]));
				}
				lines.push('');
			}
			
			await writeFile(outfile, lines.join('\n'), {'encoding': 'utf-8'});
			return true;
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
