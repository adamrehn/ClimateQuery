import { UIState } from '../UIState'
import { Dataset } from '../../core/Dataset'
import { Query } from '../../core/Query'
import { DatasetListState } from './DatasetListState'
import { QueryFormState } from './QueryFormState'
import * as $ from 'jquery';

export class ChooseQueryState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'choose-query';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Select Query';
	}
	
	private dataset! : Dataset;
	private datasetIndex! : number;
	private supportedQueries! : Query[];
	private listRoot! : JQuery<HTMLElement>;
	private noQueriesMessage! : JQuery<HTMLElement>;
	private cancelButton! : JQuery<HTMLElement>;
	
	public onShow(...args: any[]) : void
	{
		//Store the passed dataset and index
		this.dataset = args[0]['dataset'];
		this.datasetIndex = args[0]['index'];
		
		//Retrieve the list of supported queries for the dataset
		this.controller.listSupportedQueries(this.dataset)
		.then((queries : Query[]) =>
		{
			//Store the list of queries and refresh our list
			this.supportedQueries = queries;
			this.refreshList();
			
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
		this.createRoot(ChooseQueryState.identifier(), true);
		
		//Create the <ul> to hold the list of queries and wrap it in a <div>
		this.listRoot = $(document.createElement('ul'));
		this.listRoot.addClass(['queries', 'selection-list']);
		let listWrapper = $(document.createElement('div')).addClass('list-wrapper');
		listWrapper.append(this.listRoot);
		this.root.append(listWrapper);
		
		//Create a message for when there are no datasets to display
		this.noQueriesMessage = $(document.createElement('em'));
		this.noQueriesMessage.text('There are no supported queries that can be applied to the selected dataset.');
		this.noQueriesMessage.addClass(['no-queries', 'empty-list']);
		this.noQueriesMessage.hide();
		listWrapper.append(this.noQueriesMessage);
		
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
	
	private refreshList()
	{
		//Clear any existing list entries
		this.listRoot.empty();
		
		//Create list entries for each of our supported queries
		this.supportedQueries.forEach((query : Query) =>
		{
			//Create the list item and display the query name and SQL
			let listItem = $(document.createElement('li'));
			let nameDisplay = $(document.createElement('span')).addClass('name').text(query.name);
			let sqlDisplay = $(document.createElement('span')).addClass('sql').text(query.generateSQL());
			
			//Wire up the event handler for the list item
			listItem.click(() =>
			{
				this.stateTransition.setState(QueryFormState.identifier(), {
					'index': this.datasetIndex,
					'dataset': this.dataset,
					'query': query
				});
			});
			
			//Add the item to our list
			listItem.append(nameDisplay, sqlDisplay);
			this.listRoot.append(listItem);
		});
		
		//If there are no supported queries, display the "no queries" message
		if (this.supportedQueries.length == 0) {
			this.noQueriesMessage.show();
		}
		else {
			this.noQueriesMessage.hide();
		}
	}
}
