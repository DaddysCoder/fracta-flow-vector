#!/usr/bin/env node
/**
 * Registry validator. Blocking CI check.
 * No dependencies — runs anywhere node runs, including offline.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(join(here, f), 'utf8'));

export function validate(fields, documents, pathways) {
  const errors = [];
  const err = (rule, msg) => errors.push(`[${rule}] ${msg}`);

  const sectionToDoc = new Map();
  for (const [docId, doc] of Object.entries(documents))
    for (const s of doc.sections) sectionToDoc.set(s.id, docId);
  sectionToDoc.set('system', null);

  const gateNames = new Set(Object.keys(pathways.gates ?? {}));
  const seen = new Set();

  const docPathways = (sectionId) => {
    const d = sectionToDoc.get(sectionId);
    return d ? documents[d].pathways : null;
  };
  const intersects = (a, b) => a.some((x) => b.includes(x));

  for (const f of fields) {
    if (seen.has(f.id)) err('unique-id', `duplicate field id "${f.id}"`);
    seen.add(f.id);

    // askedIn is exactly one section, and it must exist.
    if (typeof f.askedIn !== 'string')
      err('single-asked-in', `"${f.id}" askedIn must be a single section id`);
    else if (!sectionToDoc.has(f.askedIn))
      err('resolves', `"${f.id}" askedIn "${f.askedIn}" does not resolve`);

    for (const t of [...f.rendersIn, ...f.informs])
      if (!sectionToDoc.has(t)) err('resolves', `"${f.id}" target "${t}" does not resolve`);

    if (f.rendersIn.includes(f.askedIn))
      err('no-self-render', `"${f.id}" renders into its own askedIn section`);

    // Pathway compatibility: a field must be usable in at least one pathway of
    // every document it touches. This is what keeps RRP scaffolding out of a
    // No-RP plan (MD-012).
    for (const t of [f.askedIn, ...f.rendersIn]) {
      const dp = docPathways(t);
      if (dp && !intersects(f.pathways, dp))
        err('pathway', `"${f.id}" (${f.pathways}) cannot appear in ${t} (${dp})`);
    }

    if (f.tier === 3 && f.transition.default !== 'new')
      err('tier3-never-prefilled', `"${f.id}" is tier 3 but defaults to "${f.transition.default}"`);
    if (f.tier === 0 && f.stalenessDays !== null)
      err('tier0-never-stale', `"${f.id}" is tier 0 but has stalenessDays`);
    if (f.tier >= 2 && f.clinical !== true)
      err('clinical-flag', `"${f.id}" is tier ${f.tier} and must be clinical`);
    if (f.repeatable !== Boolean(f.group))
      err('group', `"${f.id}" repeatable and group disagree`);
    if (f.type === 'tristate' && f.tier < 2)
      err('tristate-tier', `"${f.id}" tri-state fields are observations`);

    for (const g of f.requires)
      if (!gateNames.has(g)) err('gate', `"${f.id}" requires unknown gate "${g}"`);
  }

  // MD-012, stated as its own check so the intent is legible in CI output.
  const noRpSections = new Set(documents['07'].sections.map((s) => s.id));
  for (const f of fields)
    if (f.rendersIn.some((t) => noRpSections.has(t)) &&
        (f.id.startsWith('rrp.') || f.id.startsWith('interim.')))
      err('no-rp-clean', `"${f.id}" must not appear in the No-RP BSP under any circumstances`);

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const fields = read('fields.json');
  const documents = read('documents.json');
  const pathways = read('pathways.json');
  const errors = validate(fields, documents, pathways);
  if (errors.length) {
    console.error(`✗ registry invalid — ${errors.length} error(s)\n`);
    for (const e of errors) console.error('  ' + e);
    process.exit(1);
  }
  const byTier = [0, 1, 2, 3].map((t) => fields.filter((f) => f.tier === t).length);
  console.log(`✓ registry valid — ${fields.length} fields ` +
    `(tier 0:${byTier[0]} 1:${byTier[1]} 2:${byTier[2]} 3:${byTier[3]}), ` +
    `${Object.keys(documents).length} documents`);
}
