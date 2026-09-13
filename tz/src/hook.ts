import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { call, make } from '@belelabestia/tstd';
import { emit } from './emit.js';

type Asked = { parentURL?: string; };

type Resolving = (specifier: string, context: Asked) => unknown;

type Loading = (url: string, context: unknown) => unknown;

const raise: (message: string) => never = (message) => {
  throw new Error(message);
};

/** the tz source path a specifier points at, as a result: only the exported seams throw */
const at = (specifier: string, parent?: string) => make(URL, specifier, parent);

/** points a .tz specifier, and a .js one with a .tz beside it, at the tz source */
export const resolve = (specifier: string, context: Asked, next: Resolving) => {
  const parent = context.parentURL;

  if (specifier.endsWith('.tz')) {
    const url = at(specifier, parent);
    if (url.branch === 'err') raise(`cannot resolve ${specifier}`);

    return { url: url.value.href, shortCircuit: true };
  }

  if (specifier.endsWith('.js') && specifier.startsWith('.')) {
    const url = at(`${specifier.slice(0, -3)}.tz`, parent);
    if (url.branch === 'err') raise(`cannot resolve ${specifier}`);

    if (existsSync(fileURLToPath(url.value))) return { url: url.value.href, shortCircuit: true };
  }

  return next(specifier, context);
};

/** hands node the typescript a tz file emits, and lets node strip the types */
export const load = (url: string, context: unknown, next: Loading) => {
  if (!url.endsWith('.tz')) return next(url, context);

  const where = fileURLToPath(url);
  const read = call.sync(() => readFileSync(where, 'utf8'));
  if (read.branch === 'err') raise(`cannot read ${where}`);

  const out = emit(read.value);
  if (out.branch === 'err') raise(`${where}(${out.value.line + 1},${out.value.column + 1}): error TZ: ${out.value.message}`);

  return { format: 'module-typescript', source: out.value.code, shortCircuit: true };
};
