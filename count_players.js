const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:/Users/s.ferrero/Code/ProPontedecimo/ElencoCompletoAtleti_ProPonte.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);
console.log('Total players in Excel:', data.length);
console.log('Last few records:', JSON.stringify(data.slice(-5), null, 2));
