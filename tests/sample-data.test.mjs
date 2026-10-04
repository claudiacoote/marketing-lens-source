import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import canonicalRows from '../data/sample-marketing-data.json' with { type: 'json' };
import { analyse, dateValue, infer, profiles, sampleRows } from '../lib/analysis.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const templatePath = new URL('../public/templates/lens-marketing-data-template.xlsx', import.meta.url);
const expected = {
  '2026-09': { Revenue: 128035, Spend: 27967, Customers: 403, Pipeline: 230463, Leads: 1128, MQLs: 767, SQLs: 565, Conversions: 403, Impressions: 865000, Clicks: 30713 },
  '2026-08': { Revenue: 122046, Spend: 27132, Customers: 377, Pipeline: 219683, Leads: 1055, MQLs: 717, SQLs: 527, Conversions: 377, Impressions: 865000, Clicks: 30030 },
};

function monthRows(rows, month) {
  return rows.filter(row => dateValue(row.Date)?.toISOString().slice(0, 7) === month);
}

function sums(rows) {
  return Object.fromEntries(Object.keys(expected['2026-09']).map(key => [key, rows.reduce((total, row) => total + (Number(row[key]) || 0), 0)]));
}

test('the demo consumes the canonical 36-row sample dataset', () => {
  assert.deepEqual(sampleRows, canonicalRows);
  assert.deepEqual([...new Set(sampleRows.map(row => row.Date.slice(0, 7)))], ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']);
  assert.deepEqual([...new Set(sampleRows.map(row => row.Channel))].sort(), ['Email', 'Organic', 'Paid search', 'Paid social']);

  for (const month of Object.keys(expected)) {
    const rows = monthRows(sampleRows, month);
    assert.deepEqual(sums(rows), expected[month]);
  }
  const septemberSocial = monthRows(sampleRows, '2026-09').filter(row => row.Channel === 'Paid social');
  assert.equal(septemberSocial.reduce((sum, row) => sum + row.Revenue, 0), 17400);
  assert.equal(monthRows(sampleRows, '2026-09').filter(row => row.Channel === 'Paid search').reduce((sum, row) => sum + row.Revenue, 0), 67425);
  assert.equal(monthRows(sampleRows, '2026-09').filter(row => row.Channel === 'Email').reduce((sum, row) => sum + row.Revenue, 0), 29290);
});

test('the generated workbook example sheet round-trips through the upload parser', () => {
  const workbook = XLSX.readFile(new URL(templatePath), { cellDates: true });
  assert.deepEqual(workbook.SheetNames, ['Marketing data', 'Example data', 'Instructions']);
  const templateRows = XLSX.utils.sheet_to_json(workbook.Sheets['Marketing data'], { defval: null });
  assert.equal(templateRows.length, 0, 'the user input sheet should remain blank');

  const uploadedRows = XLSX.utils.sheet_to_json(workbook.Sheets['Example data'], { defval: null });
  assert.equal(uploadedRows.length, canonicalRows.length);
  for (let index = 0; index < canonicalRows.length; index += 1) {
    const canonical = canonicalRows[index];
    const uploaded = uploadedRows[index];
    for (const key of Object.keys(canonical)) {
      if (key === 'Date') assert.equal(dateValue(uploaded[key]).toISOString().slice(0, 10), canonical[key]);
      else assert.equal(uploaded[key] ?? '', canonical[key] ?? '', `${key} at example row ${index + 2}`);
    }
    for (const key of ['Region', 'Product', 'Reach', 'Gross profit', 'Budget', 'Email opens', 'Website traffic']) {
      assert.equal(uploaded[key] ?? '', '', `${key} must remain unavailable`);
    }
  }

  for (const month of Object.keys(expected)) assert.deepEqual(sums(monthRows(uploadedRows, month)), expected[month]);
  const mapping = infer(uploadedRows);
  const appAnalysis = analyse(uploadedRows, mapping, profiles[0]);
  assert.equal(appAnalysis.currentPeriod, '2026-09');
  assert.equal(appAnalysis.previousPeriod, '2026-08');
  assert.equal(appAnalysis.current.values.revenue, 128035);
  assert.equal(appAnalysis.current.values.spend, 27967);
  assert.equal(appAnalysis.current.values.roas, 128035 / 27967);
  const expectedChanges = { revenue: 4.9, customers: 6.9, pipeline: 4.9, roas: 1.8, leads: 6.9, spend: 3.1, sqls: 7.2, mqls: 7.0, conversions: 6.9 };
  for (const [metric, change] of Object.entries(expectedChanges)) {
    const actual = appAnalysis.metrics.find(item => item.key === metric)?.change;
    assert.ok(actual !== undefined && actual !== null && Math.abs(actual - change) < 0.15, `${metric} change was ${actual}%`);
  }
});

