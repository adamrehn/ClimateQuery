import { UISectionProgressManager } from '../UISectionProgressManager'
import { UIState } from '../UIState'
import { DatasetListState } from './DatasetListState'
import { PreprocessingTool } from '../../core/PreprocessingTool';
import * as $ from 'jquery';

export class PreprocessingToolFormState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'preprocessing-tool-form';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Preprocessing Tool Details';
	}
	
	private origTool! : PreprocessingTool;
	private tool! : PreprocessingTool;
	private formFields! : Map<string, JQuery<HTMLElement>>;
	private runButton! : JQuery<HTMLElement>;
	private cancelButton! : JQuery<HTMLElement>;
	private sectionManager! : UISectionProgressManager;
	private currentSection! : string;
	
	public onShow(...args: any[]) : void
	{
		//Store the passed tool
		this.origTool = args[0];
		this.tool = this.origTool.clone();
		
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
		this.tool = this.origTool.clone();
	}
	
	protected populateRoot() : void
	{
		//We use createForm() below to create our form fields instead of populateRoot(),
		//since we can't create our form fields without already having a preprocessing tool object
		
		//Create the map to hold our form field elements
		this.formFields = new Map<string, JQuery<HTMLElement>>();
	}
	
	private validateForm()
	{
		//Apply the form field values to the tool
		this.tool.parameters.forEach((v : Object, paramName : string) => {
			this.tool.setParameter(paramName, this.getParameterValue(paramName));
		});
		
		//Use the validation logic from the preprocessing tool to determine if the values are valid
		let valid = this.tool.validate();
		
		//Only enable the "run preprocessing tool" button if the form is valid
		if (valid === true) {
			this.runButton.removeAttr('disabled');
		}
		else {
			this.runButton.attr('disabled', 'disabled');
		}
		
		//Enable or disable the "Next Step" button based on whether the current section is valid
		this.sectionManager.setProgressEnabled(this.currentSection != "Parameters" || valid);
	}
	
	//Retrieve the value for the specified parameter and converts it to the correct datatype
	private getParameterValue(paramName : string) : any
	{
		let valStr : string = (<string>(<JQuery<HTMLElement>>this.formFields.get(paramName)).val());
		if (this.tool.parameterTypes.get(paramName) == 'number') {
			return Number.parseFloat(valStr);
		}
		else {
			return valStr;
		}
	}
	
	private updateParametersSection()
	{
		//Create form fields for each of the tools's parameters
		this.formFields.clear();
		let paramaterFields : JQuery<HTMLElement>[] = [];
		this.tool.parameters.forEach((val : Object, paramName : string) =>
		{
			//Create a label with the parameter name
			let label = $(document.createElement('label'));
			label.text(paramName + ':');
			
			//Create a wrapper <p> for the input and the label
			let wrapper = $(document.createElement('p'));
			wrapper.addClass('field');
			wrapper.addClass('withlabel');
			wrapper.append(label);
			paramaterFields.push(wrapper);
			
			//Create the form field itself, based on the specified type
			let fieldType = <string>this.tool.parameterTypes.get(paramName);
			if (fieldType == 'file' || fieldType == 'directory')
			{
				//File or directory selector
				
				//Create the hidden field itself
				let field = $(document.createElement('input'));
				field.attr('value', val.toString());
				field.attr('type', 'hidden');
				this.formFields.set(paramName, field);
				wrapper.append(field);
				
				//Create the display text
				let display = $(document.createElement('span'));
				display.text((val.toString().length > 0) ? val.toString() : `No ${fieldType} selected.`);
				wrapper.append(display);
				
				//Create the selection button
				let button = $(document.createElement('button'));
				button.addClass('white');
				button.text('Choose');
				wrapper.append(button);
				button.click(() =>
				{
					this.dialogProvider.showOpenDialog(`Choose ${fieldType}`, [], fieldType == 'directory').then((paths : string[]) =>
					{
						//Verify that the user specified a path
						if (paths !== undefined && paths.length == 1)
						{
							//Update the hidden form field and display text with the path
							field.val(paths[0]);
							display.text(paths[0]);
							this.validateForm();
						}
					})
					.catch((err : Error) => {
						this.errorHandler.handleError(err);
					});
				});
			}
			else
			{
				//Standard <input> type (e.g. text, number, etc.)
				let field = $(document.createElement('input'));
				field.attr('value', val.toString());
				field.attr('type', fieldType);
				this.formFields.set(paramName, field);
				wrapper.append(field);
			}
		});
		
		//Create the buttons for any custom parameter actions the tool offers
		let actionButtons : JQuery<HTMLElement>[] = [];
		this.tool.parameterActions().forEach((callback : ()=>void, actionName : string) =>
		{
			let button = $(document.createElement('button'));
			button.addClass('white');
			button.text(actionName);
			actionButtons.push(button);
			button.click(() =>
			{
				//Invoke the action callback, which may modify the tool's parameters
				try {
					callback();
				}
				catch (err) {
					this.errorHandler.handleError(err);
				}
				
				//Reset the parameters display and re-validate the form
				this.updateParametersSection();
				this.validateForm();
			});
		});
		
		//We display a different message depending on whether or not the tool has any parameters
		let paramsMessage = 'This preprocessing tool does not contain any parameters that you can specify values for.';
		if (paramaterFields.length > 0) {
			paramsMessage = 'This preprocessing tool contains parameters that you can specify values for. This allows you to customise the tool behaviour.';
		}
		
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
		$('.parameters', this.root).empty().append(...paramaterFields);
		
		//Add the parameter action buttons to the form
		$('.actions', this.root).empty().append(...actionButtons);
		
		//Update the parameters message text
		$('.description', this.root).empty().text(paramsMessage);
		
		//Show or hide the action buttons <p> depending on whether we have any buttons
		if (actionButtons.length > 0) {
			$('.actions', this.root).show();
		}
		else {
			$('.actions', this.root).hide();
		}
	}
	
	private updateProgress(percentage : number) {
		this.overlayProvider.showOverlay(`Running Data Preprocessing Tool, this may take some time... (${Math.floor(percentage)}%)`);
	}
	
	private createForm() : void
	{
		//Create the root <div> element
		this.createRoot(PreprocessingToolFormState.identifier(), true, 'blue');
		
		//Create the form
		this.root.html(this.root.html() + `
			
			<div class="section-wrapper">
				<section data-section-name="Tool Details">
					<p class="name">${this.tool.name()}</p>
					<p>${this.tool.descriptionLong().replace(/\n\n/g, '</p><p>')}</p>
					
				</section>
				
				<section data-section-name="Parameters">
					<p class="name">Tool parameters</p>
					<p class="description"></p>
					<div class="parameters multifield"></div>
					<p class="actions"></p>
				</section>
				
				<section data-section-name="Ready">
					<p class="name">Ready to run preprocessing tool</p>
					<p class="description">When you click the <strong>Run Preprocessing Tool</strong> button, the tool will begin processing.</p>
					<p><button class="white run">Run Preprocessing Tool</button></p>
				</section>
			</div>
			
			<div>
				<button class="blue cancel">Cancel</button>
			</div>
		`);
		
		//Populate the parameters section
		this.updateParametersSection();
		
		//Wire up the event handler for the "run preprocessing tool" button
		this.runButton = $('.run', this.root);
		this.runButton.click(() =>
		{
			//Attempt to run the query and export the result
			this.updateProgress(0);
			this.tool.execute(this.updateProgress.bind(this)).then(() =>
			{
				this.overlayProvider.hideOverlay();
				this.dialogProvider.showMessage(`Successfully ran the "${this.tool.name()}" data preprocessing tool.`);
			})
			.catch((err : Error) =>
			{
				this.overlayProvider.hideOverlay();
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
