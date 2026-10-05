import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyse, dateValue, infer, profiles } from '../lib/analysis.ts';

const monthly = [
  { Date: '2026-06-30', Channel: 'Paid social', Platform: 'Meta', Placement: 'Facebook', Campaign: 'Prospecting', Spend: 22000, Revenue: 80000, Impressions: 900000, Clicks: 43000, Leads: 930, MQLs: 570, SQLs: 340, Conversions: 300, Customers: 223, Pipeline: 145000 },
  { Date: '2026-07-31', Channel: 'Paid social', Platform: 'Meta', Placement: 'Facebook', Campaign: 'Prospecting', Spend: 23000, Revenue: 85000, Impressions: 950000, Clicks: 46000, Leads: 980, MQLs: 590, SQLs: 360, Conversions: 318, Customers: 240, Pipeline: 155000 },
  { Date: '2026-08-31', Channel: 'Paid social', Platform: 'Meta', Placement: 'Facebook', Campaign: 'Prospecting', Spend: 24300, Revenue: 95000, Impressions: 1000000, Clicks: 49000, Leads: 1026, MQLs: 620, SQLs: 399, Conversions: 340, Customers: 258, Pipeline: 167000 },
  { Date: '2026-09-05', Channel: 'Paid social', Platform: 'Meta', Placement: 'Facebook', Campaign: 'Prospecting', Spend: 4065, Revenue: 16450, Impressions: 170000, Clicks: 8500, Leads: 176, MQLs: 109, SQLs: 68, Conversions: 59, Customers: 44, Pipeline: 29000 },
];

test('partial month-end reporting is excluded from every stakeholder headline comparison', () => {
  const results = profiles.map(profile => [profile.id, analyse(monthly, infer(monthly), profile)]);
  const reference = results[0][1];
  for (const [id, result] of results) {
    assert.equal(result.currentPeriod, '2026-08', `${id} current headline period`);
    assert.equal(result.previousPeriod, '2026-07', `${id} comparison period`);
    assert.equal(result.current.values.revenue, 95000);
    assert.equal(result.previous.values.revenue, 85000);
    assert.equal(result.current.values.spend, 24300);
    assert.equal(result.metrics.find(metric => metric.key === 'revenue')?.value, reference.metrics.find(metric => metric.key === 'revenue')?.value);
    assert.equal(result.metrics.find(metric => metric.key === 'revenue')?.change, reference.metrics.find(metric => metric.key === 'revenue')?.change);
    assert.equal(result.trend.at(-1).period, '2026-09');
    assert.equal(result.trend.at(-1).status, 'partial');
    assert.match(result.issues.join(' '), /2026-09 data is incomplete through 5 September/);
    assert.equal(result.partialComparison, null, 'monthly August total cannot be split into September-equivalent daily dates');
    assert.equal(result.metrics.find(metric => metric.key === 'revenue')?.absoluteChange, 10000);
  }
  const sales = results.find(([id]) => id === 'sales')[1];
  assert.equal(sales.current.values.leadToSql, 399 / 1026 * 100);
  assert.equal(sales.previous.values.leadToSql, 360 / 980 * 100);
  assert.equal(sales.current.values.leadToMql, 620 / 1026 * 100);
  assert.equal(sales.current.values.mqlToSql, 399 / 620 * 100);
  assert.equal(sales.current.values.sqlToConversion, 340 / 399 * 100);
  assert.equal(sales.current.values.conversionToCustomer, 258 / 340 * 100);
  assert.equal(sales.current.values.leadToCustomer, 258 / 1026 * 100);
  assert.equal(sales.current.values.pipelinePerCustomer, 167000 / 258);
  assert.match(sales.current.formulas.sqlToConversion, /Conversions ÷ Sales-qualified leads × 100/);
  assert.match(sales.current.formulas.conversionToCustomer, /New customers ÷ Conversions × 100/);
  assert.ok(sales.compoundInsights.some(insight => insight.id === 'lead-to-sql-improving'));
  assert.ok(sales.compoundInsights.some(insight => insight.id === 'mql-to-sql-improving'));
  assert.ok(sales.compoundInsights[0].category === 'sales-funnel', 'Sales Director prioritises funnel relationships');
  assert.equal(sales.rankKey, 'leads', 'Sales Director keeps lead volume as its primary isolated KPI');
  assert.ok(results.find(([id]) => id === 'ceo')[1].compoundInsights[0].id !== sales.compoundInsights[0].id, 'stakeholder changes compound-insight ranking');
  assert.ok(!results.flatMap(([, result]) => result.findings).some(finding => /commercial direction and sustainability of growth|efficiency of investment and financial exposure|volume or quality of demand available to sales/.test(finding.why)));
});

test('period ratios are recalculated from aggregated counts, and invalid dates are surfaced', () => {
  const rows = [
    { Date: '2026-07-31', Spend: 100, Revenue: 300, Impressions: 1000, Clicks: 90, CTR: 9 },
    { Date: '2026-07-31', Spend: 100, Revenue: 200, Impressions: 10000, Clicks: 10, CTR: 0.1 },
    { Date: '2026-08-31', Spend: 100, Revenue: 300, Impressions: 1000, Clicks: 60, CTR: 6 },
    { Date: '2026-08-31', Spend: 100, Revenue: 200, Impressions: 1000, Clicks: 40, CTR: 4 },
    { Date: '2026-02-31', Spend: 1, Revenue: 1, Impressions: 1, Clicks: 1, CTR: 100 },
    { Date: '', Spend: 1, Revenue: 1, Impressions: 1, Clicks: 1, CTR: 100 },
  ];
  const analysis = analyse(rows, infer(rows), profiles[1]);
  assert.equal(analysis.currentPeriod, '2026-08');
  assert.equal(analysis.previousPeriod, '2026-07');
  assert.equal(analysis.current.values.ctr, 5);
  assert.equal(analysis.previous.values.ctr, 100 / 11000 * 100);
  assert.notEqual(analysis.current.values.ctr, (6 + 4 + 100) / 3);
  assert.match(analysis.issues.join(' '), /invalid or unsupported date/);
  assert.match(analysis.issues.join(' '), /no date/);
  assert.equal(dateValue('2026-02-31'), null);
});

test('daily data permits a like-for-like partial comparison only when both periods contain every day', () => {
  const daily = [];
  for (let day = 1; day <= 31; day += 1) daily.push({ Date: `2026-08-${String(day).padStart(2, '0')}`, Spend: 100, Revenue: 300, Clicks: 10, Impressions: 1000, Leads: 2, SQLs: 1, Customers: 1 });
  for (let day = 1; day <= 5; day += 1) daily.push({ Date: `2026-09-${String(day).padStart(2, '0')}`, Spend: 100, Revenue: 350, Clicks: 10, Impressions: 1000, Leads: 2, SQLs: 1, Customers: 1 });
  const result = analyse(daily, infer(daily), profiles.find(profile => profile.id === 'sales'));
  assert.equal(result.currentPeriod, '2026-08');
  assert.equal(result.previousPeriod, undefined);
  assert.equal(result.partialComparison.currentPeriod, '2026-09');
  assert.equal(result.partialComparison.previousPeriod, '2026-08');
  assert.equal(result.partialComparison.current.values.revenue, 1750);
  assert.equal(result.partialComparison.previous.values.revenue, 1500);
  assert.match(result.partialComparison.label, /Like-for-like partial period/);
});

