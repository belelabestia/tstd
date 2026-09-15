#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import * as path from 'node:path';
import { call } from '@belelabestia/tstd';
import { session } from './lsp.js';

const walk = (at: string, found: string[]) => {
  const seen = call.sync(() => statSync(at));
  if (seen.branch === 'err') return found;

  if (!seen.value.isDirectory()) {
    if (at.endsWith('.tz')) found.push(at);

    return found;
  }

  if (path.basename(at) === 'node_modules') return found;

  for (const name of readdirSync(at)) walk(path.join(at, name), found);
  return found;
};

const inputs: string[] = [];
const args = process.argv.slice(2);

for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) continue;

  inputs.push(args[i]);
}

if (inputs.length === 0) inputs.push('.');

const files: string[] = [];
for (const input of inputs) walk(path.resolve(input), files);

if (files.length === 0) {
  process.stderr.write('tzd found no .tz files\n');
  process.exit(1);
}

const s = session();

for (const file of files) {
  const read = call.sync(() => readFileSync(file, 'utf8'));

  if (read.branch === 'err') {
    process.stdout.write(`${file}: error TZ0000: cannot read the file\n`);
    process.exit(1);
  }

  s.open(file, read.value);
}

let failed = false;

for (const report of s.diagnoseAll()) {
  const relative = path.relative(process.cwd(), report.origin).split(path.sep).join('/');

  for (const note of report.notes) {
    process.stdout.write(`${relative}(${note.line},${note.column}): ${note.level} ${note.code}: ${note.message}\n`);
    if (note.level === 'error') failed = true;
  }
}

process.exit(failed ? 1 : 0);
