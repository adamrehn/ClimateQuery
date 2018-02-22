export interface UIStateTransitionHandler
{
	setState(newState : string, ...extraArgs : any[]) : void;
}
