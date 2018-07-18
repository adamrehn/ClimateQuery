import { PreprocessingTool } from '../PreprocessingTool';
import { CsvDataUtil } from '../CsvDataUtil';
import { DatasetBuilder } from '../DatasetBuilder';
import * as path from 'path';
import * as fs from 'fs';

//Wrap fs.copyFile() and fs.writeFile() in a Promise-based interface
require('util.promisify/shim')();
import { promisify } from 'util';
const copyFile = promisify(fs.copyFile);
const writeFile = promisify(fs.writeFile);

export class MergeDataDirectoriesTool extends PreprocessingTool
{
	private numInputs : number = 1;
	
	constructor()
	{
		super();
		this.resetInputs();
		
		this.parameterHooks = new Map<string,()=>void>([
			['Add Input Directory',    ()=>{ this.addInput();    }],
			['Remove Input Directory', ()=>{ this.removeInput(); }],
			['Reset All',              ()=>{ this.resetInputs(); }]
		]);
	}
	
	public clone() : PreprocessingTool
	{
		let cloned = new MergeDataDirectoriesTool();
		cloned.parameters = new Map<string,Object>(this.parameters);
		cloned.parameterTypes = new Map<string,string>(this.parameterTypes);
		return cloned;
	}
	
	public name() : string {
		return 'Merge Data Directories';
	}
	
	public descriptionShort() : string {
		return 'Merges multiple directories for a single datatype, or fixes missing station list headers.';
	}
	
	public descriptionLong() : string {
		return 'This tool merges the data from one or more input directories into a single output directory, copying all data files and merging the station list files. The data in all of the input directories must contain the same datatype and be of the same granularity for the output to be usable. The typical use case for this tool is when data is separated into multiple directories for different subsets (e.g. geographical areas such as states) and needs to be merged into a single directory for use as input to a ClimateQuery dataset.\n\nWhen run on only one input directory, this tool can remedy the situation where the station list file for the directory is missing the header row, since a new header row will be constructed based on the contents of the notes file for the directory.';
	}
	
	private addInput()
	{
		this.numInputs += 1;
		this.parameters.set(`Input Directory ${this.numInputs}`, '');
		this.parameterTypes.set(`Input Directory ${this.numInputs}`, 'directory');
	}
	
	private removeInput()
	{
		if (this.numInputs > 1)
		{
			this.parameters.delete(`Input Directory ${this.numInputs}`);
			this.parameterTypes.delete(`Input Directory ${this.numInputs}`);
			this.numInputs -= 1;
		}
	}
	
	private resetInputs()
	{
		this.numInputs = 1;
		
		this.parameters = new Map<string,Object>([
			[ 'Output Directory',  '' ],
			[ 'Input Directory 1', '' ],
		]);
		
		this.parameterTypes = new Map<string,string>([
			[ 'Output Directory',  'directory' ],
			[ 'Input Directory 1', 'directory' ],
		]);
	}
	
	private getOutputDir() {
		return (<string>this.parameters.get('Output Directory'));
	}
	
	private getInputDirs()
	{
		let inputDirs : string[] = [];
		for (let i = 1; i <= this.numInputs; ++i) {
			inputDirs.push(<string>this.parameters.get(`Input Directory ${i}`));
		}
		
		return inputDirs;
	}
	
	public validate() : boolean
	{
		//Verify that values have been provided for all of our input directories and output directory
		for (let pair of this.parameters)
		{
			if (pair[1] === undefined || (<string>pair[1]).length == 0) {
				return false;
			}
		}
		
		//Verify that all of our directory paths are unique
		let uniqueDirs = new Set<string>(<IterableIterator<string>>this.parameters.values());
		if (uniqueDirs.size != this.parameters.size) {
			return false;
		}
		
		return true;
	}
	
	public async execute() : Promise<void>
	{
		try
		{
			//Retrieve our output directory and input directories
			let outputDir = this.getOutputDir();
			let inputDirs = this.getInputDirs();
			
			//Find the station list files for each of our input directories
			let stationLists : string[] = [];
			for (let dir of inputDirs) {
				stationLists.push(await DatasetBuilder.getCodeStationList(dir));
			}
			
			//Find the notes file for our first input directory
			let notesFile = await DatasetBuilder.getCodeNotes(inputDirs[0]);
			
			//Generate the merged stations list
			let mergedStations = await CsvDataUtil.concatenateStationLists(stationLists, notesFile);
			
			//Attempt to write the stations list CSV file to the output directory
			let stationsCsv = path.join(outputDir, 'MERGED_StnDet_0000000.txt');
			await writeFile(stationsCsv, mergedStations);
			
			//Attempt to copy the notes file to the output directory
			await copyFile(notesFile, path.join(outputDir, 'MERGED_Notes_0000000.txt'));
			
			//Attempt to copy each of the data CSV files from our input directories to the output directory
			for (let dir of inputDirs)
			{
				let dataFiles = await DatasetBuilder.getCodeDataFiles(dir);
				for (let file of dataFiles) {
					await copyFile(file, path.join(outputDir, path.basename(dir) + '_' + path.basename(file)));
				}
			}
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
