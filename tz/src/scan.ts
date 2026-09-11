import { Token } from './lex.js';

/** what a pair of braces encloses */
export type Kind = 'file' | 'body' | 'iife' | 'match' | 'block' | 'object';

/** one pair of braces, and what the body it encloses does */
export type Frame = {
  kind: Kind,
  open: number,
  close: number,
  parent: number,
  suspends: boolean,
  fallible: boolean,
  answers: boolean,
  promises: boolean,
  last: number;
};

/** everything about a token stream that reading it left to right can say */
export type Scan = {
  frames: Frame[],
  owner: number[],
  body: number[],
  twin: number[],
  starts: boolean[],
  before: number[],
  after: number[],
  holds: number[],
  matcher: number[],
  tagged: number[];
};

const objects = [
  '=', '(', ',', '[', ':', '?', '&&', '||', '??', '+', '-', '*', '/', '%',
  '===', '==', '!==', '!=', '<', '>', '<=', '>=', '...', '=>'
];

const words = ['return', 'ok', 'err', 'async', 'satisfies', 'as', 'of', 'in', 'typeof', 'new', 'extends'];

const tails = ['if', 'for', 'while'];

const matchers = ['none', 'some', 'true', 'false'];

const values = ['word', 'string', 'number', 'template', 'regex'];

const bodies = ['file', 'body', 'iife', 'match'];

const frame = (kind: Kind, open: number, parent: number) =>
  ({ kind, open, close: -1, parent, suspends: false, fallible: false, answers: false, promises: false, last: -1 });

/** whether a word sits where a keyword can, rather than after a dot */
export const keyword = (tokens: Token[], before: number[], i: number) => {
  const p = before[i];

  return p < 0 || (tokens[p].text !== '.' && tokens[p].text !== '?.');
};

/** whether an async at this token is the banned modifier rather than the exit */
export const modifier = (tokens: Token[], twin: number[], after: number[], i: number) => {
  const n = after[i];
  if (n < 0) return false;

  if (tokens[n].text === '(') {
    const close = twin[n];
    return close >= 0 && after[close] >= 0 && tokens[after[close]].text === '=>';
  }

  return tokens[n].kind === 'word' && after[n] >= 0 && tokens[after[n]].text === '=>';
};

/** everything reading a token stream left to right can say about it */
export const scan = (tokens: Token[]) => {
  const before: number[] = [];
  const after: number[] = [];
  const twin: number[] = [];
  const owner: number[] = [];
  const body: number[] = [];
  const starts: boolean[] = [];
  const holds: number[] = [];

  let seen = -1;

  for (let i = 0; i < tokens.length; i++) {
    twin[i] = -1;
    holds[i] = -1;
    starts[i] = false;
    before[i] = tokens[i].kind === 'comment' ? -1 : seen;
    if (tokens[i].kind !== 'comment') seen = i;
  }

  let next = -1;

  for (let i = tokens.length - 1; i >= 0; i--) {
    after[i] = tokens[i].kind === 'comment' ? -1 : next;
    if (tokens[i].kind !== 'comment') next = i;
  }

  const open: number[] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind !== 'punct') continue;

    if (tokens[i].text === '(' || tokens[i].text === '[' || tokens[i].text === '{') open.push(i);

    if (tokens[i].text === ')' || tokens[i].text === ']' || tokens[i].text === '}') {
      const at = open.pop();
      if (at === undefined) continue;

      twin[at] = i;
      twin[i] = at;
    }
  }

  const matcher: number[] = [];
  const tagged: number[] = [];

  for (let i = 0; i < tokens.length; i++) { matcher[i] = -1; tagged[i] = -1; }

  const ended = (j: number) =>
    j >= 0 && (values.includes(tokens[j].kind) || tokens[j].text === ')' || tokens[j].text === ']' || tokens[j].text === '}');

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'punct' || t.text !== '?') continue;
    if (!ended(before[i])) continue;

    const n = after[i];
    if (n < 0) continue;

    if (tokens[n].kind === 'word' && matchers.includes(tokens[n].text) && t.to === tokens[n].from) {
      matcher[i] = n;
      tagged[n] = i;
      continue;
    }

    if ((tokens[n].kind === 'number' || tokens[n].kind === 'string') && t.to === tokens[n].from) {
      matcher[i] = n;
      tagged[n] = i;
      continue;
    }

    if ((tokens[n].text === '-' || tokens[n].text === '+') && t.to === tokens[n].from) {
      const m = after[n];
      if (m >= 0 && tokens[m].kind === 'number' && tokens[n].to === tokens[m].from) {
        matcher[i] = n;
        tagged[n] = i;
        continue;
      }
    }

    if (tokens[n].text === '(' && t.to === tokens[n].from) {
      matcher[i] = n;
      tagged[n] = i;
      continue;
    }

    const c = tokens[n].text === ':' && t.to === tokens[n].from ? after[n] : -1;
    if (c >= 0 && tokens[c].kind === 'word' && tokens[n].to === tokens[c].from) {
      matcher[i] = c;
      tagged[c] = i;
    }
  }

  const frames = [frame('file', -1, -1)];
  frames[0].close = tokens.length;

  const classify = (i: number) => {
    const p = before[i];
    if (p < 0) return 'block';

    const t = tokens[p];

    if (t.text === 'call' && t.kind === 'word' && keyword(tokens, before, p)) return 'body';

    if (t.text === '=>') {
      const q = before[p];
      if (q < 0) return 'body';

      const held = tokens[q].text === ')' && twin[q] >= 0 ? before[twin[q]] : q;
      if (held >= 0 && tagged[held] >= 0) return 'iife';

      return 'body';
    }

    if (t.text === ')' && twin[p] >= 0) {
      const head = before[twin[p]];
      if (head >= 0 && tokens[head].text === 'match') return 'match';

      return 'block';
    }

    if (objects.includes(t.text) || (t.kind === 'word' && words.includes(t.text))) return 'object';
    return 'block';
  };

  const holder = (at: number) => {
    let f = at;
    while (f > 0 && !bodies.includes(frames[f].kind)) f = frames[f].parent;

    return f;
  };

  const stack = [0];
  const depth = [0];
  let start = true;
  let tail = false;

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].kind === 'comment') { owner[i] = stack[stack.length - 1]; body[i] = holder(owner[i]); continue; }

    const cur = stack[stack.length - 1];
    const text = tokens[i].text;

    if (text === '}' && twin[i] >= 0) {
      frames[cur].close = i;
      owner[i] = cur;
      body[i] = holder(cur);
      stack.pop();
      depth.pop();
      start = depth[depth.length - 1] === 0;
      tail = false;
      continue;
    }

    owner[i] = cur;
    body[i] = holder(cur);

    if (start) { starts[i] = true; if (!tail) frames[cur].last = i; start = false; tail = false; }

    if (text === '{') {
      frames.push(frame(classify(i), i, cur));
      holds[i] = frames.length - 1;
      stack.push(frames.length - 1);
      depth.push(0);
      start = true;
      tail = false;
      continue;
    }

    if (text === '(' || text === '[') { depth[depth.length - 1]++; continue; }

    if (text === ')' || text === ']') {
      depth[depth.length - 1]--;

      if (text === ')' && twin[i] >= 0) {
        const head = before[twin[i]];
        if ((head >= 0 && tagged[head] >= 0) || tagged[twin[i]] >= 0) { start = true; tail = true; }
        else if (head >= 0 && tokens[head].kind === 'word' && tails.includes(tokens[head].text)) { start = true; tail = tokens[head].text !== 'if'; }
      }

      continue;
    }

    if (text === ';' && depth[depth.length - 1] === 0) { start = true; tail = false; continue; }

    if (tagged[i] >= 0 && after[i] >= 0 && tokens[after[i]].text !== '(' && tokens[after[i]].text !== '=>' && matcher[after[i]] < 0) { start = true; tail = true; continue; }

    if (tokens[i].kind !== 'word') continue;

    if (text === 'else' || text === 'do') { start = true; tail = false; continue; }

    const at = body[i];

    if (text === 'await' && keyword(tokens, before, i)) frames[at].suspends = true;

    if ((text === 'ok' || text === 'err') && starts[i] && frames[cur].kind !== 'object') frames[at].fallible = true;

    if (text === 'try' && keyword(tokens, before, i)) frames[at].fallible = true;

    if (text === 'return' && starts[i] && after[i] >= 0 && tokens[after[i]].text !== ';') frames[at].answers = true;

    if (text === 'async' && starts[i] && !modifier(tokens, twin, after, i)) frames[at].promises = true;
  }

  const out: Scan = { frames, owner, body, twin, starts, before, after, holds, matcher, tagged };

  for (let f = frames.length - 1; f > 0; f--) if (frames[f].kind === 'iife' && frames[f].suspends) frames[holder(frames[f].parent)].suspends = true;

  for (let f = frames.length - 1; f > 0; f--) {
    if (frames[f].kind !== 'body' || !frames[f].suspends) continue;

    const arrow = before[frames[f].open];
    const head = arrow >= 0 && tokens[arrow].text === '=>' ? before[arrow] : -1;
    if (head >= 0 && tokens[head].kind === 'word' && tokens[head].text === 'call' && keyword(tokens, before, head)) {
      frames[holder(frames[f].parent)].suspends = true;
    }
  }

  return out;
};
