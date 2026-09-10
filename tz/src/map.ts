import * as path from 'node:path';
import { is } from '@belelabestia/tstd';
import { Anchor } from './emit.js';

/** an emitted file, the tz it came from, and the columns that lead back */
export type Source = { emitted: string, origin: string, lines: Anchor[][]; };

const same = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

const column = (anchors: Anchor[], at: number) => {
  if (is.none(anchors) || anchors.length === 0) return at;

  let was = anchors[0].was;

  for (const anchor of anchors) if (anchor.at <= at - 1) was = anchor.was + (at - 1 - anchor.at);
  return was + 1;
};

/** every tsc diagnostic in a run, moved back onto the tz line and column it came from */
export const map = (text: string, sources: Source[]) => {
  const out: string[] = [];

  for (const line of text.split('\n')) {
    const at = /^(.*?)\((\d+),(\d+)\)(: .*)$/.exec(line);

    if (is.none(at)) { out.push(line); continue; }

    let found: Source | undefined = undefined;
    for (const source of sources) if (same(source.emitted, at[1])) found = source;

    if (is.none(found)) { out.push(line); continue; }

    const row = Number(at[2]);
    const where = column(found.lines[row - 1], Number(at[3]));

    out.push(`${path.relative(process.cwd(), found.origin).split(path.sep).join('/')}(${row},${where})${at[4]}`);
  }

  return out.join('\n');
};
