import { DatasetGranularity, DatasetGranularityHelper } from '../DatasetGranularities';
import { DatatypeCode, DatatypeCodeHelper } from '../DatatypeCodes';
import { ApplicationController } from '../ApplicationController';
import { PreprocessingTool } from '../PreprocessingTool';
import { BuildProgress } from '../BuildProgress';
import { CsvDataUtil } from '../CsvDataUtil';
import { DatabaseUtil } from '../DatabaseUtil';
import { DataRequest } from '../DataRequest';
import { DatasetBuilder } from '../DatasetBuilder';
import { Query } from '../Query';
import * as Immutable from 'immutable';
import * as path from 'path';
import * as fs from 'fs';

//Wrap fs.readFile(), fs.writeFile() and fs.copyFile() in a Promise-based interface
require('util.promisify/shim')();
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const copyFile = promisify(fs.copyFile);

export class AggregateDataDirectoryTool extends PreprocessingTool
{
	//The threshold (in percentage of 'Y' values) for considering an aggregated row to have a 'Y' quality value
	private static QualityThreshold = 75.0;
	
	//The number of rows we write to each output data file
	private static RowsPerFile = 2000;
	
	constructor()
	{
		super();
		
		this.parameters = new Map<string,Object>([
			[ 'Input Directory',  '' ],
			[ 'Output Directory',  '' ],
			[ 'Datatype', '' ],
			[ 'Aggregated Granularity', '' ],
		]);
		
		this.parameterTypes = new Map<string,string>([
			[ 'Input Directory',  'directory' ],
			[ 'Output Directory',  'directory' ],
			[ 'Datatype', 'select' ],
			[ 'Aggregated Granularity', 'select' ],
		]);
		
		//Extract the list of valid datatypes, converting them to their string representations
		let datatypes = DatatypeCodeHelper.enumValues().map(DatatypeCodeHelper.toString);
		
		//Extract the list of valid granularities, converting them to their string representations
		let granularities = DatasetGranularityHelper.validGranularities().map(DatasetGranularityHelper.toString);
		
		this.parameterOptions = new Map<string,string[]>([
			[ 'Datatype', datatypes ],
			[ 'Aggregated Granularity', granularities ]
		]);
	}
	
	public clone() : PreprocessingTool
	{
		let cloned = new AggregateDataDirectoryTool();
		this.cloneParameters(cloned);
		return cloned;
	}
	
	public name() : string {
		return 'Aggregate Data Directory';
	}
	
	public descriptionShort() : string {
		return 'Aggregates fine-grained data into a coarser time granularity.';
	}
	
	public descriptionLong() : string {
		return 'This tool takes the data from one input directory and aggregates it using standard aggregation metrics (min, max, mean) to produce data with a coarser time granularity.';
	}
	
	private getInputDir() {
		return (<string>this.parameters.get('Input Directory'));
	}
	
	private getOutputDir() {
		return (<string>this.parameters.get('Output Directory'));
	}
	
	private getDatatype() {
		return (DatatypeCodeHelper.fromString(<string>this.parameters.get('Datatype')));
	}
	
	private getTargetGranularity() {
		return (DatasetGranularityHelper.fromString(<string>this.parameters.get('Aggregated Granularity')));
	}
	
	public validate() : boolean
	{
		//Verify that values have been provided for all of our parameters
		for (let pair of this.parameters)
		{
			if (pair[1] === undefined || (<string>pair[1]).length == 0) {
				return false;
			}
		}
		
		//Verify that all of our input directory and output directory are different
		if (this.getInputDir() == this.getOutputDir()) {
			return false;
		}
		
		return true;
	}
	
	public async execute(controller : ApplicationController, progressCallback : (percentage : number)=>void) : Promise<void>
	{
		try
		{
			//Retrieve our parameter values
			let datatype = this.getDatatype();
			let targetGranularity = this.getTargetGranularity();
			let outputDir = this.getOutputDir();
			let inputDir = this.getInputDir();
			
			//Create a data request representing the data from the input directory
			let request = new DataRequest(
				DataRequest.AllStations,
				[datatype],
				new Map<DatatypeCode,string>([[datatype, inputDir]]),
				DataRequest.AllYears,
				DataRequest.AllYears
			);
			
			//Detect the granularity of the input data and verify that the target granularity is coarser
			let inputGranularity = await DatasetBuilder.detectSingleGranularity(request);
			if (DatasetGranularityHelper.isCoarser(targetGranularity, inputGranularity) === false) {
				throw new Error('the target granularity must be coarser than the granularity of the input data.');
			}
			
			//Attempt to create a temporary dataset using the input data
			let db = await controller.createTemporaryDataset(request, (progress : BuildProgress) =>
			{
				//The dataset build represents 80% of our overall progress
				let buildProgress = progress.calculatePercentComplete();
				progressCallback((buildProgress < 1.0) ? 0.0 : buildProgress * 0.8);
			});
			
			//Retrieve the list of fields in the dataset
			let allFields = <string[]>(await DatabaseUtil.listFields(db, 'dataset'));
			
			//Retrieve the common fields for both the input and target granularities
			let inputGranularityFields = DatasetBuilder.commonFields(inputGranularity);
			let targetGranularityFields = DatasetBuilder.commonFields(targetGranularity);
			
			//Extract the list of quality-related fields, which require special handling
			let qualityFields = allFields.filter((field : string) => {
				return field.startsWith('Quality');
			});
			
			//Determine which fields are non-numeric and therefore cannot be meaningfully aggregated
			let fieldTypes = await DatabaseUtil.getFieldTypes(db, 'dataset');
			let ignoredFields = allFields.filter((field : string) => {
				return fieldTypes.get(field) != 'NUMERIC';
			});
			
			//Determine which fields are the actual data fields that need to be aggregated
			let aggregatedFields = Immutable.Set(allFields).subtract(
				inputGranularityFields,
				targetGranularityFields,
				qualityFields,
				ignoredFields
			).toArray();
			
			//Prepare the SELECT clause components to aggregate the data fields
			let expandedAggregates = aggregatedFields.map((field : string) => {
				return [`MIN(${field}) AS Min${field}, MAX(${field}) AS Max${field}, AVG(${field}) AS Average${field}, TOTAL(${field}) AS Total${field}`];
			});
			
			//Prepare the SELECT clause components to aggregate the quality-related fields fields
			let expandedQualities = qualityFields.map((field : string) => {
				return [`GROUP_CONCAT(${field}) AS Values${field}, COUNT(*) AS Count${field}`];
			});
			
			//Prepare the aggregation query (note that the fields we are grouping by will be prepended automatically by the Query class)
			let selectClause = `SELECT ${expandedAggregates.join(',')}, ${expandedQualities.join(',')} FROM dataset`;
			let query = new Query('', selectClause, [], new Map<string,object>(), new Map<string,string>(), [], inputGranularity);
			query.applyAggregation(targetGranularityFields);
			
			//Execute the query, storing the aggregated result data in an intermediate table
			await DatabaseUtil.run(db, `CREATE TABLE aggregated AS ${query.generateSQL()};`);
			
			//The aggregation query is treated as 10% of our overall progress
			progressCallback(90.0);
			
			//Determine how many rows are in the aggregated table
			let totalRows = <number>((await DatabaseUtil.get(db, 'SELECT COUNT(*) AS count FROM aggregated;'))['count']);
			
			//Retrieve the column names from the aggregated table
			let allColumns = Object.keys(await DatabaseUtil.get(db, 'SELECT * FROM aggregated LIMIT 1;'));
			
			//Post-process the aggregated data in batches and write it to the output directory
			let batchNum = 0;
			for (let startRow = 0; startRow < totalRows; startRow += AggregateDataDirectoryTool.RowsPerFile)
			{
				//Retrieve the rows for the current file
				let batch = (await DatabaseUtil.all(db, `SELECT * FROM aggregated LIMIT ${AggregateDataDirectoryTool.RowsPerFile} OFFSET ${startRow};`)).map((row : any) =>
				{
					//Replace any NULL values with zeroes
					let processed = row;
					for (let field of Object.keys(row))
					{
						if (row[field] === undefined || row[field] === null || row[field] == '') {
							processed[field] = 0.0;
						}
					}
					
					//Convert the concatenated quality value list for each data field into a into single quality value
					for (let field of qualityFields)
					{
						//Determine how many 'Y' quality values are present
						let valueList : string = row[`Values${field}`].toString();
						let numPresent = valueList.split(',').filter((q : string) => { return (q == 'Y'); }).length;
						let total = <number>(row[`Count${field}`]);
						let percentage = numPresent / total;
						
						//If the number of validated values is above our threshold, report 'Y' as our overall quality value
						processed[field] = ((percentage > AggregateDataDirectoryTool.QualityThreshold) ? 'Y' : 'N');
						
						//Remove the intermediate fields
						delete processed[`Values${field}`];
						delete processed[`Count${field}`];
					}
					
					return processed;
				});
				
				//Write the file to the output directory
				await CsvDataUtil.writeBOMCsv(path.join(outputDir, `Aggregated_Data_${batchNum}.txt`), DatabaseUtil.reshapeForCsv(batch));
				batchNum++;
			}
			
			//Release the temporary dataset
			await DatabaseUtil.close(db);
			
			//Copy the station list file from the input directory to the output directory
			let stationList = await DatasetBuilder.getCodeStationList(inputDir);
			await copyFile(stationList, path.join(outputDir, path.basename(stationList)));
			
			//Read the contents of the notes file from the input directory
			let notesFile = await DatasetBuilder.getCodeNotes(inputDir);
			let notesData = (await readFile(notesFile, {encoding: 'utf-8'})).replace(/\r\n/g, '\n');
			
			//Isolate the section of the notes that lists the datafile column names
			//(Note that we use "[^]" to match all characters including newlines, since JS does not have a dotall flag)
			let dataDetailsRegex = new RegExp('\nDATA FILE DETAILS\n_+?\n[^]+?\n_', 'mi');
			let dataDetailsMatch = dataDetailsRegex.exec(notesData);
			if (dataDetailsMatch !== null)
			{
				//Create a new column list for the aggregated columns
				let newColumns = allColumns.map((column : string) => {
					return `0, 0, ${column}`;
				})
				.join('\n');
				
				//Remove the existing column list and replace it with our new column list
				let isolatedSection = dataDetailsMatch[0];
				let columnRegex = new RegExp('[0-9\\- ]+,[0-9 ]+,[^\n]+\n', 'g');
				let replaced = isolatedSection.replace(columnRegex, '\n').replace(/-\n{3,}/, '-\n\n' + newColumns + '\n\n\n');
				notesData = notesData.replace(isolatedSection, replaced);
			}
			
			//Write the modified notes data to the output directory
			await writeFile(path.join(outputDir, path.basename(notesFile)), notesData, {encoding: 'utf-8'});
			
			//If we have reached this point then our processing has completed successfully
			progressCallback(100.0);
		}
		catch (err)
		{
			//Propagate any errors
			throw err;
		}
	}
}
