import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { parseWorkbookBuffer } from '../lib/uploads.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
function workbookBuffer(sheets) {
  const book = XLSX.utils.book_new();
  for (const [name, rows] of sheets) XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name);
  const bytes = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test('Lens templates analyse Marketing data only and preserve the helpful empty-template error', () => {
  const headers = ['Date','Channel','Platform','Spend','Revenue','Leads','SQLs','Customers','Pipeline'];
  const buffer = workbookBuffer([
    ['Marketing data', [headers, ['2026-09-05','Paid social','Meta',4065,16450,176,68,44,29000]]],
    ['Example data', [headers, ['2026-09-30','Paid social','Decoy',999999,999999,999999,999999,999999,999999]]],
    ['Instructions', [['Guidance only'], ['Not report data']]],
  ]);
  const parsed = parseWorkbookBuffer(buffer);
  assert.equal(parsed.isLensTemplate, true);
  assert.equal(parsed.sheet, 'Marketing data');
  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].Revenue, 16450);
  assert.deepEqual(Object.keys(parsed.sheets), ['Marketing data']);

  const empty = XLSX.readFile(new URL('../public/templates/lens-marketing-data-template.xlsx', import.meta.url));
  const emptyBytes = new Uint8Array(XLSX.write(empty, { type: 'array', bookType: 'xlsx' }));
  const emptyBuffer = emptyBytes.buffer.slice(emptyBytes.byteOffset, emptyBytes.byteOffset + emptyBytes.byteLength);
  assert.throws(() => parseWorkbookBuffer(emptyBuffer), /The template is empty\. Enter your figures in Marketing data/);
});

test('ordinary workbooks keep all sheets and select the first non-empty sheet', () => {
  const parsed = parseWorkbookBuffer(workbookBuffer([
    ['Read me', [['Notes'], ['Not data']]],
    ['Export', [['Date','Revenue'], ['2026-08-31', 12500]]],
    ['Archive', [['Date','Revenue'], ['2026-07-31', 10000]]],
  ]));
  assert.equal(parsed.isLensTemplate, false);
  assert.equal(parsed.sheet, 'Read me');
  assert.deepEqual(Object.keys(parsed.sheets), ['Read me','Export','Archive']);
  assert.equal(parsed.rows.length, 1);
});
