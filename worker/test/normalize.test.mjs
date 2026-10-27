// Unit tests for the pure normalising helpers. Run: npm run test:worker
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  marketOf, inferWorkMode, inferExperience, inferEmploymentType, inferCategory,
  unescapeHtml, htmlToText, summarize, slug, annualMax, fingerprint,
} from '../normalize.ts';
import { extractSkills } from '../../src/lib/skills.ts';
import { ftsQuery } from '../search.ts';

test('markets: Europe and Brazil in, everything else out', () => {
  assert.equal(marketOf('Lisbon, Portugal'), 'PT');
  assert.equal(marketOf('Porto Alegre, RS'), 'BR');
  assert.equal(marketOf('São Paulo, Brazil '), 'BR');
  assert.equal(marketOf('Düsseldorf 🇩🇪'), 'DE');
  assert.equal(marketOf('England, United Kingdom'), 'GB');
  assert.equal(marketOf('Remote - EMEA'), 'EU');
  assert.equal(marketOf('New York, NY'), null);
  assert.equal(marketOf('Cambridge, MA'), null);
  assert.equal(marketOf('Remote'), null);
  assert.equal(marketOf('Anywhere', 'de'), 'DE');
  assert.equal(marketOf('Anywhere', 'US'), null);
});

test('work mode, level and contract from free text', () => {
  assert.equal(inferWorkMode('Berlin (Hybrid)'), 'hybrid');
  assert.equal(inferWorkMode('Remote - Spain'), 'remote');
  assert.equal(inferWorkMode('Madrid'), 'on-site');
  assert.equal(inferExperience('Senior Backend Engineer'), 'senior');
  assert.equal(inferExperience('Staff Engineer'), 'senior');
  assert.equal(inferExperience('Engineering Manager'), 'lead');
  assert.equal(inferExperience('Junior Data Analyst'), 'entry');
  assert.equal(inferExperience('Estágio em Marketing'), 'entry');
  assert.equal(inferExperience('Backend Engineer'), 'mid');
  assert.equal(inferExperience('Product Manager'), 'mid');
  assert.equal(inferExperience('Customer Success Manager'), 'mid');
  assert.equal(inferEmploymentType('Permanent - Full-time'), 'full-time');
  assert.equal(inferEmploymentType('Working Student (m/f/d)'), 'internship');
  assert.equal(inferEmploymentType('Freelance designer'), 'contract');
  assert.equal(inferEmploymentType('Part-time support'), 'part-time');
});

test('categories: department first, then title; no partial-word matches', () => {
  assert.equal(inferCategory('EMEA Marketing', 'Analyst Relations Manager'), 'Marketing');
  assert.equal(inferCategory(undefined, 'Analyst Relations Manager'), 'Data');
  assert.equal(inferCategory('Product Designer'), 'Design');
  assert.equal(inferCategory('Senior Software Engineer, Design Systems'), 'Engineering');
  assert.equal(inferCategory('Product Manager, Payments'), 'Product');
  assert.equal(inferCategory('Program Manager'), 'Operations', '"pr" must not match "Program"');
  assert.equal(inferCategory('Billing Specialist'), 'Operations', '"bi" must not match "Billing"');
  assert.equal(inferCategory('Airline Partnerships Lead'), 'Sales', '"ai" must not match "Airline"');
  assert.equal(inferCategory('Sales'), 'Sales');
  assert.equal(inferCategory('Customer Success Manager'), 'Customer success');
  assert.equal(inferCategory('Clinical Nurse'), 'Healthcare');
});

test('html helpers', () => {
  assert.equal(unescapeHtml('&lt;p&gt;Tom &amp;amp; Jerry&lt;/p&gt;'), '<p>Tom &amp; Jerry</p>');
  assert.equal(unescapeHtml('Go&hellip; &#8364;5 &#x41;'), 'Go… €5 A');
  assert.equal(htmlToText('<p>One</p><ul><li>Two</li><li>Three</li></ul>'), 'One Two Three');
  assert.equal(summarize('Short.'), 'Short.');
  const long = 'First sentence is here. ' + 'word '.repeat(80);
  assert.equal(summarize(long, 40), 'First sentence is here.', 'cut at a sentence when it fills at least half the limit');
  assert.ok(summarize(long, 60).endsWith('…'), 'otherwise at a word');
  assert.ok(summarize('word '.repeat(100), 50).endsWith('…'));
  assert.equal(slug('Northwind Labs GmbH & Co.'), 'northwind-labs-gmbh-co');
});

test('pay sorting and fingerprints', () => {
  assert.equal(annualMax({ min: 30, max: 40, currency: 'GBP', period: 'hour' }), 72000);
  assert.equal(annualMax({ min: 5000, max: 6000, currency: 'BRL', period: 'month' }), 72000);
  assert.equal(annualMax(null), null);
  const base = { id: 'x', provider: 'lever', externalId: 'x', boardToken: 't', companyId: 'c', companyName: 'C', title: 'A', category: 'Data',
    location: 'Berlin', country: 'DE', workMode: 'hybrid', employmentType: 'full-time', experience: 'mid', salary: null,
    postedAt: '2026-10-01T00:00:00.000Z', applyUrl: 'u', sourceUrl: 'u', summary: '', skills: [] };
  assert.equal(fingerprint(base), fingerprint({ ...base }));
  assert.notEqual(fingerprint(base), fingerprint({ ...base, title: 'B' }));
  assert.equal(fingerprint(base), fingerprint({ ...base, boardToken: 'other' }), 'storage-only fields do not change the fingerprint');
});

test('skills: proper nouns only for everyday words', () => {
  assert.deepEqual(extractSkills('We use React, Node.js and Postgres on AWS. C++ and C# a plus.'), ['React', 'Node.js', 'C++', 'C#', 'PostgreSQL', 'AWS']);
  assert.deepEqual(extractSkills('Strong go-to-market sense; you excel at the rest of it, swift delivery.'), []);
  assert.deepEqual(extractSkills('Go and REST APIs'), ['REST', 'Go']);
});

test('search query cannot inject FTS operators', () => {
  assert.equal(ftsQuery('Senior React'), '"senior" "react"');
  assert.equal(ftsQuery('backend eng'), '"backend" "eng"*', 'short last word is a prefix (still typing)');
  assert.equal(ftsQuery('ação "OR" NEAR(x) *'), '"acao" "or" "near" "x"*');
  assert.equal(ftsQuery('   '), '');
  assert.equal(ftsQuery('a b c d e f g h'), '"a" "b" "c" "d" "e" "f"*');
});
