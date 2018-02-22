import { UIState } from '../UIState'
import { DatasetListState } from './DatasetListState'
import { DatatypeCode, DatatypeCodeHelper } from '../../core/DatatypeCodes'
import { ValidationReport, ValidationReportItem } from '../../core/RequestValidator'
import { ValidationReportGenerator } from '../ValidationReportGenerator'
import * as $ from 'jquery';
import * as fs from 'fs';

export abstract class ReportDisplayBase extends UIState
{
	private reportDisplay : JQuery<HTMLElement>;
	private saveButton : JQuery<HTMLElement>;
	private closeButton : JQuery<HTMLElement>;
	
	//This should be populated by the concrete child state in the onShow() method
	protected validationReport : JQuery<HTMLElement>;
	
	//Returns the identifier for the concrete child state that implements this class
	protected abstract getIdentifier() : string;
	
	//Returns the report title
	protected abstract getReportTitle() : string;
	
	//This should be called by the concrete child state in the onShow() method
	protected updateReportDisplay()
	{
		this.reportDisplay.empty();
		this.reportDisplay.append(this.validationReport);
	}
	
	//Creates the report display, with options to save the HTML to file
	protected populateRoot() : void
	{
		//Create the root <div> element
		this.createRoot(this.getIdentifier(), true);
		
		//Create the <div> to hold the validation report
		this.reportDisplay = $(document.createElement('div')).addClass('report');
		this.root.append(this.reportDisplay);
		
		//Create the "save" button
		this.saveButton = $(document.createElement('button')).addClass('blue').text('Save Report');
		this.saveButton.click(() =>
		{
			let filter = [{'name': 'HTML Files', 'extensions': ['html']}];
			this.dialogProvider.showSaveDialog('Save validation report', filter).then((path : string) =>
			{
				//Check that the user selected a path
				if (path !== undefined)
				{
					//Attempt to save the validation report to a HTML file
					let html = '<!doctype html><html>'
					html += '<head><title>' + this.getReportTitle() + '</title>';
					html += '<style type="text/css">';
					html += `
						body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"; }
						
						h1, h2 { font-weight: normal; }
						
						ul.report-stations-list + h2 {
							margin-top: 2em;
						}
						
						ul.report-stations-list
						{
							padding: 0;
							margin: 0;
						}
						
						ul.report-stations-list li
						{
							padding: 0;
							min-width: 4em;
							margin: 0.25em 0.5em;
							display: inline-block;
						}
						
						table.presence-table {
							border-collapse: collapse;
						}
						
						table.presence-table th {
							background-color: #eee;
						}
						
						table.presence-table th, table.presence-table td
						{
							border: 1px solid #ccc;
							padding: 1em;
						}
						
						table.presence-table th, table.presence-table td:first-child {
							font-weight: bold;
						}
					`;
					
					html += '</style></head><body>' + this.validationReport.html() + '</body></html>';
					fs.writeFile(path, html, (err : Error) =>
					{
						if (err)
						{
							//Inform the user that saving the report failed
							this.errorHandler.handleError(err);
						}
						else
						{
							//Inform the user that saving the report succeeded
							this.dialogProvider.showMessage('Successfully saved report.');
						}
					});
				}
			})
			.catch((err : Error) => {
				this.errorHandler.handleError(err);
			});
		});
		
		//Create the "close" button
		this.closeButton = $(document.createElement('button')).addClass('blue').text('Close');
		this.closeButton.click(() => {
			this.stateTransition.setState(DatasetListState.identifier());
		});
		
		//Append the buttons to the root <div>
		let buttonDiv = $(document.createElement('div'));
		buttonDiv.append(this.saveButton, this.closeButton);
		this.root.append(buttonDiv);
	}
}
