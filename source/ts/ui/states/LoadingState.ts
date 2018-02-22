import { UIState } from '../UIState'
import * as $ from 'jquery';

export class LoadingState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'loading';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Loading';
	}
	
	constructor()
	{
		//Create the root <div> element and populate it
		super();
		this.createRoot(LoadingState.identifier(), false);
		this.root.html('');
	}
	
	protected populateRoot() : void
	{
		//We create the root element in our constructor instead of populateRoot()
		//because this state will be shown prior to onCreate() being called
	}
}
