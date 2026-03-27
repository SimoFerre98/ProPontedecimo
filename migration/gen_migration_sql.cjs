const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('ElencoCompletoAtleti_ProPonte.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

const SEASON_ID = '42c0cb34-a798-4819-9976-74ec144d8d14';

function excelDateToISO(serial) {
  if (!serial) return null;
  if (typeof serial === 'string') {
    // Prova a parsare formato DD/MM/YYYY
    const parts = serial.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return serial;
  }
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

let sql = `INSERT INTO players (
  legacy_id, last_name, first_name, team_sector, birth_date, birth_place, 
  tax_code, address_street, address_locality, address_city, address_zip, 
  phone_home, parent1_name, parent1_phone, parent2_name, parent2_phone, 
  medical_expiry, figc_registration, notes, season_id, is_active
) VALUES \n`;

const values = data.map(row => {
  const legacy_id = row['ID'] || 'NULL';
  const last_name = `'${(row['Cognome'] || '').replace(/'/g, "''")}'`;
  const first_name = `'${(row['Nome'] || '').replace(/'/g, "''")}'`;
  const team_sector = row['Settore/Leva'] ? `'${row['Settore/Leva'].replace(/'/g, "''")}'` : 'NULL';
  const birth_date = row['Data di nascita'] ? `'${excelDateToISO(row['Data di nascita'])}'` : 'NULL';
  const birth_place = row['Luogo di nascita'] ? `'${row['Luogo di nascita'].replace(/'/g, "''")}'` : 'NULL';
  const tax_code = row['Codice fiscale'] ? `'${row['Codice fiscale'].replace(/'/g, "''")}'` : 'NULL';
  const address_street = row['Indirizzo'] ? `'${row['Indirizzo'].replace(/'/g, "''")}'` : 'NULL';
  const address_locality = row['Località'] ? `'${row['Località'].replace(/'/g, "''")}'` : 'NULL';
  const address_city = row['Città'] ? `'${row['Città'].replace(/'/g, "''")}'` : 'NULL';
  const address_zip = row['CAP'] ? `'${row['CAP']}'` : 'NULL';
  const phone_home = row['Telefono Casa'] ? `'${row['Telefono Casa']}'` : 'NULL';
  const parent1_name = row['Telefono Papà'] ? "'Papà'" : 'NULL';
  const parent1_phone = row['Telefono Papà'] ? `'${row['Telefono Papà']}'` : 'NULL';
  const parent2_name = row['Telefono Mamma'] ? "'Mamma'" : 'NULL';
  const parent2_phone = row['Telefono Mamma'] ? `'${row['Telefono Mamma']}'` : 'NULL';
  const medical_expiry = row['Scadenza visita medica'] ? `'${excelDateToISO(row['Scadenza visita medica'])}'` : 'NULL';
  const figc_registration = row['Matricola FIGC'] ? `'${row['Matricola FIGC']}'` : 'NULL';
  const notes = row['Note'] ? `'${row['Note'].replace(/'/g, "''")}'` : 'NULL';
  
  return `(${legacy_id}, ${last_name}, ${first_name}, ${team_sector}, ${birth_date}, ${birth_place}, ${tax_code}, ${address_street}, ${address_locality}, ${address_city}, ${address_zip}, ${phone_home}, ${parent1_name}, ${parent1_phone}, ${parent2_name}, ${parent2_phone}, ${medical_expiry}, ${figc_registration}, ${notes}, '${SEASON_ID}', true)`;
});

sql += values.join(',\n') + ';';

fs.writeFileSync('migration.sql', sql);
console.log('Migration SQL generated in migration.sql');
