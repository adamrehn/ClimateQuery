import * as $ from 'jquery';

export enum LoadingIconColour
{
	Blue,
	White
}

export interface UILoadingIconProvider
{
	createLoadingIcon(colour : LoadingIconColour) : JQuery<HTMLElement>;
}
