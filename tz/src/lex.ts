import { is, result } from '@belelabestia/tstd';
import { refusal } from './refusal.js';

/** what a lexed piece of source is */
export type Kind = 'word' | 'number' | 'string' | 'template' | 'regex' | 'comment' | 'punct';

/** a lexed piece of source, and where it came from */
export type Token = { kind: Kind, text: string, from: number, to: number, line: number, column: number; };

const puncts = [
  '>>>=',
  '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
  '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>',
  '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '/',
  '%', '&', '|', '^', '!', '~', '?', ':', '=', '.', '@', '#'
];

const divides = ['++', '--', ')', ']', '}'];

const opens = [
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void',
  'case', 'do', 'else', 'yield', 'await', 'throw', 'ok', 'err'
];

const starts = (c: string) => /[A-Za-z_$]/.test(c) || c > '\u007f';

const parts = (c: string) => /[A-Za-z0-9_$]/.test(c) || c > '\u007f';

const digit = (c: string) => c >= '0' && c <= '9';

const quoted = (x: string, at: number) => {
  const quote = x[at];

  for (let i = at + 1; i < x.length; i++) {
    if (x[i] === '\\') i++;
    else if (x[i] === '\n') return -1;
    else if (x[i] === quote) return i + 1;
  }

  return -1;
};

const template = (x: string, at: number) => {
  let i = at + 1;

  while (i < x.length) {
    if (x[i] === '\\') { i += 2; continue; }
    if (x[i] === '`') return i + 1;

    if (x[i] === '$' && x[i + 1] === '{') {
      const end = braces(x, i + 1);
      if (end < 0) return -1;

      i = end;
      continue;
    }

    i++;
  }

  return -1;
};

const braces = (x: string, at: number) => {
  let i = at + 1;
  let depth = 1;

  while (i < x.length) {
    const c = x[i];

    if (c === '\'' || c === '"') {
      const end = quoted(x, i);
      if (end < 0) return -1;

      i = end;
      continue;
    }

    if (c === '`') {
      const end = template(x, i);
      if (end < 0) return -1;

      i = end;
      continue;
    }

    if (c === '/' && x[i + 1] === '/') {
      while (i < x.length && x[i] !== '\n') i++;
      continue;
    }

    if (c === '/' && x[i + 1] === '*') {
      const end = x.indexOf('*/', i + 2);
      if (end < 0) return -1;

      i = end + 2;
      continue;
    }

    if (c === '{') depth++;

    if (c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }

    i++;
  }

  return -1;
};

const pattern = (x: string, at: number) => {
  let i = at + 1;
  let inside = false;

  while (i < x.length) {
    const c = x[i];

    if (c === '\\') { i += 2; continue; }
    if (c === '\n') return -1;
    if (c === '[') inside = true;
    if (c === ']') inside = false;

    if (c === '/' && !inside) {
      i++;
      while (i < x.length && parts(x[i])) i++;
      return i;
    }

    i++;
  }

  return -1;
};

const slash = (prev?: Token) => {
  if (is.none(prev)) return true;
  if (prev.kind === 'punct') return !divides.includes(prev.text);

  return prev.kind === 'word' && opens.includes(prev.text);
};

const punct = (x: string, at: number) => {
  for (const p of puncts) if (x.startsWith(p, at)) return p;
};

/** every token in a source file, comments included */
export const lex = (x: string) => {
  const tokens: Token[] = [];

  let i = 0;
  let line = 0;
  let start = 0;

  const step = (to: number) => {
    for (let at = i; at < to; at++) if (x[at] === '\n') { line++; start = at + 1; }
    i = to;
  };

  const take = (kind: Kind, to: number) => {
    tokens.push({ kind, text: x.slice(i, to), from: i, to, line, column: i - start });
    step(to);
  };

  const last = () => {
    for (let at = tokens.length - 1; at >= 0; at--) if (tokens[at].kind !== 'comment') return tokens[at];
  };

  while (i < x.length) {
    const c = x[i];

    if (c === ' ' || c === '\t' || c === '\r' || c === '\n') { step(i + 1); continue; }

    if (c === '/' && x[i + 1] === '/') {
      let to = i;
      while (to < x.length && x[to] !== '\n') to++;

      take('comment', to);
      continue;
    }

    if (c === '/' && x[i + 1] === '*') {
      const end = x.indexOf('*/', i + 2);
      if (end < 0) return result.err(refusal(line, i - start, 'unterminated comment'));

      take('comment', end + 2);
      continue;
    }

    if (c === '\'' || c === '"') {
      const end = quoted(x, i);
      if (end < 0) return result.err(refusal(line, i - start, 'unterminated string'));

      take('string', end);
      continue;
    }

    if (c === '`') {
      const end = template(x, i);
      if (end < 0) return result.err(refusal(line, i - start, 'unterminated template'));

      take('template', end);
      continue;
    }

    if (c === '/' && slash(last())) {
      const end = pattern(x, i);
      if (end < 0) return result.err(refusal(line, i - start, 'unterminated regular expression'));

      take('regex', end);
      continue;
    }

    if (digit(c) || (c === '.' && digit(x[i + 1]))) {
      let to = i;
      while (to < x.length && (parts(x[to]) || x[to] === '.' || ((x[to] === '+' || x[to] === '-') && (x[to - 1] === 'e' || x[to - 1] === 'E')))) to++;

      take('number', to);
      continue;
    }

    if (starts(c)) {
      let to = i;
      while (to < x.length && parts(x[to])) to++;

      take('word', to);
      continue;
    }

    const p = punct(x, i);
    if (is.none(p)) return result.err(refusal(line, i - start, `unexpected character ${c}`));

    take('punct', i + p.length);
  }

  return result.ok(tokens);
};
