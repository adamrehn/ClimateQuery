import { LoadingIconColour } from '../UILoadingIconProvider';
import { BuildProgress } from '../../core/BuildProgress';
import { DataRequest } from '../../core/DataRequest';
import { DatasetListState } from './DatasetListState'
import { UIState } from '../UIState';
import * as $ from 'jquery';

export class BuildingDatasetState extends UIState
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'building-dataset';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Building Dataset';
	}
	
	private datasetName : string;
	private request : DataRequest;
	private progressPercent : JQuery<HTMLElement>;
	private progressBar : JQuery<HTMLElement>;
	private progressText : JQuery<HTMLElement>;
	private buttonWrapper : JQuery<HTMLElement>;
	private doneButton : JQuery<HTMLElement>;
	
	public onShow(...args: any[]) : void
	{
		//Store the passed dataset name and request
		this.datasetName = args[0]['name'];
		this.request = args[0]['request'];
		
		//Initiate the build
		this.controller.createDataset(this.datasetName, this.request, this.updateProgress.bind(this))
		.then(() =>
		{
			//Once the build has completed, show the "done" button
			this.buttonWrapper.show();
		})
		.catch((err : Error) => {
			this.errorHandler.handleError(err);
		});
		
		//Show the state
		this.buttonWrapper.hide();
		super.onShow();
	}
	
	private updateProgress(progress : BuildProgress)
	{
		//Update the progress percentage indicator
		this.progressPercent.text(Math.floor(progress.calculatePercentComplete()) + '%');
		
		//Update the progress bar
		this.progressBar.attr('value', progress.calculatePercentComplete());
		
		//Update the progress text
		this.progressText.text(progress.toString());
	}
	
	protected populateRoot() : void
	{
		//Create the root <div> element
		this.createRoot(BuildingDatasetState.identifier(), false);
		
		//Create the loading icon
		let loadingIcon = this.iconProvider.createLoadingIcon(LoadingIconColour.Blue);
		
		//Create the progress percentage indicator and wrap it in a paragraph
		this.progressPercent = $(document.createElement('span'));
		let percentWrapper = $(document.createElement('p'));
		percentWrapper.append(this.progressPercent);
		
		//Create the progress bar and wrap it in a paragraph
		this.progressBar = $(document.createElement('progress'));
		this.progressBar.attr('value', 0);
		this.progressBar.attr('min', 0);
		this.progressBar.attr('max', 100);
		let barWrapper = $(document.createElement('p'));
		barWrapper.append(this.progressBar);
		
		//Create the progress text and wrap it in a paragraph
		this.progressText = $(document.createElement('span'));
		let textWrapper = $(document.createElement('p'));
		textWrapper.append(this.progressText);
		
		//Create the "done" button and wrap it in a paragraph
		this.doneButton = $(document.createElement('button')).addClass('blue');
		this.doneButton.addClass('done');
		this.doneButton.text('Done');
		this.doneButton.click(() => {
			this.stateTransition.setState(DatasetListState.identifier());
		});
		this.buttonWrapper = $(document.createElement('p')).addClass('button-wrapper');
		this.buttonWrapper.append(this.doneButton);
		
		//Add all of the paragraphs to our root <div>
		this.root.append(loadingIcon, percentWrapper, barWrapper, textWrapper, this.buttonWrapper);
	}
}
