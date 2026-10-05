import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, unzipSync } from 'fflate';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workbookPath = path.join(projectRoot, 'public/templates/lens-marketing-data-template.xlsx');
const sampleRows = JSON.parse(await readFile(path.join(projectRoot, 'data/sample-marketing-data.json'), 'utf8'));
const headers = ['Date', 'Channel', 'Platform', 'Placement', 'Campaign', 'Campaign ID', 'Creative', 'Region', 'Product', 'Spend', 'Revenue', 'Impressions', 'Reach', 'Clicks', 'Leads', 'MQLs', 'SQLs', 'Conversions', 'Customers', 'Pipeline', 'Gross profit', 'Budget', 'Email opens', 'Website traffic'];

if (sampleRows.length > 100) throw new Error('The example data sheet is prepared for up to 100 records.');

const entries = unzipSync(new Uint8Array(await readFile(workbookPath)));
const decode = bytes => new TextDecoder().decode(bytes);
const encode = text => new TextEncoder().encode(text);
const workbookXml = decode(entries['xl/workbook.xml']);
const relationshipsXml = decode(entries['xl/_rels/workbook.xml.rels']);
const exampleSheet = workbookXml.match(/<(?:[\w.-]+:)?sheet\b[^>]*\bname="Example data"[^>]*>/)?.[0];
const relationshipId = exampleSheet?.match(/\br:id="([^"]+)"/)?.[1];
const relationship = relationshipId && [...relationshipsXml.matchAll(/<Relationship\b[^>]*\/>/g)].map(match => match[0]).find(tag => tag.includes(`Id="${relationshipId}"`));
const target = relationship?.match(/\bTarget="([^"]+)"/)?.[1];
if (!target) throw new Error('Could not locate the Example data worksheet in the workbook.');
const normalizedTarget = target.replace(/^\/+/, '');
const worksheetPath = normalizedTarget.startsWith('xl/') ? normalizedTarget : path.posix.join('xl', normalizedTarget);
const worksheetXml = decode(entries[worksheetPath]);
const prefix = worksheetXml.match(/<(?:[\w.-]+:)?worksheet/)?.[0].match(/<([\w.-]+:)/)?.[1] ?? '';
const sheetDataMatch = worksheetXml.match(/<(?:[\w.-]+:)?sheetData(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w.-]+:)?sheetData>/);
if (!sheetDataMatch) throw new Error('Could not locate the Example data rows.');
const originalRows = [...sheetDataMatch[0].matchAll(/<(?:[\w.-]+:)?row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?row>/g)];
const headerRow = originalRows.find(([, rowNumber]) => rowNumber === '1')?.[0];
const styleRow = originalRows.find(([, rowNumber]) => rowNumber === '2')?.[0];
if (!headerRow || !styleRow) throw new Error('The workbook needs its existing header and formatted example row.');

const columnNumber = letters => [...letters].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
const columnName = number => {
  let name = '';
  while (number > 0) {
    number -= 1;
    name = String.fromCharCode(65 + number % 26) + name;
    number = Math.floor(number / 26);
  }
  return name;
};
const styles = new Map();
for (const [, attrs] of styleRow.matchAll(/<(?:[\w.-]+:)?c\b([^>]*)\/?\s*>/g)) {
  const address = attrs.match(/\br="([A-Z]+)2"/)?.[1];
  const style = attrs.match(/\bs="([^"]+)"/)?.[1];
  if (address && style) styles.set(columnNumber(address), style);
}
const rowAttrs = styleRow.match(/^<(?:[\w.-]+:)?row\b([^>]*)>/)?.[1] ?? '';
const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const serialDate = value => {
  const [year, month, day] = value.split('-').map(Number);
  return (Date.UTC(year, month - 1, day) - Date.UTC(1899, 11, 30)) / 86400000;
};
const rows = [headerRow];
for (let rowNumber = 2; rowNumber <= 101; rowNumber += 1) {
  const record = sampleRows[rowNumber - 2];
  const cells = headers.map((header, index) => {
    const column = index + 1;
    const ref = `${columnName(column)}${rowNumber}`;
    const style = styles.has(column) ? ` s="${styles.get(column)}"` : '';
    let value = record?.[header];
    if (header === 'Date' && value) value = serialDate(value);
    if (value === undefined || value === null || value === '') return `<${prefix}c r="${ref}"${style}/>`;
    if (typeof value === 'number') return `<${prefix}c r="${ref}"${style} t="n"><${prefix}v>${value}</${prefix}v></${prefix}c>`;
    return `<${prefix}c r="${ref}"${style} t="inlineStr"><${prefix}is><${prefix}t>${xmlEscape(value)}</${prefix}t></${prefix}is></${prefix}c>`;
  }).join('');
  rows.push(`<${prefix}row${rowAttrs.replace(/\br="\d+"/, `r="${rowNumber}"`)}>${cells}</${prefix}row>`);
}
const updatedSheetData = `<${prefix}sheetData>${rows.join('')}</${prefix}sheetData>`;
entries[worksheetPath] = encode(worksheetXml.replace(sheetDataMatch[0], updatedSheetData));
await writeFile(workbookPath, zipSync(entries, { level: 6 }));
console.log(`Updated Example data with ${sampleRows.length} canonical sample records.`);
