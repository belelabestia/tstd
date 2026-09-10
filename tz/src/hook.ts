import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { call, make } from '@belelabestia/tstd';
import { emit } from './emit.js';

type Asked = { parentURL?: string; };

type Resolving = (specifier: string, context: Asked) => unknown;

type Loading = (url: string, context: unknown) => unknown;

const raise = (message: string) => {
  const error = make(Error, message);
  throw error.branch === 'err' ? message : error.value;
};

const at = (specifier: string, parent?: string) => {
  const url = make(URL, specifier, parent);
  if (url.branch === 'err') return raise(`cannot resolve ${specifier}`);

  return url.value.href;
};

/** points a .tz specifier, and a .js one with a .tz beside it, at the tz source */
export const resolve = (specifier: string, context: Asked, next: Resolving) => {
  const parent = context.parentURL;

  if (specifier.endsWith('.tz')) return { url: at(specifier, parent), shortCircuit: true };

  if (specifier.endsWith('.js') && specifier.startsWith('.')) {
    const url = at(`${specifier.slice(0, -3)}.tz`, parent);
    if (existsSync(fileURLToPath(url))) return { url, shortCircuit: true };
  }

  return next(specifier, context);
};

/** hands node the typescript a tz file emits, and lets node strip the types */
export const load = (url: string, context: unknown, next: Loading) => {
  if (!url.endsWith('.tz')) return next(url, context);

  const where = fileURLToPath(url);
  const read = call.sync(() => readFileSync(where, 'utf8'));
  if (read.branch === 'err') return raise(`cannot read ${where}`);

  const out = emit(read.value);
  if (out.branch === 'err') return raise(`${where}(${out.value.line + 1},${out.value.column + 1}): error TZ: ${out.value.message}`);

  return { format: 'module-typescript', source: out.value.code, shortCircuit: true };
};
