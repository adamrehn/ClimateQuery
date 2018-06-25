import { UILoadingIconProvider, LoadingIconColour } from './UILoadingIconProvider';
import { ApplicationController } from '../core/ApplicationController'
import { UIStateTransitionHandler } from './UIStateTransitionHandler'
import { UIOverlayProvider } from './UIOverlayProvider'
import { UIDialogProvider } from './UIDialogProvider'
import { UIErrorHandler } from './UIErrorHandler'
import { UIState } from './UIState'
import { remote } from 'electron'
import * as $ from 'jquery';
const { BrowserWindow, dialog } = require('electron').remote;

//Include each of the individual UI state classes
import { LoadingState } from './states/LoadingState'
import { DatasetListState } from './states/DatasetListState'
import { CreateDatasetState } from './states/CreateDatasetState'
import { InvalidRequestState } from './states/InvalidRequestState'
import { PresenceReportState } from './states/PresenceReportState'
import { BuildingDatasetState } from './states/BuildingDatasetState'
import { ChooseQueryState } from './states/ChooseQueryState'
import { QueryFormState } from './states/QueryFormState'

export class UIStateManager implements UIStateTransitionHandler, UIDialogProvider, UIOverlayProvider, UIErrorHandler, UILoadingIconProvider
{
	private states : Map<string,UIState>;
	private activeState! : UIState;
	private loadingState : string = LoadingState.identifier();
	private defaultState : string = DatasetListState.identifier();
	private overlayDiv : JQuery<HTMLElement>;
	
	public constructor()
	{
		//Create the page overlay <div>
		this.overlayDiv = $(document.createElement('div'));
		this.overlayDiv.append( this.createLoadingIcon(LoadingIconColour.White) );
		this.overlayDiv.append($(document.createElement('p')).addClass('message'));
		this.overlayDiv.addClass('overlay');
		this.overlayDiv.hide();
		$('body').append(this.overlayDiv);
		
		//Create our list of UI states
		this.states = new Map<string,UIState>();
		this.states.set(LoadingState.identifier(), new LoadingState());
		this.states.set(DatasetListState.identifier(), new DatasetListState());
		this.states.set(CreateDatasetState.identifier(), new CreateDatasetState());
		this.states.set(InvalidRequestState.identifier(), new InvalidRequestState());
		this.states.set(PresenceReportState.identifier(), new PresenceReportState());
		this.states.set(BuildingDatasetState.identifier(), new BuildingDatasetState());
		this.states.set(ChooseQueryState.identifier(), new ChooseQueryState());
		this.states.set(QueryFormState.identifier(), new QueryFormState());
		
		//Activate our default "loading" state, which doesn't require a controller
		this.setState(this.loadingState);
		
		//Create the application controller
		ApplicationController.createController().then((controller : ApplicationController) =>
		{
			//Initialise each of our states with the controller and a reference to this,
			//typecast as a UIStateTransitionHandler, a UIDialogProvider, and a UIErrorHandler
			this.states.forEach((state : UIState) => {
				state.onCreate(controller, this, this, this, this, this);
			});
			
			//Transition to our default UI state
			this.setState(this.defaultState);
		})
		.catch(this.handleError.bind(this));
	}
	
	//Transitions from the current UI state into the specified state
	public setState(newState : string, ...extraArgs : any[]) : void
	{
		//Verify that the requested state exists
		if (this.states.has(newState))
		{
			//If we have an outgoing state, call its onHide() hook
			if (this.activeState !== undefined) {
				this.activeState.onHide();
			}
			
			//Transition into the new state
			this.activeState = <UIState>(this.states.get(newState));
			$('head title').text('ClimateQuery - ' + this.activeState.getTitle());
			this.activeState.onShow(...extraArgs);
		}
		else {
			this.handleError(new Error('invalid state "' + newState + '"'));
		}
	}
	
	//Creates a loading icon with the specified colour
	public createLoadingIcon(colour : LoadingIconColour) : JQuery<HTMLElement>
	{
		let loadingIcon = $(document.createElement('div')).addClass('loading-icon');
		let svgImage = './images/logo_loading_' + ((colour == LoadingIconColour.Blue) ? 'blue' : 'white') + '.svg'
		let cssColour = ((colour == LoadingIconColour.Blue) ? '#00aeef' : '#fff');
		let divHtml = `<div class="image-wrapper"><img src="${svgImage}"></div><div style="color: ${cssColour}" class="la-ball-fall la-3x"><div></div><div></div><div></div></div>`;
		loadingIcon.html(divHtml);
		return loadingIcon;
	}
	
	//Displays an error message to the user
	public handleError(err : Error) : void
	{
		if (err.message !== undefined && err.stack !== undefined) {
			dialog.showErrorBox('Error', err.message + '\n\n' + err.stack);
		}
		else {
			dialog.showErrorBox('Error', JSON.stringify(err));
		}
	}
	
	//Displays an informational message to the user
	public showMessage(message : string) : Promise<any>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			dialog.showMessageBox({'message': message, 'buttons': ['OK']}, (response : number) => {
				resolve(true);
			});
		});
	}
	
	//Prompts the user for confirmation of an action
	public showConfirmDialog(message : string, confirmButtonLabel : string) : Promise<boolean>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			dialog.showMessageBox({'message': message, 'buttons': [confirmButtonLabel, 'Cancel']}, (response : number) =>
			{
				if (response === 0) {
					resolve(true);
				}
				else {
					reject(false);
				}
			});
		});
	}
	
	//Prompts the user for an input path for opening a file or directory
	public showOpenDialog(title : string, filters : any[], chooseDirs? : boolean) : Promise<string[]>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			dialog.showOpenDialog(
				BrowserWindow.getFocusedWindow(),
				{
					'title': title,
					'filters': filters,
					'properties': [((chooseDirs === true) ? 'openDirectory' : 'openFile')]
				},
				(paths : string[]) => {
					resolve(paths);
				}
			);
		});
	}
	
	//Prompts the user for an output file path for saving a file
	public showSaveDialog(title : string, filters : any[]) : Promise<string>
	{
		return new Promise((resolve : Function, reject : Function) =>
		{
			dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {'title': title, 'filters': filters}, (path : string) => {
				resolve(path);
			});
		});
	}
	
	//Shows the page overlay, temporarily disabling window resizing
	showOverlay(overlayText : string) : void
	{
		remote.getCurrentWindow().setMaximizable(false);
		remote.getCurrentWindow().setResizable(false);
		$('.message', this.overlayDiv).text(overlayText);
		this.overlayDiv.show();
	}
	
	//Hides the page overlay and re-enables window resizing
	hideOverlay() : void
	{
		remote.getCurrentWindow().setMaximizable(true);
		remote.getCurrentWindow().setResizable(true);
		this.overlayDiv.hide();
	}
}
