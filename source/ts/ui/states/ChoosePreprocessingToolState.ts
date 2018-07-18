import { UIState } from '../UIState'
import { PreprocessingTool } from '../../core/PreprocessingTool';
import { DatasetListState } from './DatasetListState'
import * as $ from 'jquery';

export class ChoosePreprocessingToolState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'choose-preprocessing-tool';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Select Preprocessing Tool';
	}
	
	private listRoot! : JQuery<HTMLElement>;
	private noToolsMessage! : JQuery<HTMLElement>;
	private cancelButton! : JQuery<HTMLElement>;
	
	public onShow(...args: any[]) : void
	{
		//Retrieve the list of preprocessing tools
		this.controller.listPreprocessingTools()
		.then((tools : PreprocessingTool[]) =>
		{
			//Refresh our list
			this.refreshList(tools);
			
			//Show the state
			super.onShow();
		})
		.catch((err : Error) => {
			this.errorHandler.handleError(err);
		});
	}
	
	protected populateRoot() : void
	{
		//Create the root <div> element
		this.createRoot(ChoosePreprocessingToolState.identifier(), true);
		
		//Create the <ul> to hold the list of preprocessing tools and wrap it in a <div>
		this.listRoot = $(document.createElement('ul'));
		this.listRoot.addClass(['preprocessing-tools', 'selection-list']);
		let listWrapper = $(document.createElement('div')).addClass('list-wrapper');
		listWrapper.append(this.listRoot);
		this.root.append(listWrapper);
		
		//Create a message for when there are no preprocessing tools to display
		this.noToolsMessage = $(document.createElement('em'));
		this.noToolsMessage.text('There are no available data preprocessing tools.');
		this.noToolsMessage.addClass(['no-preprocessing-tools', 'empty-list']);
		this.noToolsMessage.hide();
		listWrapper.append(this.noToolsMessage);
		
		//Create the "cancel" button and wrap it in a <div>
		this.cancelButton = $(document.createElement('button')).addClass('blue');
		this.cancelButton.text('Cancel');
		this.cancelButton.addClass('cancel');
		this.cancelButton.click(() => {
			this.stateTransition.setState(DatasetListState.identifier());
		});
		let buttonWrapper = $(document.createElement('div')).addClass('button-wrapper');
		buttonWrapper.append(this.cancelButton);
		this.root.append(buttonWrapper);
	}
	
	private refreshList(tools : PreprocessingTool[])
	{
		//Clear any existing list entries
		this.listRoot.empty();
		
		//Create list entries for each of our available preprocessing tools
		tools.forEach((tool : PreprocessingTool) =>
		{
			//Create the list item and display the query name and SQL
			let listItem = $(document.createElement('li'));
			let nameDisplay = $(document.createElement('span')).addClass('name').text(tool.name);
			let descriptionDisplay = $(document.createElement('span')).addClass('description').text(tool.descriptionShort);
			
			//Wire up the event handler for the list item
			//TODO
						
			//Add the item to our list
			listItem.append(nameDisplay, descriptionDisplay);
			this.listRoot.append(listItem);
		});
		
		//If there are no available tools, display the "no preprocessing tools" message
		if (tools.length == 0) {
			this.noToolsMessage.show();
		}
		else {
			this.noToolsMessage.hide();
		}
	}
}
