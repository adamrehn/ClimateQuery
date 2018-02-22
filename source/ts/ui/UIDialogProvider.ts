export interface UIDialogProvider
{
	showMessage(message : string) : Promise<any>;
	showConfirmDialog(message : string, confirmButtonLabel : string) : Promise<boolean>;
	showOpenDialog(title : string, filters : any[], chooseDirs? : boolean) : Promise<string[]>;
	showSaveDialog(title : string, filters : any[]) : Promise<string>;
}
