#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { make } from '@belelabestia/tstd';

const spread = (args: string[]) => {
  const out: string[] = [];

  for (const arg of args) {
    if (!arg.includes('*')) { out.push(arg); continue; }

    for (const found of globSync(arg)) out.push(found);
  }

  return out;
};

const shim = make(URL, './register.js', import.meta.url);

if (shim.branch === 'err') {
  process.stderr.write('tzx cannot find its loader\n');
  process.exit(1);
}

const options = process.env.NODE_OPTIONS ?? '';

const out = spawnSync(process.execPath, spread(process.argv.slice(2)), {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${options} --import ${shim.value.href}`.trim() }
});

process.exit(out.status ?? 1);
