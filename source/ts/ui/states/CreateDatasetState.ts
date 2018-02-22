import { DatatypeCode, DatatypeCodeHelper } from '../../core/DatatypeCodes';
import { UISectionProgressManager } from '../UISectionProgressManager'
import { CsvDataUtil } from '../../core/CsvDataUtil';
import { DataRequest } from '../../core/DataRequest';
import { ValidationReport } from '../../core/RequestValidator'
import { UIState } from '../UIState'
import { BuildingDatasetState } from './BuildingDatasetState'
import { DatasetListState } from './DatasetListState'
import { InvalidRequestState } from './InvalidRequestState'
import * as path from 'path';
import * as $ from 'jquery';

export class CreateDatasetState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'create-dataset';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Create New Dataset';
	}
	
	private stations : number[];
	private formFields : Map<string, JQuery<HTMLElement>>;
	private chooseDirButtons : JQuery<HTMLElement>;
	private chooseCsvButton : JQuery<HTMLElement>;
	private createButton : JQuery<HTMLElement>;
	private cancelButton : JQuery<HTMLElement>;
	private sectionManager : UISectionProgressManager;
	private currentSection : string;
	
	public onHide() : void
	{
		//When the state is hidden, destroy and re-create the form fields
		super.onHide();
		this.root.remove();
		this.formFields.clear();
		this.populateRoot();
	}
	
	//Resets the user's CSV file selection for the list of stations
	private resetCsvSelection()
	{
		(<JQuery<HTMLElement>>this.formFields.get('stations-csv')).val('');
		$('.selected-basename', this.root).text('No file selected.');
		this.stations = [];
		this.validateForm();
	}
	
	//Retrieves the selected source directories for each of the selected datatypes
	private getSelectedSourceDirs()
	{
		let sourceDirs = new Map<DatatypeCode, string>();
		DatatypeCodeHelper.enumValues().forEach((code : DatatypeCode, index : number) =>
		{
			let dir = $('#source-directories p[data-datatype="' + code + '"] input').val();
			if (dir !== undefined && (<string>(dir)).length > 0) {
				sourceDirs.set(code, <string>(dir));
			}
		});
		
		return sourceDirs;
	}
	
	//Determines if we have a source directory specified for each selected datatype
	private haveSourceDirsForSelectedDatatypes()
	{
		let dirs = this.getSelectedSourceDirs();
		let selected = this.getSelectedDatatypes();
		let overlap = selected.filter((dtype : DatatypeCode) => { return (dirs.has(dtype) === true); });
		return overlap.length == selected.length;
	}
	
	//Updates the visibility of the "source directory" form fields based on which datatypes are selected
	private updateSourceDirVisibility()
	{
		let datatypes = this.getSelectedDatatypes();
		$('#source-directories p[data-datatype]').each((index : number, elem : HTMLElement) =>
		{
			//Determine if the datatype that the field represents is selected
			let elemType = (<number>($(elem).data('datatype')));
			let selected = (datatypes.indexOf(elemType) != -1);
			
			//Show or hide the field based on whether its datatype is selected
			if (selected === true) {
				$(elem).show();
			}
			else {
				$(elem).hide();
			}
		});
	}
	
	//Returns the error we throw when parsing a user-specified CSV file fails
	private generateCsvError(csvFile : string) {
		return new Error('Failed to parse CSV file "' + csvFile + '". Check that the file adheres to the formatting requirements.');
	}
	
	//Determines if the form is valid, and enables or disables the "create dataset" button accordingly
	private validateForm()
	{
		//Update the visibility of the "source directory" form fields
		this.updateSourceDirVisibility();
		
		//Determine if the form is valid
		let fieldsValid = ($('input:invalid', this.root).length == 0);
		let haveName = (this.getDatasetName().length > 0);
		let haveDatatypes = (this.getSelectedDatatypes().length > 0);
		let haveStations = (this.getStationListCsvPath().length > 0);
		let timespanValid = (this.getEndYear() >= this.getStartYear());
		let haveDataSources = (this.haveSourceDirsForSelectedDatatypes());
		let valid = fieldsValid && haveName && haveDatatypes && haveStations && timespanValid && haveDataSources;
		
		//Only enable the "create dataset" button if the form is valid
		if (valid === true) {
			this.createButton.removeAttr('disabled');
		}
		else {
			this.createButton.attr('disabled', 'disabled');
		}
		
		//Enable or disable the "Next Step" button based on whether the current section is valid
		if (this.currentSection == "Name") {
			this.sectionManager.setProgressEnabled(fieldsValid && haveName);
		}
		else if (this.currentSection == "Measurements") {
			this.sectionManager.setProgressEnabled(haveDatatypes);
		}
		else if (this.currentSection == "Timespan") {
			this.sectionManager.setProgressEnabled(fieldsValid && timespanValid);
		}
		else if (this.currentSection == "Stations") {
			this.sectionManager.setProgressEnabled(haveStations);
		}
		else if (this.currentSection == "Data Source") {
			this.sectionManager.setProgressEnabled(haveDataSources);
		}
	}
	
	//Retrieves the user-specified dataset name
	private getDatasetName() {
		return (<string>(<JQuery<HTMLElement>>this.formFields.get('dataset-name')).val());
	}
	
	//Retrieves the user-specified path to the CSV file containing the list of station numbers
	private getStationListCsvPath() {
		return (<string>(<JQuery<HTMLElement>>this.formFields.get('stations-csv')).val());
	}
	
	//Retrieves the list of datatype codes for the datatypes that the user has selected
	private getSelectedDatatypes()
	{
		return DatatypeCodeHelper.enumValues().filter((dtype : number) => {
			return (<JQuery<HTMLElement>>this.formFields.get('dtype' + dtype)).is(':checked');
		});
	}
	
	//Retrieves the user-specified start year
	private getStartYear() {
		return Number.parseInt(<string>((<JQuery<HTMLElement>>this.formFields.get('start-year')).val()));
	}
	
	//Retrieves the user-specified end year
	private getEndYear() {
		return Number.parseInt(<string>((<JQuery<HTMLElement>>this.formFields.get('end-year')).val()));
	}
	
	protected populateRoot() : void
	{
		//Create the root <div> element
		this.createRoot(CreateDatasetState.identifier(), true, 'blue');
		
		//Create the map to hold our form field elements
		this.formFields = new Map<string, JQuery<HTMLElement>>();
		
		//Create the form fields
		let currentYear = (new Date()).getFullYear();
		let dtypeCheckboxes = DatatypeCodeHelper.enumValues().map((dtype : number) => {
			return '<li><label><input type="checkbox" class="dtype' + dtype + '"> ' + DatatypeCodeHelper.toString(dtype) + '</label></li>';
		}).join('');
		let dtypeDirSelectors = DatatypeCodeHelper.enumValues().map((dtype : number) => {
			return '<p class="field withlabel" data-datatype="' + dtype + '"><label>' + DatatypeCodeHelper.toString(dtype) + '</label> <input type="hidden"><span class="selected-dir">No directory selected.</span> <button class="white choose-dir">Choose</button></p>';
		}).join('');
		this.root.html(this.root.html() + `
			<div class="section-wrapper">
				<section data-section-name="Name">
					<p class="name">Dataset Name</p>
					<p class="description">Enter the name for the new dataset. Cannot be blank.</p>
					<p class="field fullwidth"><input type="text" class="dataset-name" placeholder="Dataset Name" required></p>
				</section>
				
				<section data-section-name="Measurements">
					<p class="name">Measurements to include</p>
					<p class="description">Select the measurements that will be included in the dataset. At least one measurement must be selected.</p>
					<ul class="field">${dtypeCheckboxes}</ul>
				</section>
				
				<section data-section-name="Timespan">
					<p class="name">Timespan</p>
					<p class="description">Select the time range to include in the dataset.</p>
					<div class="multifield">
						<p class="field withlabel"><label>Start Year</label> <input type="number" class="start-year" required step="1" min="1832" max="${currentYear}" value="${currentYear}"></p>
						<p class="field withlabel"><label>End Year</label> <input type="number" class="end-year" required step="1" min="1832" max="${currentYear}" value="${currentYear}"></p>
					</div>
				</section>
				
				<section data-section-name="Stations">
					<p class="name">Stations</p>
					<p class="description">Select a CSV file with one station number per line. The CSV file should not include a header row at the start.</p>
					<p class="field"><input type="hidden" class="stations-csv" required><span class="selected-basename">No file selected.</span> <button class="white choose-csv">Choose</button></p>
				</section>
				
				<section data-section-name="Data Source">
					<p class="name">Data Source</p>
					<p class="description">Select the directories that contain the data for each included measurement type.</p>
					<p class="list-header">These data directories must be in the distribution format supplied by the Bureau of Meteorology:</p>
					<ul class="display-list">
						<li>Each directory will contain a series of text files with a common prefix, followed by either <em>Data</em>, <em>Notes</em>, or <em>StnDet</em> and then a numerical identifier.</li>
						<li>There will be many <em>Data</em> files, but only one <em>Notes</em> file and one <em>StnDet</em> file.</li>
					</ul>
					<div class="multifield forceblock" id="source-directories">
						${dtypeDirSelectors}
					</div>
				</section>
				
				<section data-section-name="Ready">
					<p class="name">Ready to create dataset</p>
					<p class="description">When you click the <strong>Create Dataset</strong> button, the requested details will be validated.</p>
					<p>If validation passes, dataset creation will begin. If validation fails, a report will be displayed that details the problem.</p>
					<p><button class="white create">Create Dataset</button></p>
				</section>
			</div>
			
			<div>
				<button class="blue cancel">Cancel</button>
			</div>
		`);
		
		//Store references to each of the form fields
		$('input', this.root).each((index : number, elem : HTMLElement) =>
		{
			let fieldName = $(elem).attr('class');
			if (fieldName !== undefined) {
				this.formFields.set(fieldName, $(elem));
			}
		});
		
		//Add form validation event listeners to all of the form fields
		this.formFields.forEach((field : JQuery<HTMLElement>, fieldName : string) =>
		{
			field.on('keyup mouseup blur input change propertychange', () => {
				this.validateForm();
			});
		});
		
		//Wire up the event handler for the "choose source directory" buttons
		this.chooseDirButtons = $('.choose-dir', this.root);
		this.chooseDirButtons.click((event : JQuery.Event<HTMLElement, null>) =>
		{
			this.dialogProvider.showOpenDialog('Choose data source directory', [], true).then((paths : string[]) =>
			{
				//Verify that the user specified a path to the source directory
				if (paths !== undefined && paths.length == 1)
				{
					//Update the hidden form field with the full path and display just the basename
					let parentElem = $(event.target).parent();
					$('input', parentElem).val(paths[0]);
					$('.selected-dir', parentElem).text(paths[0]);
					this.validateForm();
				}
			})
			.catch((err : Error) => {
				this.errorHandler.handleError(err);
			});
		});
		
		//Wire up the event handler for the "choose stations list" button
		this.chooseCsvButton = $('.choose-csv', this.root);
		this.chooseCsvButton.click(() =>
		{
			this.dialogProvider.showOpenDialog('Choose station list CSV file', []).then((paths : string[]) =>
			{
				//Verify that the user specified a path to the CSV file
				if (paths !== undefined && paths.length == 1)
				{
					//Attempt to parse the specified CSV file
					let csvFile = paths[0];
					CsvDataUtil.csvToList(csvFile).then((stations : any) =>
					{
						//Verify that the station identifiers are all numeric values
						this.stations = stations.map((station : string) => { return Number.parseInt(station); });
						if (this.stations.filter((s : number) => { return isNaN(s); }).length > 0)
						{
							this.errorHandler.handleError(this.generateCsvError(csvFile));
							this.resetCsvSelection();
						}
						else
						{
							//Update the hidden form field with the full path and display just the basename
							(<JQuery<HTMLElement>>this.formFields.get('stations-csv')).val(csvFile);
							$('.selected-basename', this.root).text(path.basename(csvFile));
							this.validateForm();
						}
					})
					.catch((err : Error) =>
					{
						//Failed to parse the CSV file
						this.errorHandler.handleError(this.generateCsvError(csvFile));
						this.resetCsvSelection();
					});
				}
			})
			.catch((err : Error) => {
				this.errorHandler.handleError(err);
			});
		});
		
		//Wire up the event handler for the "create dataset" button
		this.createButton = $('.create', this.root);
		this.createButton.click(() =>
		{
			//Disable the button once it has been clicked
			this.createButton.attr('disabled', 'disabled');
			
			//Create a DataRequest populated with the user's selected values
			let request = new DataRequest(
				this.stations,
				this.getSelectedDatatypes(),
				this.getSelectedSourceDirs(),
				this.getStartYear(),
				this.getEndYear()
			);
			
			//Validate the request
			this.controller.validateRequest(request).then((validationResult : ValidationReport) =>
			{
				//Determine if the request is valid
				if (validationResult.valid === true)
				{
					//Transition to the "building dataset" state
					this.stateTransition.setState(BuildingDatasetState.identifier(), {'name': this.getDatasetName(), 'request': request});
				}
				else 
				{
					//Transition to the "invalid request" state
					this.stateTransition.setState(InvalidRequestState.identifier(), validationResult);
				}
			})
			.catch((err : Error) => {
				this.errorHandler.handleError(err);
			});
		});
		
		//Wire up the event handler for the "cancel" button
		this.cancelButton = $('.cancel', this.root);
		this.cancelButton.click(() => {
			this.stateTransition.setState(DatasetListState.identifier());
		});
		
		//Wire up the section manager
		this.sectionManager = new UISectionProgressManager($('.section-wrapper', this.root));
		this.sectionManager.onSectionChange((sectionIndex : number, sectionName : string) =>
		{
			this.currentSection = sectionName;
			this.validateForm();
		});
		
		//Run the initial form validation
		this.validateForm();
	}
}
