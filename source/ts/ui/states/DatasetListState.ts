import { UIState } from '../UIState'
import { Dataset } from '../../core/Dataset'
import { DatatypeCodeHelper } from '../../core/DatatypeCodes'
import { DatasetGranularityHelper } from '../../core/DatasetGranularities';
import { PresenceReportState } from './PresenceReportState'
import { CreateDatasetState } from './CreateDatasetState'
import { ChooseQueryState } from './ChooseQueryState'
import { ChoosePreprocessingToolState } from './ChoosePreprocessingToolState';
import * as numeral from 'numeral';
import { remote } from 'electron'
import * as $ from 'jquery';
const dateFormat : any = require('dateformat');

export class DatasetListState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'dataset-list';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Existing Datasets';
	}
	
	private listRoot! : JQuery<HTMLElement>;
	private listWrapper! : JQuery<HTMLElement>;
	private exportOverlay! : JQuery<HTMLElement>;
	private noDatasetsMessage! : JQuery<HTMLElement>;
	private createButton! : JQuery<HTMLElement>;
	private preprocessingToolsButton! : JQuery<HTMLElement>;
	private defaultErrorHandler! : (err:Error)=>void;
	
	public onShow(...args: any[]) : void {
		this.reloadDatasets();
	}
	
	protected populateRoot() : void
	{
		//We forward all errors to the supplied error handler
		this.defaultErrorHandler = (err : Error) => {
			this.errorHandler.handleError(err);
		};
		
		//Create the root <div> element
		this.createRoot(DatasetListState.identifier(), true);
		
		//Create the <ul> to hold the list of datasets and wrap it in a <div>
		this.listRoot = $(document.createElement('ul'));
		this.listRoot.addClass('datasets');
		this.listWrapper = $(document.createElement('div')).addClass('list-wrapper');
		this.listWrapper.append(this.listRoot);
		this.root.append(this.listWrapper);
		
		//Create a message for when there are no datasets to display
		this.noDatasetsMessage = $(document.createElement('div'));
		this.noDatasetsMessage.html('<p>There are no existing datasets to display.</p><p>To get started, click the "Create new dataset" button.</p>');
		this.noDatasetsMessage.addClass('no-datasets');
		this.noDatasetsMessage.hide();
		this.listWrapper.append(this.noDatasetsMessage);
		
		//Create the "data preprocessing tools" button and wrap it in a <div>
		this.preprocessingToolsButton = $(document.createElement('button')).addClass('blue');
		this.preprocessingToolsButton.text('Data Preprocessing Tools');
		this.preprocessingToolsButton.addClass(['preprocessingTools', 'button-left']);
		this.preprocessingToolsButton.click(() => {
			this.stateTransition.setState(ChoosePreprocessingToolState.identifier());
		});
		let buttonWrapper = $(document.createElement('div')).addClass('button-wrapper');
		buttonWrapper.append(this.preprocessingToolsButton);
		
		//Create the "new dataset" button and wrap it in a <div>
		this.createButton = $(document.createElement('button')).addClass('blue');
		this.createButton.text('Create new dataset');
		this.createButton.addClass('createNew');
		this.createButton.click(() => {
			this.stateTransition.setState(CreateDatasetState.identifier());
		});
		buttonWrapper.append(this.createButton);
		this.root.append(buttonWrapper);
	}
	
	private reloadDatasets() : void
	{
		this.controller.listDatasets().then((datasets : Dataset[]) =>
		{
			this.refreshList(datasets);
			super.onShow();
		})
		.catch(this.defaultErrorHandler);
	}
	
	private formatList(items : string[])
	{
		//Join the last two items with "and" instead of a comma
		if (items.length > 1)
		{
			let lastTwo = items.splice(items.length - 2, 2).join(' and ');
			items.push(lastTwo);
		}
		
		//Join all remaining items with commas
		return items.join(', ');
	}
	
	private refreshList(datasets : Dataset[]) : void
	{
		//Refresh the list of datasets
		this.listRoot.empty();
		let listItems : JQuery<HTMLElement>[] = [];
		datasets.forEach((dataset : Dataset, datasetIndex : number) =>
		{
			//Create a new list item
			let listEntry = $(document.createElement('li'));
			let datasetDetails = $(document.createElement('span')).addClass('details');
			let datasetActions = $(document.createElement('span')).addClass('actions');
			
			//Populate the dataset details
			let datasetName = $(document.createElement('span')).addClass('name').text(dataset.name);
			let datasetStations = $(document.createElement('span')).addClass('stations').text(dataset.request.stations.length + ' Stations');
			let timestamp = new Date(dataset.timestamp*1000);
			let datasetCreated = $(document.createElement('span')).addClass('created');
			datasetCreated.text('Created ' + dateFormat(timestamp, 'dddd dS mmmm yyyy') + ' at ' + dateFormat(timestamp, 'h:MM tt'));
			let datasetDatatypes = $(document.createElement('span')).addClass('datatypes');
			let datatypes = this.formatList(dataset.request.datatypeCodes.map(DatatypeCodeHelper.toString));
			datasetDatatypes.text(DatasetGranularityHelper.toString(dataset.granularity) + ' ' + datatypes + ' from ' + dataset.request.startYear + ' to ' + dataset.request.endYear);
			let datasetPresent = $(document.createElement('span')).addClass('present').text(numeral(dataset.present).format('00.00') + '% data quality controlled and acceptable');
			if (dataset.present < 75.0)
			{
				datasetPresent.addClass('validation-warning');
				datasetPresent.attr('title', 'Warning: less than 75% of data is quality controlled and acceptable');
				datasetPresent.html('<span class="warning-icon">&#x26A0;</span>' + datasetPresent.html());
			}
			else {
				datasetPresent.addClass('validation-passed');
			}
			
			//Create the UI controls for the dataset actions
			let presenceReport = $(document.createElement('button')).addClass('blue').text('Data Quality Report');
			let queryDataset = $(document.createElement('button')).addClass('blue').text('Query');
			let exportDataset = $(document.createElement('button')).addClass('blue').text('Export');
			let deleteDataset = $(document.createElement('button')).addClass('blue').text('Delete');
			
			//Wire up the events for the dataset actions
			
			//"Data Quality Report" button
			presenceReport.click(() => {
				this.stateTransition.setState(PresenceReportState.identifier(), {'dataset': dataset, 'index': datasetIndex});
			});
			
			//"Query dataset" button
			queryDataset.click(() => {
				this.stateTransition.setState(ChooseQueryState.identifier(), {'dataset': dataset, 'index': datasetIndex});
			});
			
			//"Export dataset" button
			exportDataset.click(() =>
			{
				//Prompt the user for an output file path to export to
				let filter = [{'name': 'CSV Files', 'extensions': ['csv']}];
				this.dialogProvider.showSaveDialog('Export dataset', filter).then((path : string) =>
				{
					//Check that the user selected a path
					if (path !== undefined)
					{
						//Attempt to export the dataset
						this.overlayProvider.showOverlay('Exporting Dataset...');
						this.controller.exportDataset(datasetIndex, path).then(() =>
						{
							this.overlayProvider.hideOverlay();
							this.dialogProvider.showMessage('Successfully exported dataset.');
						})
						.catch((err : Error) =>
						{
							this.overlayProvider.hideOverlay();
							this.defaultErrorHandler(err);
						});
					}
				})
				.catch(this.defaultErrorHandler);
			});
			
			//"Delete dataset" button
			deleteDataset.click(() =>
			{
				//Prompt the user for confirmation prior to deleting the dataset
				let message = 'Are you sure you want to delete the dataset "' + dataset.name + '"?';
				this.dialogProvider.showConfirmDialog(message, 'Delete').then(() =>
				{
					//Attempt to delete the dataset
					this.controller.deleteDataset(datasetIndex).then(() => {
						this.reloadDatasets();
					})
					.catch(this.defaultErrorHandler);
				})
				.catch(() => {
					//User selected no when presented with the confirmation dialog
				});
			});
			
			//Update the DOM
			datasetDetails.append(datasetName, datasetCreated, datasetDatatypes, datasetPresent, datasetStations);
			datasetActions.append(presenceReport, queryDataset, exportDataset, deleteDataset);
			listEntry.append(datasetDetails, datasetActions);
			listItems.push(listEntry);
		});
		
		//Display datasets in reverse-chronological order
		listItems = listItems.reverse();
		this.listRoot.append(...listItems);
		
		//Whenever the window is resized, resize the "no datasets" message appropriately
		$(window).resize(() => {
			this.noDatasetsMessage.css('height', this.listWrapper.outerHeight() + 'px');
		});
		
		//If there are no datasets, display the "no datasets" message
		if (datasets.length == 0)
		{
			//The next time the window is redrawn, resize the "no datasets" message appropriately and display it
			window.requestAnimationFrame(() =>
			{
				this.noDatasetsMessage.css('height', this.listWrapper.outerHeight() + 'px');
				this.noDatasetsMessage.show();
			});
		}
		else {
			this.noDatasetsMessage.hide();
		}
	}
}
