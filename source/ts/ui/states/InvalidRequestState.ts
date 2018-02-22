import { UIState } from '../UIState'
import { DatasetListState } from './DatasetListState'
import { DatatypeCode, DatatypeCodeHelper } from '../../core/DatatypeCodes'
import { ValidationReport, ValidationReportItem } from '../../core/RequestValidator'
import { ValidationReportGenerator } from '../ValidationReportGenerator'
import { ReportDisplayBase } from './ReportDisplayBase'
import * as $ from 'jquery';
import * as fs from 'fs';

export class InvalidRequestState extends ReportDisplayBase
{
	//The unique identifier for this UI state
	public static identifier() {
		return 'invalid-request';
	}
	
	//Specifies the title that should be shown in the application's title bar while the state is visible
	public getTitle() {
		return 'Invalid Dataset Creation Request';
	}
	
	protected getIdentifier() : string {
		return InvalidRequestState.identifier();
	}
	
	//Returns the report title
	protected getReportTitle() : string {
		return 'Dataset Creation Request Validation Report';
	}
	
	private validationResults : ValidationReport;
	
	public onShow(...args: any[]) : void
	{
		//Generate and display the validation report
		this.validationResults = args[0];
		this.validationReport = ValidationReportGenerator.generateRequestValidationReport(this.validationResults);
		this.updateReportDisplay();
		
		//Show the state
		super.onShow();
	}
}
