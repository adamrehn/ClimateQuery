import { DatatypeCode, DatatypeCodeHelper } from '../core/DatatypeCodes'
import { DatasetGranularityHelper, DatasetGranularity } from '../core/DatasetGranularities';
import { ValidationReport, ValidationReportItem } from '../core/RequestValidator'
import { DataRequest } from '../core/DataRequest'
import * as numeral from 'numeral';
import * as $ from 'jquery';
import * as fs from 'fs';

export class ValidationReportGenerator
{
	//Generates a HTML-formatted report representing a request validation result
	public static generateRequestValidationReport(validationResults : ValidationReport)
	{
		//Create the root element of the report
		let report = $(document.createElement('div'));
		
		//Append the top-level heading
		report.append($(document.createElement('h1')).text('Dataset Creation Request Validation Report'));
		
		//Append the basic request details
		report.append($(document.createElement('h2')).text('Request Details'));
		report.html(report.html() + `
			<p><strong>Start Year:</strong> ${validationResults.request.startYear}</p>
			<p><strong>End Year:</strong> ${validationResults.request.endYear}</p>
		`);
		
		//Append the list of request datatypes and their granularities
		report.html(report.html() + `<p><strong>Measurements and granularities:</strong></p>`);
		let datatypesList = $(document.createElement('ul'));
		let dtypeListItems = validationResults.request.datatypeCodes.map((code : DatatypeCode) => {
			return $(document.createElement('li')).html(DatatypeCodeHelper.toString(code) + ' (<strong>Granularity:</strong> ' + DatasetGranularityHelper.toString(<DatasetGranularity>validationResults.granularities.get(code)) + ')');
		});
		datatypesList.append(...dtypeListItems);
		report.append(datatypesList);
		
		//If multiple granularities were present, flag this
		let uniqueGranularities = new Set<DatasetGranularity>(validationResults.granularities.values());
		if (uniqueGranularities.size > 1) {
			report.html(report.html() + `<p class="error">Multiple granularities detected! A dataset can only have a single granularity.</p>`);
		}
		
		//Append the list of request stations
		report.html(report.html() + `<p><strong>Stations:</strong></p>`);
		let stationsList = $(document.createElement('ul')).addClass('report-stations-list');
		let stationListItems = validationResults.request.stations.map((station : number) => {
			return $(document.createElement('li')).text(station);
		});
		stationsList.append(...stationListItems);
		report.append(stationsList);
		
		//For each datatype, determine which stations did not support it
		validationResults.request.datatypeCodes.forEach((code : DatatypeCode) =>
		{
			//Filter the validation report items to isolate the stations that didn't support this datatype
			let unsupportedStations = validationResults.details.filter((item : ValidationReportItem) => {
				return (item.supported === false && item.datatype == code);
			});
			
			//If there was at least one non-supporting station, add the details to the report
			if (unsupportedStations.length > 0)
			{
				//Append the section heading
				let sectionHeading = $(document.createElement('h2'));
				sectionHeading.text(
					`Stations that do not report ${DatatypeCodeHelper.toString(code)}
					for the period ${validationResults.request.startYear} -
					${validationResults.request.endYear}`
				);
				report.append(sectionHeading);
				
				//Append the list of stations
				let unsupportedStationsList = $(document.createElement('ul'));
				let unsupportedstationListItems = unsupportedStations.map((item : ValidationReportItem) =>
				{
					//Determine if the station supports the datatype at all, and during which time period
					let stationText = item.station.toString();
					if (item.start != 0 && item.end != 0) {
						stationText += ` (Reports measurement from ${item.start} to ${item.end})`;
					}
					else {
						stationText += ' (Does not report measurement)';
					}
					
					return $(document.createElement('li')).text(stationText);
				});
				unsupportedStationsList.append(...unsupportedstationListItems);
				report.append(unsupportedStationsList);
			}
		});
		
		return report;
	}
	
	//Generates a HTML-formatted report representing a dataset data presence query result
	public static generateDataPresenceReport(request : DataRequest, presenceResults : Map<number, Map<number, number>>)
	{
		//Create the root element of the report
		let report = $(document.createElement('div'));
		
		//Append the top-level heading
		report.append($(document.createElement('h1')).text('Dataset Data Presence Report'));
		
		//Append the basic request details
		report.append($(document.createElement('h2')).text('Request Details'));
		report.html(report.html() + `
			<p><strong>Start Year:</strong> ${request.startYear}</p>
			<p><strong>End Year:</strong> ${request.endYear}</p>
		`);
		
		//Append the list of request datatypes
		report.html(report.html() + `<p><strong>Measurements:</strong></p>`);
		let datatypesList = $(document.createElement('ul'));
		let dtypeListItems = request.datatypeCodes.map((code : DatatypeCode) => {
			return $(document.createElement('li')).text(DatatypeCodeHelper.toString(code));
		});
		datatypesList.append(...dtypeListItems);
		report.append(datatypesList);
		
		//Append the list of request stations
		report.html(report.html() + `<p><strong>Stations:</strong></p>`);
		let stationsList = $(document.createElement('ul')).addClass('report-stations-list');
		let stationListItems = request.stations.map((station : number) => {
			return $(document.createElement('li')).text(station);
		});
		stationsList.append(...stationListItems);
		report.append(stationsList);
		
		//Build the table containing the data presence results
		report.append($(document.createElement('h2')).text('Data Presence Percentages'));
		let numYears = (request.endYear - request.startYear) + 1;
		let years = (new Array(numYears)).fill(0).map((v : any, index : number) => { return request.startYear + index; });
		let presenceTable = $(document.createElement('table')).addClass('presence-table');
		let thead = $(document.createElement('thead'));
		let tbody = $(document.createElement('tbody'));
		let header = $(document.createElement('tr'));
		header.append($(document.createElement('th')).text('Station'));
		years.forEach((year : number) => {
			header.append($(document.createElement('th')).text(year));
		});
		presenceResults.forEach((mappings : Map<number,number>, station : number) =>
		{
			let row = $(document.createElement('tr'));
			row.append($(document.createElement('td')).text(station));
			years.forEach((year : number) =>
			{
				let percent = numeral(<number>(mappings.get(year)));
				row.append($(document.createElement('td')).text(percent.format('00.00') + '%'));
			});
			tbody.append(row);
		});
		thead.append(header);
		presenceTable.append(thead, tbody);
		report.append(presenceTable);
		
		return report;
	}
}
