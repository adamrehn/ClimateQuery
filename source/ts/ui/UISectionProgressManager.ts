import { EventEmitter } from 'events';
import * as $ from 'jquery';

class Section
{
	public constructor(name : string, elem : JQuery<HTMLElement>)
	{
		this.name = name;
		this.elem = elem;
	}
	
	public name : string;
	public elem : JQuery<HTMLElement>;
}

export class UISectionProgressManager
{
	private events : EventEmitter;
	private root : JQuery<HTMLElement>;
	private sections : Section[];
	private selectedIndex : number;
	private progressDisplay : JQuery<HTMLElement>;
	private backButton : JQuery<HTMLElement>;
	private nextButton : JQuery<HTMLElement>;
	
	public constructor(sectionContainer : JQuery<HTMLElement>)
	{
		//Create our event emitter
		this.events = new EventEmitter();
		
		//Process each of the <section> tags inside the section container
		this.root = sectionContainer;
		this.sections = [];
		let candidates = $('section', this.root);
		candidates.each((index : number, elem : HTMLElement) =>
		{
			//Identify the section name (if any)
			let sectionElem = $(elem);
			let sectionName : string = sectionElem.data('section-name') || `Step ${index+1}`;
			
			//Add the section to our list
			this.sections.push(new Section(sectionName, sectionElem));
		});
		
		//Create the progress display
		this.progressDisplay = $(document.createElement('div')).addClass('section-progress-display');
		for (let section of this.sections)
		{
			let progressItem = $(document.createElement('div')).addClass('progress-item');
			progressItem.append($(document.createElement('div')).addClass('highlight-circle'));
			progressItem.append($(document.createElement('p')).addClass('section-name').text(section.name));
			this.progressDisplay.append(progressItem);
		}
		this.root.prepend(this.progressDisplay);
		
		//Create the back and forward buttons
		this.backButton = $(document.createElement('button')).addClass('white').addClass('section-previous').html('<img src="./images/arrow-left.svg">').attr('title', 'Previous Step');
		this.nextButton = $(document.createElement('button')).addClass('white').addClass('section-next').html('<img src="./images/arrow-right.svg">').attr('title', 'Next Step');
		let buttonWrapper = $(document.createElement('div')).addClass('section-nav-wrapper');
		buttonWrapper.append(this.backButton, this.nextButton);
		this.root.append(buttonWrapper);
		
		//Wire up the click events for the back and forward buttons
		this.backButton.click(() => { this.previousSection() });
		this.nextButton.click(() => { this.nextSection(); });
		
		//Display the first section
		this.displaySection(0);
	}
	
	//Registers an event handler for when we change sections
	public onSectionChange(handler : (...args : any[]) => void)
	{
		//Register the event handler
		this.events.on('section-change', handler);
		
		//Emit an event with the current section details
		this.events.emit('section-change', this.selectedIndex, this.sections[this.selectedIndex].name);
	}
	
	//Enables or disables the forward button based on a boolean
	public setProgressEnabled(enabled : boolean)
	{
		if (enabled === true) {
			this.enableProgress();
		}
		else {
			this.disableProgress();
		}
	}
	
	//Enables the forward button
	public enableProgress()
	{
		//Enable the forward button only if we are not displaying the final section
		if (this.selectedIndex < this.sections.length - 1) {
			this.nextButton.removeAttr('disabled');
		}
	}
	
	//Disables the forward button
	public disableProgress() {
		this.nextButton.attr('disabled', 'disabled');
	}
	
	//Progresses forward to the next section
	public nextSection()
	{
		let targetIndex = this.selectedIndex + 1;
		if (targetIndex < this.sections.length) {
			this.displaySection(targetIndex);
		}
	}
	
	//Moves back to the previous section
	public previousSection()
	{
		let targetIndex = this.selectedIndex - 1;
		if (targetIndex >= 0) {
			this.displaySection(targetIndex);
		}
	}
	
	private displaySection(index : number)
	{
		//Hide all of the other sections
		for (let section of this.sections) {
			section.elem.hide();
		}
		
		//Show the requested section
		this.selectedIndex = index;
		this.sections[this.selectedIndex].elem.show();
		
		//Update the progress display
		let progressCircles = $('.progress-item .highlight-circle', this.progressDisplay);
		progressCircles.removeClass('highlighted');
		$(progressCircles[this.selectedIndex]).addClass('highlighted');
		
		//Disable the back button if this is the first section
		if (this.selectedIndex == 0) {
			this.backButton.attr('disabled', 'disabled');
		}
		else {
			this.backButton.removeAttr('disabled');
		}
		
		//Disable the forward button if this is the final section
		if (this.selectedIndex == this.sections.length - 1) {
			this.nextButton.attr('disabled', 'disabled');
		}
		else {
			this.nextButton.removeAttr('disabled');
		}
		
		//Emit a section change event
		this.events.emit('section-change', this.selectedIndex, this.sections[this.selectedIndex].name);
	}
}
