import * as XLSX from 'xlsx';
import type { Row } from './analysis';

export function parseWorkbookBuffer(buffer:ArrayBuffer){
 const workbook=XLSX.read(buffer,{type:'array',cellDates:true});
 const isLensTemplate=['Marketing data','Example data','Instructions'].every(name=>workbook.SheetNames.includes(name));
 const dataSheets=isLensTemplate?['Marketing data']:workbook.SheetNames;
 const sheets:Record<string,Row[]>={};
 for(const name of dataSheets){
  const records=XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name],{defval:null});
  if(records.length>50000)throw new Error('Keep each sheet below 50,000 rows for this MVP.');
  sheets[name]=records;
 }
 const sheet=dataSheets.find(name=>sheets[name].length>0);
 if(!sheet)throw new Error(isLensTemplate?'The template is empty. Enter your figures in Marketing data starting at row 2, save it, then upload again.':'No data rows found. Include a header row and at least one data row.');
 return {sheets,sheet,rows:sheets[sheet],isLensTemplate};
}
