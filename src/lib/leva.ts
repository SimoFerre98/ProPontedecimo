/**
 * Suggerisce la categoria della leva (settore giovanile FIGC) in base all'anno di nascita dell'atleta
 * e all'anno di inizio della nuova stagione.
 * 
 * Regole FIGC (basate sull'età solare nell'anno di inizio stagione):
 * - Piccoli Amici: <= 6 anni (es. nati nel 2020 o successivi per stagione 2026/2027)
 * - Primi Calci: 7-8 anni (es. nati nel 2018-2019 per stagione 2026/2027)
 * - Pulcini: 9-10 anni (es. nati nel 2016-2017 per stagione 2026/2027)
 * - Esordienti: 11-12 anni (es. nati nel 2014-2015 per stagione 2026/2027)
 * - Giovanissimi: 13-14 anni (es. nati nel 2012-2013 per stagione 2026/2027)
 * - Allievi: 15-16 anni (es. nati nel 2010-2011 per stagione 2026/2027)
 * - Juniores: >= 17 anni (es. nati nel 2009 o precedenti per stagione 2026/2027)
 */
export function suggestLeva(birthYear: number, seasonStartYear: number): string {
  const age = seasonStartYear - birthYear;
  let category = '';

  if (age <= 6) {
    category = 'Piccoli Amici';
  } else if (age <= 8) {
    category = 'Primi Calci';
  } else if (age <= 10) {
    category = 'Pulcini';
  } else if (age <= 12) {
    category = 'Esordienti';
  } else if (age <= 14) {
    category = 'Giovanissimi';
  } else if (age <= 16) {
    category = 'Allievi';
  } else {
    category = 'Juniores';
  }

  return `${category} ${birthYear}`;
}
