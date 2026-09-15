import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { call, is } from '@belelabestia/tstd';
import { emit, Anchor, tailing } from './emit.js';
import { openCheck } from './check.js';
import { lex } from './lex.js';
import { keyword, scan } from './scan.js';
import { map, Source } from './map.js';

/** a diagnostic on a tz line, with the level it carries */
export type Note = { line: number, column: number, level: 'error' | 'warning', code: string, message: string; };

const flags = [
  '--noEmit', '--pretty', 'false', '--ignoreConfig',
  '--target', 'esnext', '--module', 'nodenext',
  '--strict', '--skipLibCheck', '--noUnusedLocals', '--types', 'node'
];

/** the words that head a statement, so a drop never starts with one */
const heads = [
  'const', 'let', 'import', 'export', 'return', 'ok', 'err', 'try', 'void',
  'scope', 'protocol', 'form', 'call', 'make', 'async', 'if', 'for', 'while',
  'else', 'do', 'type', 'break', 'continue', 'satisfies', 'as'
];

/** every naked expression statement with no void and no tz head */
export const checkVoid = (text: string) => {
  const notes: Note[] = [];
  const lexed = lex(text);
  if (lexed.branch === 'err') return notes;

  const tokens = lexed.value;
  const read = scan(tokens);
  const { twin, starts, before, after, matcher, frames, owner } = read;

  const end = (from: number) => {
    let j = from;
    while (j < tokens.length) {
      const t = tokens[j];
      if (t.kind === 'comment') { j++; continue; }
      if (t.text === '(' || t.text === '[' || t.text === '{') {
        const shut = twin[j];
        if (shut < 0) return j;
        j = shut + 1;
        continue;
      }
      if (t.text === ';') return j;
      if (t.text === '}') return before[j] < 0 ? j : before[j];
      j++;
    }

    return tokens.length - 1;
  };

  const decls: { from: number, to: number }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === 'comment' || !starts[i]) continue;
    if (tokens[i].kind !== 'word' || !keyword(tokens, before, i)) continue;
    if (tokens[i].text !== 'import' && tokens[i].text !== 'export' && tokens[i].text !== 'protocol' && tokens[i].text !== 'form') continue;

    const last = end(i);
    const head = tokens[i].text;
    if (head === 'protocol' || head === 'form') {
      const next = after[i];
      if (next < 0 || (tokens[next].kind !== 'word' && tokens[next].text !== '<')) continue;
      decls.push({ from: i, to: last });
      continue;
    }

    let bound = false;
    for (let j = i; j >= 0 && j <= last; j++) {
      if (tokens[j].kind === 'comment') continue;
      if (tokens[j].text === '(' || tokens[j].text === '[' || tokens[j].text === '{') {
        const shut = twin[j];
        if (shut < 0) break;
        j = shut;
        continue;
      }
      if (tokens[j].text === '=') { bound = true; break; }
    }
    if (!bound) decls.push({ from: i, to: last });
  }

  const blocks: { from: number, to: number }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== 'punct' || tokens[i].text !== '{') continue;

    const shut = twin[i];
    if (shut < 0) continue;

    let p = before[i];
    if (p >= 0 && (tokens[p].text === '>' || tokens[p].text === '>>' || tokens[p].text === '>>>')) {
      let depth = 0;
      while (p >= 0) {
        const t = tokens[p].text;
        if (t === '>' || t === '>>' || t === '>>>') depth += t.length;
        if (t === '<' || t === '<<') depth -= t.length;
        if (depth <= 0) { p = before[p]; break; }
        p = before[p];
      }
    }

    if (p >= 0 && tokens[p].kind === 'word' && keyword(tokens, before, p)) {
      if (tokens[p].text === 'protocol' || tokens[p].text === 'form' || tokens[p].text === 'import' || tokens[p].text === 'export') {
        blocks.push({ from: i, to: shut });
        continue;
      }

      const q = before[p];
      if (q >= 0 && tokens[q].kind === 'word' && (tokens[q].text === 'protocol' || tokens[q].text === 'form') && keyword(tokens, before, q)) {
        blocks.push({ from: i, to: shut });
      }
    }
  }

  const miss = (from: number) => {
    let p = before[from];
    while (p >= 0) {
      const t = tokens[p];
      if (t.kind === 'comment') { p = before[p]; continue; }
      if (t.kind === 'word' && t.text === 'else' && keyword(tokens, before, p)) return true;
      if (t.text === ';') return false;
      if (t.text === '}') { p = before[p]; continue; }
      if (t.text === ')') {
        const open = twin[p];
        p = open >= 0 ? before[open] : before[p];
        continue;
      }
      if (t.text === '{') {
        const head = before[p];
        if (head >= 0 && tokens[head].kind === 'word' && tokens[head].text === 'else' && keyword(tokens, before, head)) { p = head; continue; }

        return false;
      }
      if (t.text === '(') return false;
      p = before[p];
    }

    return false;
  };

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === 'comment' || !starts[i]) continue;
    if (decls.some((d) => i > d.from && i <= d.to)) continue;
    if (blocks.some((b) => i > b.from && i < b.to)) continue;
    if (frames[owner[i]].kind === 'object') continue;
    if (tokens[i].kind !== 'word') continue;
    if (heads.includes(tokens[i].text) && keyword(tokens, before, i)) continue;
    if (tailing(tokens, read, i)) continue;
    if (miss(i)) continue;

    const last = end(i);
    let quest = false;
    for (let j = i; j >= 0 && j <= last; j++) {
      if (tokens[j].kind === 'comment') continue;
      if (matcher[j] >= 0) { quest = true; break; }
    }
    if (quest) continue;

    notes.push({ line: tokens[i].line + 1, column: tokens[i].column + 1, level: 'warning', code: 'TZL0003', message: 'a dropped value needs void' });
  }

  return notes;
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

    for (const origin of Object.keys(texts)) {
      const no = refused[origin];
      if (!is.none(no)) {
        reports.push({ origin, notes: [{ line: no.line + 1, column: no.column + 1, level: 'error', code: 'TZ0001', message: no.message }] });
        continue;
      }

      const out = codes[origin];
      if (is.none(out)) continue;

      const relative = path.relative(process.cwd(), origin);
      const emitted = path.resolve('.tzd', `${relative.slice(0, -3)}.ts`);
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

      const checking = openCheck(mirrored);
      const typed: Record<string, Note[]> = {};
      if (!is.none(checking)) {
        for (const source of sources) {
          const text = texts[source.origin] ?? '';
          const code = codes[source.origin].code;
          typed[source.origin] = [...checking.booleans(source.emitted, text, code), ...checking.ladders(source.emitted, text, code)];
        }
        checking.close();
      }

      for (const source of sources) {
        const relative = path.relative(process.cwd(), source.origin).split(path.sep).join('/');
        const absolute = path.resolve(source.origin);
        const notes = found[relative] ?? found[source.origin] ?? found[absolute] ?? [];
        reports.push({ origin: source.origin, notes: [...notes, ...checkVoid(texts[source.origin] ?? ''), ...(typed[source.origin] ?? [])] });
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

  return { open, diagnose, diagnoseAll, checkVoid };
};
