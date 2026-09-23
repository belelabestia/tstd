import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { call, is } from '@belelabestia/tstd';
import { emit, Anchor } from './emit.js';
import { openCheck } from './check.js';
import { map, Source } from './map.js';
import { smells } from './smell.js';

/** a diagnostic on a tz line, with the level it carries */
export type Note = { line: number, column: number, level: 'error' | 'warning', code: string, message: string; };

const flags = [
  '--noEmit', '--pretty', 'false', '--ignoreConfig',
  '--target', 'esnext', '--module', 'nodenext',
  '--strict', '--skipLibCheck', '--noUnusedLocals', '--types', 'node'
];

/** the directory every open buffer is mirrored under */
const mirror = path.resolve('.tzd');

/** the project every mirror belongs to: the workspace tsconfig, widened to include them */
const project = () => {
  const base = path.resolve('tsconfig.json');
  const seen = call.sync(() => existsSync(base));
  if (seen.branch === 'err' || !seen.value) return undefined;

  const config = path.join(mirror, 'tsconfig.json');
  const extendsFrom = path.relative(mirror, base).split(path.sep).join('/');
  const body = `${JSON.stringify({ extends: extendsFrom, include: ['**/*.ts'] }, null, 2)}\n`;
  const wrote = call.sync(() => writeFileSync(config, body));
  if (wrote.branch === 'err') return undefined;

  return config;
};

/** an editing session: open buffers checked through a temp mirror of tzc */
export const session = () => {
  const texts: Record<string, string> = {};
  const codes: Record<string, { code: string, lines: Anchor[][] }> = {};
  const refused: Record<string, { line: number, column: number, message: string }> = {};

  /** transpiles an open buffer, refusing it the way tzc does */
  const open = (origin: string, text: string) => {
    texts[origin] = text;
    const written = emit(text);
    if (written.branch === 'err') {
      delete codes[origin];
      refused[origin] = written.value;

      return;
    }

    delete refused[origin];
    codes[origin] = { code: written.value.code, lines: written.value.lines };
  };

  /** every open buffer diagnosed at once, one tsc run for all of them */
  const diagnoseAll = () => {
    const reports: { origin: string, notes: Note[] }[] = [];
    const sources: Source[] = [];
    const mirrored: string[] = [];
    const spelled: Record<string, Note[]> = {};

    for (const origin of Object.keys(texts)) {
      const no = refused[origin];
      spelled[origin] = smells(texts[origin]);
      if (!is.none(no)) {
        reports.push({ origin, notes: [{ line: no.line + 1, column: no.column + 1, level: 'error', code: 'TZ0001', message: no.message }, ...spelled[origin]] });
        continue;
      }

      const out = codes[origin];
      if (is.none(out)) continue;

      const relative = path.relative(process.cwd(), origin);
      const emitted = path.join(mirror, `${relative.slice(0, -3)}.ts`);
      const made = call.sync(() => mkdirSync(path.dirname(emitted), { recursive: true }));
      if (made.branch === 'err') {
        reports.push({ origin, notes: [{ line: 1, column: 1, level: 'error', code: 'TZ0000', message: 'cannot mirror the file' }] });
        continue;
      }

      writeFileSync(emitted, out.code);
      sources.push({ emitted, origin, lines: out.lines });
      mirrored.push(emitted);
    }

    if (mirrored.length > 0) {
      const require = createRequire(import.meta.url);
      const tsc = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
      const checked = spawnSync(process.execPath, [tsc, ...flags, ...mirrored], { encoding: 'utf8' });
      const said = map(`${checked.stdout ?? ''}${checked.stderr ?? ''}`, sources);
      const found: Record<string, Note[]> = {};

      for (const line of said.split('\n')) {
        const at = /^(.*?)\((\d+),(\d+)\): (error|warning) (.*?): (.*)$/.exec(line);
        if (is.none(at)) continue;

        const notes = found[at[1]] ?? [];
        notes.push({ line: Number(at[2]), column: Number(at[3]), level: at[4] === 'error' ? 'error' : 'warning', code: at[5], message: at[6] });
        found[at[1]] = notes;
      }

      const checking = openCheck(mirrored, project());
      const typed: Record<string, Note[]> = {};
      if (!is.none(checking)) {
        for (const source of sources) {
          const text = texts[source.origin] ?? '';
          const code = codes[source.origin].code;
          typed[source.origin] = [
            ...checking.booleans(source.emitted, text, code),
            ...checking.ladders(source.emitted, text, code),
            ...checking.drops(source.emitted, text, code)
          ];
        }
        checking.close();
      }

      for (const source of sources) {
        const relative = path.relative(process.cwd(), source.origin).split(path.sep).join('/');
        const absolute = path.resolve(source.origin);
        const notes = found[relative] ?? found[source.origin] ?? found[absolute] ?? [];
        reports.push({ origin: source.origin, notes: [...notes, ...(typed[source.origin] ?? []), ...(spelled[source.origin] ?? [])] });
      }
    }

    reports.sort((a, b) => a.origin < b.origin ? -1 : 1);

    return reports;
  };

  /** diagnoses one open buffer, through the same single run */
  const diagnose = (origin: string) => {
    for (const report of diagnoseAll()) if (report.origin === origin) return report.notes;

    return [];
  };

  return { open, diagnose, diagnoseAll };
};
