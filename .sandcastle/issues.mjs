#!/usr/bin/env node
// Local markdown issue tracker for Sandcastle. Conventions: docs/agents/issue-tracker.md
//
//   node .sandcastle/issues.mjs list                 open, unblocked, ready-for-agent issues as JSON
//   node .sandcastle/issues.mjs view <ID>            print one issue
//   node .sandcastle/issues.mjs close <ID> "<msg>"   set Status: closed and append a comment
//   node .sandcastle/issues.mjs comment <ID> "<msg>" append a comment
//
// <ID> is "<feature>/<NN>", e.g. "apostillas-v1/02".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRATCH = path.join(ROOT, '.scratch');
const CLOSED = 'closed';

function field(text, name) {
  const m = text.match(new RegExp(`^${name}:\\s*(.*)$`, 'mi'));
  return m ? m[1].trim() : null;
}

function loadAll() {
  if (!fs.existsSync(SCRATCH)) return [];
  const issues = [];
  for (const feature of fs.readdirSync(SCRATCH)) {
    const dir = path.join(SCRATCH, feature, 'issues');
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      const m = name.match(/^(\d+)-.*\.md$/);
      if (!m) continue;
      const file = path.join(dir, name);
      const body = fs.readFileSync(file, 'utf8');
      const blocked = field(body, 'Blocked by');
      issues.push({
        id: `${feature}/${m[1]}`,
        title: (body.match(/^#\s+(.*)$/m) || [, name])[1].trim(),
        status: field(body, 'Status'),
        blockedBy: blocked ? blocked.split(/[,\s]+/).filter(Boolean).map((n) => `${feature}/${n.padStart(2, '0')}`) : [],
        spec: path.relative(ROOT, path.join(SCRATCH, feature, 'spec.md')).replaceAll('\\', '/'),
        file: path.relative(ROOT, file).replaceAll('\\', '/'),
        body,
      });
    }
  }
  return issues;
}

function find(id) {
  const issue = loadAll().find((i) => i.id === id);
  if (!issue) {
    console.error(`No issue with id "${id}". Ids look like "apostillas-v1/02".`);
    process.exit(1);
  }
  return issue;
}

function appendComment(text, message) {
  const date = new Date().toISOString().slice(0, 10);
  const entry = `\n**RALPH (${date}):** ${message}\n`;
  const trimmed = text.replace(/\s*$/, '\n');
  return /^## Comments\s*$/m.test(trimmed) ? trimmed + entry : `${trimmed}\n## Comments\n${entry}`;
}

const [cmd, id, ...rest] = process.argv.slice(2);
const message = rest.join(' ').trim();

switch (cmd) {
  case 'list': {
    const all = loadAll();
    const status = new Map(all.map((i) => [i.id, i.status]));
    const open = all.filter((i) => i.status === 'ready-for-agent' && i.blockedBy.every((b) => status.get(b) === CLOSED));
    console.log(JSON.stringify(open.map(({ id, title, status, blockedBy, spec, file, body }) => ({ id, title, status, blockedBy, spec, file, body })), null, 2));
    break;
  }
  case 'view':
    process.stdout.write(fs.readFileSync(path.join(ROOT, find(id).file), 'utf8'));
    break;
  case 'close':
  case 'comment': {
    if (!message) {
      console.error(`Usage: node .sandcastle/issues.mjs ${cmd} <ID> "<message>"`);
      process.exit(1);
    }
    const issue = find(id);
    const file = path.join(ROOT, issue.file);
    let text = fs.readFileSync(file, 'utf8');
    if (cmd === 'close') text = text.replace(/^Status:.*$/m, `Status: ${CLOSED}`);
    fs.writeFileSync(file, appendComment(text, message));
    console.log(`${cmd === 'close' ? 'Closed' : 'Commented on'} ${issue.id}: ${issue.title}`);
    break;
  }
  default:
    console.error('Usage: node .sandcastle/issues.mjs list | view <ID> | close <ID> "<msg>" | comment <ID> "<msg>"');
    process.exit(1);
}
