import { suggestLeva } from '../src/lib/leva.ts';

function assertEqual(actual: string, expected: string, message: string) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Expected: "${expected}"`);
    console.error(`   Actual:   "${actual}"`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('Running unit tests for suggestLeva...');

// Test boundaries for season start 2026
// Piccoli Amici (age <= 6): birthYear >= 2020
assertEqual(suggestLeva(2020, 2026), 'Piccoli Amici 2020', 'Piccoli Amici boundary (age 6)');
assertEqual(suggestLeva(2021, 2026), 'Piccoli Amici 2021', 'Piccoli Amici (age 5)');

// Primi Calci (age 7-8): birthYear 2018-2019
assertEqual(suggestLeva(2019, 2026), 'Primi Calci 2019', 'Primi Calci boundary lower (age 7)');
assertEqual(suggestLeva(2018, 2026), 'Primi Calci 2018', 'Primi Calci boundary upper (age 8)');

// Pulcini (age 9-10): birthYear 2016-2017
assertEqual(suggestLeva(2017, 2026), 'Pulcini 2017', 'Pulcini boundary lower (age 9)');
assertEqual(suggestLeva(2016, 2026), 'Pulcini 2016', 'Pulcini boundary upper (age 10)');

// Esordienti (age 11-12): birthYear 2014-2015
assertEqual(suggestLeva(2015, 2026), 'Esordienti 2015', 'Esordienti boundary lower (age 11)');
assertEqual(suggestLeva(2014, 2026), 'Esordienti 2014', 'Esordienti boundary upper (age 12)');

// Giovanissimi (age 13-14): birthYear 2012-2013
assertEqual(suggestLeva(2013, 2026), 'Giovanissimi 2013', 'Giovanissimi boundary lower (age 13)');
assertEqual(suggestLeva(2012, 2026), 'Giovanissimi 2012', 'Giovanissimi boundary upper (age 14)');

// Allievi (age 15-16): birthYear 2010-2011
assertEqual(suggestLeva(2011, 2026), 'Allievi 2011', 'Allievi boundary lower (age 15)');
assertEqual(suggestLeva(2010, 2026), 'Allievi 2010', 'Allievi boundary upper (age 16)');

// Juniores (age >= 17): birthYear <= 2009
assertEqual(suggestLeva(2009, 2026), 'Juniores 2009', 'Juniores boundary lower (age 17)');
assertEqual(suggestLeva(2000, 2026), 'Juniores 2000', 'Juniores (age 26)');

// Test season parameter variation (season start 2027)
assertEqual(suggestLeva(2017, 2027), 'Pulcini 2017', 'Season 2027: birth 2017 should be Pulcini (age 10)');
assertEqual(suggestLeva(2016, 2027), 'Esordienti 2016', 'Season 2027: birth 2016 should shift to Esordienti (age 11)');

console.log('All tests passed successfully!');
