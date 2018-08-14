import { ApplicationController } from '../core/ApplicationController';
import { UIStateTransitionHandler } from './UIStateTransitionHandler';
import { UILoadingIconProvider } from './UILoadingIconProvider';
import { UIOverlayProvider } from './UIOverlayProvider';
import { UIDialogProvider } from './UIDialogProvider';
import { UIErrorHandler } from './UIErrorHandler';
import * as $ from 'jquery';

export class UIState
{
	//All states use these member fields to interact with the application
	protected controller! : ApplicationController;
	protected stateTransition! : UIStateTransitionHandler;
	protected dialogProvider! : UIDialogProvider;
	protected overlayProvider! : UIOverlayProvider;
	protected iconProvider! : UILoadingIconProvider;
	protected errorHandler! : UIErrorHandler;
	protected root! : JQuery<HTMLElement>;
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return '';
	}
	
	//Called when the state is created
	//(Note that UI states should not override onCreate() itself, but should instead implement populateRoot())
	public onCreate(controller : ApplicationController, stateTransition : UIStateTransitionHandler, dialogProvider : UIDialogProvider, overlayProvider : UIOverlayProvider, iconProvider : UILoadingIconProvider, errorHandler : UIErrorHandler) : void
	{
		this.controller = controller;
		this.stateTransition = stateTransition;
		this.dialogProvider = dialogProvider;
		this.overlayProvider = overlayProvider;
		this.iconProvider = iconProvider;
		this.errorHandler = errorHandler;
		this.populateRoot();
	}
	
	//Called when the state is transitioned into
	public onShow(...args: any[]) : void {
		this.root.show()
	}
	
	//Called when the state is transitioned out of
	public onHide() : void {
		this.root.hide();
	}
	
	//Implement this method with code to create populate the root <div> element
	protected populateRoot() : void {}
	
	//Helper function to create the root <div> element, designed to be called by populateRoot() implementations
	protected createRoot(id : string, scrollable : boolean, customClass? : string) : void
	{
		this.root = $(document.createElement('div'));
		this.root.addClass('state');
		this.root.addClass((scrollable === true) ? 'scrollable' : 'nonscrollable');
		if (customClass !== undefined) {
			this.root.addClass(customClass);
		}
		this.root.attr('id', id);
		this.root.hide();
		$('body').append(this.root);
	}
}
