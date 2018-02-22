ClimateQuery
=============

ClimateQuery is a tool for researchers that facilitates processing and querying weather data obtained from the Australian [Bureau of Meteorology](http://www.bom.gov.au/). The primary aim of the tool is to allow researchers to extract data for specific weather stations and time periods, and then run queries against the extracted datasets to produce summarised data that is suitable for further statistical analysis.

ClimateQuery is currently designed to work with daily climate data for the following measures:

- Min/Max/Mean Temperature
- Rainfall
- Solar Exposure

**You can download the installer for the latest version of ClimateQuery from the [releases page](https://github.com/adamrehn/ClimateQuery/releases).**


Contents
--------

- [Obtaining data from the Bureau of Meteorology](#obtaining-data-from-the-bureau-of-meteorology)
- [Using ClimateQuery](#using-climatequery)
  - [Building a dataset](#building-a-dataset)
  - [Querying a dataset](#querying-a-dataset)
- [Building ClimateQuery from source](#building-climatequery-from-source)
  - [Requirements](#requirements)
  - [Build process](#build-process)
- [Legal](#legal)


Obtaining data from the Bureau of Meteorology
---------------------------------------------

ClimateQuery does not retrieve data directly from the Bureau of Meteorology. In order to use the tool, you will first need to [purchase data from BOM](http://reg.bom.gov.au/climate/data-services/charges.shtml).

When requesting data, be sure to specify the correct details in order to ensure compatibility with ClimateQuery:

- **Data must be in comma-separated values (CSV) format.** ClimateQuery does not support any other data formats.
- **Data should have a frequency of daily.** The current version of ClimateQuery is designed to work with data at a daily level of granularity, and has not been tested using finer or coarser granularities (e.g. hourly, monthly, etc.) Although the tool may potentially work with data of other granularities, there are no guarantees that it will function correctly under such conditions.

Once you have purchased the data from BOM, you should receive an archive for each climate measure. For example, if you purchased Temperature and Rainfall data for the years 2000-2018, after unzipping the ZIP files you would end up with a directory structure similar to this:

- **Daily-MMMT_2000-2018/**
  - *DC02D_**Data**_001006_999999999474923.txt*
  - *(many more files with **Data** in the name, with ascending numbers)*
  - *DC02D_**Notes**_999999999474923.txt*
  - *DC02D_**StnDet**_999999999474923.txt*
- **Daily-Rainfall_2000-2018/**
  - *DC02D_**Data**_001001_999999999474922.txt*
  - *(many more files with **Data** in the name, with ascending numbers)*
  - *DC02D_**Notes**_999999999474922.txt*
  - *DC02D_**StnDet**_999999999474922.txt*

These directories (*Daily-MMMT_2000-2018* and *Daily-Rainfall_2000-2018* in this example) are the directories that need to be specified as the data sources for their respective weather measures when building a dataset in ClimateQuery.


Using ClimateQuery
------------------

### Building a dataset

1. Open ClimateQuery. The initial screen will display a list of any existing datasets. If this is the first time running the tool then this list will be empty and simply display the text "*There are no existing datasets to display. To get started, click the "Create new dataset" button.*".
2. Click the "Create new dataset" button to run the dataset creation wizard.
3. Follow the steps of the dataset creation wizard, specifying the dataset name, weather measures, timespan, stations, and data source(s).
    - The list of stations must be provided as a CSV file with one station number per line.
    - When prompted to select the data source for each weather measure, select the directories from the archives obtained from BOM (see the section above for more details.)
4. The specified details will then be validated against the data present in the specified directories.
    - If validation fails (e.g. because a station was specified that doesn't report the desired measures for the desired time period) a validation report will be shown, providing details of mismatches between the specified details and the actual data. This report can be saved as a HTML file for reference, and can be used as a guide to adjust the dataset settings to match the actual data that you have.
	- If validation succeeds, dataset creation will begin and a progress bar will be displayed. For large archives (e.g. many thousands of data files), this process can take quite some time.
5. Once dataset creation is complete, click the "Done" button and you will be returned to the list of datasets, which will now include the newly-created dataset.
6. The list entry for the newly-created dataset will specify the percentage of data that is actually present and valid (some rows in the BOM data files may contain empty values, indicating that a station does not have a measurement for that particular day.) Datasets with less than 75% data present will be highlighted in red with a small warning icon next to them. If you hover over the list entry and click the "Data Presence Report" button, you can see a detailed breakdown of the percentage of data present for each station for each year. This report can be saved as a HTML file for reference, and can be used as a guide for identifying problematic stations and potentially rebuilding the dataset without them if their data presence percentages are unacceptably low.

### Querying a dataset

1. Open ClimateQuery. The initial screen will display a list of any existing datasets. You need to have at least one dataset to run a query against. If there are no existing datasets then you will need to build one using the steps outlined above.
2. Hover over the list entry for the dataset that you wish to query. There are two relevant buttons:
    - The "Export" button will export the entire dataset as a CSV file, without any summarisation. This is useful if you wish to perform analysis on the raw data.
	- The "Query" button will run the dataset query wizard, which will allow you to select one of ClimateQuery's built-in queries and customise it to suit your needs.
3. If you clicked the "Query" button, a list of available queries will be displayed. Only those queries that are supported by the selected dataset will be shown (e.g. rainfall queries if the dataset contains rainfall data.)
4. Click on the list entry for the query that you wish to run.
5. Follow the steps of the dataset query wizard, specifying the desired timespan, parameter values, and aggregation levels. Finally, click the "Export Query Results" button to run the query and save the results as a CSV file.


Building ClimateQuery from source
---------------------------------

**Note: building ClimateQuery from source is only necessary if you wish to change the code (e.g. to add new queries or contribute to further development of the tool.) This process is not necessary for researchers who simply want to use the tool as it is - the prebuilt installer for the latest version of ClimateQuery can be downloaded from the [releases page](https://github.com/adamrehn/ClimateQuery/releases).**


### Requirements

Building ClimateQuery from source requires [Node.js](https://nodejs.org/) version 8.0 or newer.


### Build process

First, install dependencies using:

```
npm install .
```

You can then run the application using:

```
npm run start
```

or package it using:

```
npm run dist
```

To clean the generated files, use:

```
npm run clean
```


Legal
-----

Copyright &copy; 2018, James Cook University. Licensed under the MIT License, see the file [LICENSE](./LICENSE) for details.

The development of this software was funded by a James Cook University DTES Research Block Grant.

Icon and visual design by Sayuri Nagata.
