#!/usr/bin/env node
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { call } from '@belelabestia/tstd';
import { emit } from './emit.js';
import { map, Source } from './map.js';

const flags = [
  '--noEmit', '--pretty', 'false', '--ignoreConfig',
  '--target', 'esnext', '--module', 'nodenext',
  '--strict', '--skipLibCheck', '--noUnusedLocals', '--types', 'node'
];

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

let out = '';
let checks = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--no-check') { checks = false; continue; }
  if (args[i] === '--out') { out = args[i + 1] ?? ''; i++; continue; }
  if (args[i].startsWith('--')) continue;

  inputs.push(args[i]);
}

if (inputs.length === 0) inputs.push('.');

const files: string[] = [];
for (const input of inputs) walk(path.resolve(input), files);

if (files.length === 0) {
  process.stderr.write('tzc found no .tz files\n');
  process.exit(1);
}

const sources: Source[] = [];
let refused = false;

for (const file of files) {
  const read = call.sync(() => readFileSync(file, 'utf8'));

  if (read.branch === 'err') {
    process.stdout.write(`${file}: error TZ0000: cannot read the file\n`);
    refused = true;
    continue;
  }

  const written = emit(read.value);

  if (written.branch === 'err') {
    const at = written.value;
    process.stdout.write(`${file}(${at.line + 1},${at.column + 1}): error TZ0001: ${at.message}\n`);
    refused = true;
    continue;
  }

  const relative = path.relative(process.cwd(), file);
  const emitted = out === '' ? `${file.slice(0, -3)}.ts` : path.resolve(out, `${relative.slice(0, -3)}.ts`);

  mkdirSync(path.dirname(emitted), { recursive: true });
  writeFileSync(emitted, written.value.code);

  sources.push({ emitted, origin: file, lines: written.value.lines });
}

if (refused) process.exit(1);
if (!checks) process.exit(0);

const require = createRequire(import.meta.url);
const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
const emitted: string[] = [];

for (const source of sources) emitted.push(source.emitted);

const checked = spawnSync(process.execPath, [tsc, ...flags, ...emitted], { encoding: 'utf8' });
const said = map(`${checked.stdout ?? ''}${checked.stderr ?? ''}`, sources).trim();

if (said !== '') process.stdout.write(`${said}\n`);
process.exit(checked.status ?? 1);
