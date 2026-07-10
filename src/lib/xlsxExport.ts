import * as XLSX from 'xlsx'

/**
 * Esporta un array di oggetti (righe) in un file Excel (.xlsx) usando SheetJS.
 * 
 * @param rows Array di oggetti con le chiavi corrispondenti alle intestazioni (es. in italiano)
 * @param filename Nome del file salvato (es. 'esportazione_atleti.xlsx')
 * @param sheetName Nome del foglio di calcolo (default: 'Dati')
 */
export function exportToXlsx(rows: Record<string, unknown>[], filename: string, sheetName: string = 'Dati') {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, filename)
}
