import { UIState } from '../UIState'
import { Dataset } from '../../core/Dataset'
import { DatasetListState } from './DatasetListState'
import { DatatypeCode, DatatypeCodeHelper } from '../../core/DatatypeCodes'
import { ValidationReport, ValidationReportItem } from '../../core/RequestValidator'
import { ValidationReportGenerator } from '../ValidationReportGenerator'
import { DatasetManager } from '../../core/DatasetManager';
import { ReportDisplayBase } from './ReportDisplayBase';
import * as $ from 'jquery';
import * as fs from 'fs';

export class PresenceReportState extends ReportDisplayBase
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'presence-report';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Dataset Data Presence Report';
	}
	
	protected getIdentifier() : string {
		return PresenceReportState.identifier();
	}
	
	//Returns the report title
	protected getReportTitle() : string {
		return 'Dataset Data Presence Report';
	}
	
	public onShow(...args: any[]) : void
	{
		//Generate the presence report
		let dataset : Dataset = <Dataset>(args[0]['dataset']);
		this.controller.getDatasetManager().generatePresenceReport(dataset).then((presenceReport : Map<number, Map<number, number>>) =>
		{
			//Display the presence report
			this.validationReport = ValidationReportGenerator.generateDataPresenceReport(dataset.request, presenceReport);
			this.updateReportDisplay();
			
			//Show the state
			super.onShow();
		})
		.catch((err : Error) => {
			this.errorHandler.handleError(err);
		});
	}
}
