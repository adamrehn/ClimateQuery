import { DatatypeCode, DatatypeCodeHelper } from '../../core/DatatypeCodes';
import { UISectionProgressManager } from '../UISectionProgressManager'
import { DataRequest } from '../../core/DataRequest';
import { DatasetBuilder } from '../../core/DatasetBuilder';
import { Dataset } from '../../core/Dataset';
import { Query } from '../../core/Query';
import { UIState } from '../UIState'
import { DatasetListState } from './DatasetListState'
import * as $ from 'jquery';
import * as path from 'path';
const pad : any = require('pad-number');

export class QueryFormState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'query-form';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Query Details';
	}
	
	private dataset : Dataset;
	private datasetIndex : number;
	private query : Query;
	private formFields : Map<string, JQuery<HTMLElement>>;
	private aggregationFieldsRoot : JQuery<HTMLElement>;
	private exportButton : JQuery<HTMLElement>;
	private cancelButton : JQuery<HTMLElement>;
	private sectionManager : UISectionProgressManager;
	private currentSection : string;
	
	public onShow(...args: any[]) : void
	{
		//Store the passed dataset, index, and query
		this.dataset = args[0]['dataset'];
		this.datasetIndex = args[0]['index'];
		this.query = args[0]['query'];
		
		//Create our form fields
		this.createForm();
		
		//Show the state
		super.onShow();
	}
	
	public onHide() : void
	{
		//When the state is hidden, destroy any existing form fields
		super.onHide();
		this.root.remove();
		this.formFields.clear();
	}
	
	protected populateRoot() : void
	{
		//We use createForm() below to create our form fields instead of populateRoot(),
		//since we can't create our form fields without already having a query object
		
		//Create the map to hold our form field elements
		this.formFields = new Map<string, JQuery<HTMLElement>>();
	}
	
	private validateForm()
	{
		//Compute the decimal year values for the specified start date and end date
		let startDate = this.extractValuesFromMonth($('.start-month'));
		let endDate = this.extractValuesFromMonth($('.end-month'));
		let startDecimal = (startDate['year'] + ((startDate['month'] - 1.0) / 12.0));
		let endDecimal = (endDate['year'] + ((endDate['month'] - 1.0) / 12.0));
		
		//Determine if the form is valid
		let valid = ($('input:invalid', this.root).length == 0) && startDecimal <= endDecimal;
		
		//Only enable the "export query result" button if the form is valid
		if (valid === true) {
			this.exportButton.removeAttr('disabled');
		}
		else {
			this.exportButton.attr('disabled', 'disabled');
		}
		
		//Enable or disable the "Next Step" button based on whether the current section is valid
		this.sectionManager.setProgressEnabled(valid);
	}
	
	//Retrieves the list of aggregation fields (if any)
	private getAggregationFields()
	{
		let aggregationFields : string[] = [];
		$('select', this.aggregationFieldsRoot).each((index : number, elem : HTMLElement) =>
		{
			//Don't insert duplicate values into the list
			let field = <string>$(elem).val();
			if (aggregationFields.indexOf(field) == -1) {
				aggregationFields.push(field);
			}
		});
		
		return aggregationFields;
	}
	
	//Retrieve the value for the specified parameter and converts it to the correct datatype
	private getParameterValue(paramName : string) : any
	{
		let valStr : string = (<string>(<JQuery<HTMLElement>>this.formFields.get(paramName)).val());
		if (this.query.parameterTypes.get(paramName) == 'number') {
			return Number.parseFloat(valStr);
		}
		else {
			return valStr;
		}
	}
	
	//Extracts the year and month values from an <input type="month">
	private extractValuesFromMonth(monthElem : JQuery<HTMLElement>)
	{
		let valStr : string = (<string>monthElem.val());
		let parts = valStr.split('-');
		return {
			'year':  Number.parseInt(parts[0]),
			'month': Number.parseInt(parts[1])
		};
	}
	
	//Creates and returns a dropdown containing the valid fields for aggregating by
	private createAggregationDropdown()
	{
		//Create the dropdown itself
		let fields = DatasetBuilder.commonFields();
		let dropdown = $(document.createElement('select'));
		fields.forEach((field : string) =>
		{
			let option = $(document.createElement('option'));
			option.attr('value', field);
			option.text(field);
			dropdown.append(option);
		});
		
		//Create the "remove field" button for the dropdown
		let removeButton = $(document.createElement('button')).addClass('white');
		removeButton.text('Remove Field');
		removeButton.addClass('remove');
		removeButton.click((event : JQuery.Event) => {
			$(event.target).parent().remove();
		});
		
		//Wrap the dropdown and the button in a parent wrapper to facilitate removal
		let wrapper = $(document.createElement('li'));
		wrapper.append(dropdown, removeButton);
		
		return wrapper;
	}
	
	private createForm() : void
	{
		//Create the root <div> element
		this.createRoot(QueryFormState.identifier(), true, 'blue');
		
		//Create form fields for each of the query's parameters
		let paramaterFields : JQuery<HTMLElement>[] = [];
		this.query.parameters.forEach((val : Object, paramName : string) =>
		{
			//Create a label with the parameter name
			let label = $(document.createElement('label'));
			label.text(paramName);
			
			//Create the form field itself
			let field = $(document.createElement('input'));
			field.attr('required', 'required');
			field.attr('value', val.toString());
			field.attr('type', (<string>this.query.parameterTypes.get(paramName)));
			this.formFields.set(paramName, field);
			
			//Wrap the input and the label in a <p>
			let wrapper = $(document.createElement('p'));
			wrapper.addClass('field');
			wrapper.addClass('withlabel');
			wrapper.append(label, field);
			paramaterFields.push(wrapper);
		});
		
		//We display a different message depending on whether or not the query has any parameters
		let paramsMessage = 'This query does not contain any parameters that you can specify values for.';
		if (paramaterFields.length > 0) {
			paramsMessage = 'This query contains parameters that you can specify values for. This allows you to customise the query behaviour.';
		}
		
		//Create the form
		this.root.html(this.root.html() + `
			
			<div class="section-wrapper">
				<section data-section-name="Query Details">
					<p class="name">Verify Query Details</p>
					<p>You have chosen to run the query <strong>${this.query.name}</strong> against the dataset <strong>${this.dataset.name}</strong>, which utilises the following SQL code:</p>
					<pre class="query-sql">${this.query.generateSQL()}</pre>
					<p>Please verify that this is the intended query before you continue.</p>
				</section>
				
				<section data-section-name="Timespan">
					<p class="name">Timespan</p>
					<p class="description">Select the time range of data to run the query against.</p>
					<div class="multifield">
						<p class="field withlabel"><label>Start Month</label> <input type="month" class="start-month" required min="${this.dataset.request.startYear}-01" max="${this.dataset.request.endYear}-12" value="${this.dataset.request.startYear}-01"></p>
						<p class="field withlabel"><label>End Month</label> <input type="month" class="end-month" required min="${this.dataset.request.startYear}-01" max="${this.dataset.request.endYear}-12" value="${this.dataset.request.endYear}-12"></p>
					</div>
				</section>
				
				<section data-section-name="Parameters">
					<p class="name">Query parameters</p>
					<p class="description">${paramsMessage}</p>
					<div class="parameters multifield"></div>
				</section>
				
				<section data-section-name="Aggregation">
					<p class="name">Aggregation fields</p>
					<p class="description">Choose which fields (if any) to use for aggregating the query results.</p>
					<ul class="field aggregation-fields"></ul>
					<p class="add-button-wrapper"><button class="white add-aggregation-field">Add Field</button></p>
				</section>
				
				<section data-section-name="Ready">
					<p class="name">Ready to run query</p>
					<p class="description">When you click the <strong>Export Query Results</strong> button, you will be prompted for an output CSV filename.</p>
					<p>The query will then be run and the results saved to the specified file.</p>
					<p><button class="white export">Export Query Results</button></p>
				</section>
			</div>
			
			<div>
				<button class="blue cancel">Cancel</button>
			</div>
		`);
		
		//Store a reference to the container that holds the list of aggregation fields
		this.aggregationFieldsRoot = $('.aggregation-fields', this.root);
		
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
		
		//Add the parameter fields to the form
		$('.parameters', this.root).append(...paramaterFields);
		
		//Wire up the event handler for the "add aggregation field" button
		$('.add-aggregation-field', this.root).click(() => {
			this.aggregationFieldsRoot.append(this.createAggregationDropdown());
		});
		
		//Wire up the event handler for the "export query results" button
		this.exportButton = $('.export', this.root);
		this.exportButton.click(() =>
		{
			//Prompt the user for an output file path to export to
			let filter = [{'name': 'CSV Files', 'extensions': ['csv']}];
			this.dialogProvider.showSaveDialog('Export query result', filter).then((path : string) =>
			{
				//Check that the user selected a path
				if (path !== undefined)
				{
					//Apply the form field values to the query
					let fullQuery = this.query.clone();
					fullQuery.parameters.forEach((v : Object, paramName : string) => {
						fullQuery.setParameter(paramName, this.getParameterValue(paramName));
					});
					
					//Apply the starting and ending month values to the query
					let startPoint = this.extractValuesFromMonth($('.start-month', this.root));
					let endPoint = this.extractValuesFromMonth($('.end-month', this.root));
					fullQuery.applyTimeRange(
						startPoint['year'],
						startPoint['month'],
						endPoint['year'],
						endPoint['month']
					);
					
					//Apply our list of aggregation fields (if any)
					fullQuery.applyAggregation(this.getAggregationFields());
					
					//Attempt to run the query and export the result
					this.overlayProvider.showOverlay('Exporting Query Result...');
					this.controller.exportQueryResult(this.datasetIndex, fullQuery, path).then(() =>
					{
						this.overlayProvider.hideOverlay();
						this.dialogProvider.showMessage('Successfully exported query result.');
					})
					.catch((err : Error) =>
					{
						this.overlayProvider.hideOverlay();
						this.errorHandler.handleError(err);
					});
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
