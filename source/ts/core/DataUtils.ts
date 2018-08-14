export class DataUtils
{
	//Helper function to retrieve a column from a 2D array
	public static extractColumn(arr : any[][], colIndex : number) {
		return arr.map((elem) => { return elem[colIndex]; });
	}
}
