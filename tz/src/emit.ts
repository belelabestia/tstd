import { result } from '@belelabestia/tstd';
import { Token, lex } from './lex.js';
import { scan, keyword } from './scan.js';
import { ban } from './ban.js';
import { refusal } from './refusal.js';

/** where a column of the emit sat in the source it came from */
export type Anchor = { at: number, was: number; };

type Edit = { from: number, to: number, text: string; };

type Landing = { open: string, close: string; };

const wraps: Record<string, Landing> = {
  ok: { open: 'return result.ok(', close: ')' },
  err: { open: 'return result.err(', close: ')' },
  async: { open: 'return Promise.resolve(', close: ')' },
  return: { open: 'return ', close: '' }
};

const exits = ['return', 'ok', 'err', 'async', 'break', 'continue'];

const carries = ['(', '[', '{'];

const closes = [')', ']', '}'];

const goes = [';', ')', ']', ',', '.', '?.', ':', '=>', '+', '-', '*', '/', '&&', '||', '?', '==', '!=', '<', '>', '<=', '>='];

const apply = (source: string, edits: Edit[]) => {
  const sorted = [...edits].sort((a, b) => a.from - b.from || a.to - b.to);
  const lines: Anchor[][] = [[]];
  const out: string[] = [];

  let at = 0;
  let column = 0;
  let was = 0;

  const copy = (to: number) => {
    while (at < to) {
      const end = source.indexOf('\n', at);

      if (end < 0 || end >= to) {
        lines[lines.length - 1].push({ at: column, was });
        out.push(source.slice(at, to));
        column += to - at;
        was += to - at;
        at = to;
        return;
      }

      lines[lines.length - 1].push({ at: column, was });
      out.push(source.slice(at, end + 1));
      lines.push([]);
      column = 0;
      was = 0;
      at = end + 1;
    }
  };

  for (const edit of sorted) {
    if (edit.from < at) continue;

    copy(edit.from);
    out.push(edit.text);
    column += edit.text.length;
    was += edit.to - edit.from;
    at = edit.to;
  }

  copy(source.length);
  return { code: out.join(''), lines };
};

const rewrite = (source: string, tokens: Token[], read: ReturnType<typeof scan>) => {
  const { frames, owner, body, twin, starts, before, after, holds, sigils } = read;

  const edits: Edit[] = [];
  const taken: number[] = [];
  const expressions: boolean[] = [];
  const consumed: boolean[] = [];

  const no = (at: number, message: string) => result.err(refusal(tokens[at].line, tokens[at].column, message));

  const temp = (i: number) => {
    const f = body[i];
    taken[f] = (taken[f] ?? 0) + 1;

    return `$${taken[f] - 1}`;
  };

  const jump = (j: number) => (carries.includes(tokens[j].text) && twin[j] >= 0 ? twin[j] + 1 : j + 1);

  const ends = (i: number) => {
    let j = i;

    while (j < tokens.length) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (t.text === '(' || t.text === '[') { j = jump(j); continue; }

      if (t.text === '{') {
        const close = twin[j];
        if (close < 0) return j;

        const n = after[close];
        if (n < 0) return close;
        if (tokens[n].text === ';') return n;
        if (goes.includes(tokens[n].text)) { j = close + 1; continue; }

        return close;
      }

      if (t.text === ';') return j;
      if (closes.includes(t.text)) return before[j];

      j++;
    }

    return tokens.length - 1;
  };

  const find = (from: number, to: number, names: string[]) => {
    let j = from;

    while (j >= 0 && j <= to) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (carries.includes(t.text)) { j = jump(j); continue; }
      if (t.kind === 'word' && names.includes(t.text) && keyword(tokens, before, j)) return j;
      if (t.kind === 'punct' && names.includes(t.text)) return j;

      j++;
    }

    return -1;
  };

  const sigil = (from: number, to: number) => {
    let j = from;

    while (j >= 0 && j <= to) {
      const t = tokens[j];

      if (t.kind === 'comment') { j++; continue; }
      if (carries.includes(t.text)) { j = jump(j); continue; }
      if (sigils[j] >= 0) return j;

      j++;
    }

    return -1;
  };

  const leaves = (i: number) => i >= 0 && tokens[i].kind === 'word' && exits.includes(tokens[i].text);

  const loose = (i: number) => body[i] === 0;

  const holding = (open: number, names: string[]) => {
    const f = holds[open];
    const close = twin[open];

    for (let j = open + 1; j >= 0 && j < close; j++) {
      if (!starts[j] || owner[j] !== f) continue;
      if (tokens[j].kind === 'word' && names.includes(tokens[j].text)) return j;
    }

    return -1;
  };

  const head = (open: number) => {
    const arrow = before[open];
    if (arrow < 0 || tokens[arrow].text !== '=>') return -1;

    const p = before[arrow];
    if (p < 0) return -1;

    let at = p;
    if (tokens[p].text === ')') { const o = twin[p]; if (o < 0) return -1; at = o; }

    const g = before[at];
    if (g >= 0 && tokens[g].text === '>') {
      let depth = 0;

      for (let j = g; j >= 0; j--) {
        if (tokens[j].text === '>') depth++;

        if (tokens[j].text === '<') {
          depth--;
          if (depth === 0) { at = j; break; }
        }
      }
    }

    return tokens[at].from;
  };

  const rename = (from: number, to: number, name: string, held: string) => {
    for (let j = from; j <= to && j < tokens.length; j++) {
      const t = tokens[j];
      if (t.kind !== 'word' || t.text !== name || !keyword(tokens, before, j)) continue;
      if (after[j] >= 0 && tokens[after[j]].text === ':') continue;

      edits.push({ from: t.from, to: t.to, text: held });
    }
  };

  const guard = (i: number) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');

    const t = tokens[i];
    const p = after[i];
    if (p < 0 || tokens[p].text !== '(') return no(i, 'guard states what must hold, in parens');

    const close = twin[p];
    if (close < 0) return no(i, 'guard has no closing paren');

    edits.push({ from: t.from, to: tokens[p].to, text: 'if (!(' });

    const n = after[close];
    if (n < 0) return no(i, 'guard has no tail');

    const fallible = frames[body[i]].fallible;
    const declines = 'a guard in a fallible body has to say how it failed; use err';

    if (tokens[n].text === ';') {
      if (fallible) return no(i, declines);

      edits.push({ from: tokens[close].to, to: tokens[n].to, text: ') return;' });
      return;
    }

    if (tokens[n].text === '{') {
      const answers = holding(n, ['return', 'ok']);
      if (answers >= 0) return no(answers, 'a guard declines; to leave with a value, use if');

      edits.push({ from: tokens[close].to, to: tokens[close].to, text: ')' });

      if (leaves(frames[holds[n]].last)) return;
      if (fallible) return no(i, declines);

      edits.push({ from: tokens[twin[n]].from, to: tokens[twin[n]].from, text: 'return; ' });
      return;
    }

    if (tokens[n].text === 'return' || tokens[n].text === 'ok') return no(n, 'a guard declines; to leave with a value, use if');

    const last = ends(n);
    if (tokens[last].text !== ';') return no(n, 'a guard tail needs a semicolon');

    if (leaves(n)) {
      edits.push({ from: tokens[close].to, to: tokens[close].to, text: ')' });
      return;
    }

    if (fallible) return no(i, declines);

    edits.push({ from: tokens[close].to, to: tokens[close].to, text: ') {' });
    edits.push({ from: tokens[last].to, to: tokens[last].to, text: ' return; }' });
  };

  const conditional = (i: number) => {
    const t = tokens[i];
    const p = after[i];
    if (p < 0 || tokens[p].text !== '(') return no(i, 'an if tests a condition in parens');

    const close = twin[p];
    if (close < 0) return no(i, 'an if has no closing paren');

    let j = after[close];
    let other = -1;

    while (j >= 0 && j < tokens.length) {
      const tk = tokens[j];

      if (tk.kind === 'comment') { j++; continue; }
      if (carries.includes(tk.text)) { j = jump(j); continue; }
      if (tk.kind === 'word' && tk.text === 'else') { other = j; break; }
      if (tk.text === ';' || tk.text === ',' || closes.includes(tk.text)) break;

      j++;
    }

    if (other < 0) return no(i, 'an if expression needs an else; both sides have to produce a value');

    const declined = find(after[close], other, ['ok', 'err']);
    if (declined >= 0) return no(declined, 'an if expression answers; to decline, use guard');

    edits.push({ from: t.from, to: tokens[p].to, text: '' });
    edits.push({ from: tokens[close].from, to: tokens[close].to, text: ' ?' });
    edits.push({ from: tokens[other].from, to: tokens[other].to, text: ':' });

    consumed[other] = true;

    const n = after[other];
    if (n >= 0 && tokens[n].text === 'if') expressions[n] = true;
  };

  const matching = (i: number) => {
    const t = tokens[i];
    const p = after[i];
    const close = twin[p];
    const open = after[close];
    const end = twin[open];
    if (end < 0) return no(i, 'a match has no closing brace');

    const arms: number[] = [];

    for (let j = after[open]; j >= 0 && j < end;) {
      arms.push(j);

      const comma = find(j, end - 1, [',']);
      if (comma < 0) break;

      j = after[comma];
    }

    let branching = false;
    for (const arm of arms) if (tokens[arm].text === ':') branching = true;

    const one = before[close] === after[p];
    const named = one && tokens[after[p]].kind === 'word';
    const name = branching && !named ? temp(i) : '';

    if (!branching || named) edits.push({ from: t.from, to: tokens[p].to, text: '(() => { switch (' });
    else edits.push({ from: t.from, to: tokens[p].to, text: `(() => { const ${name} = ` });

    if (branching && named) edits.push({ from: tokens[close].from, to: tokens[close].from, text: '.branch' });
    if (branching && !named) edits.push({ from: tokens[close].from, to: tokens[close].to, text: `; switch (${name}.branch)` });

    edits.push({ from: tokens[end].from, to: tokens[end].to, text: '} })()' });

    const carried = named ? `${tokens[after[p]].text}.value` : `${name}.value`;
    let wild = false;

    for (const arm of arms) {
      const arrow = find(arm, end - 1, ['=>']);
      if (arrow < 0) return no(arm, 'a match arm answers with =>');

      const answer = after[arrow];
      if (answer < 0 || answer >= end) return no(arrow, 'a match arm needs an answer');

      const wildcard = tokens[arm].text === '_';
      const branch = tokens[arm].text === ':';

      if (wildcard) wild = true;
      if (branching && !wildcard && !branch) return no(arm, 'a match reads branches or reads values, never both');
      if (!branching && branch) return no(arm, 'a :tag arm needs a subject that carries branches');

      let label = '';
      let bind = -1;

      if (branch) {
        const tag = after[arm];
        if (tag < 0 || tokens[tag].kind !== 'word') return no(arm, 'a : arm names a branch');

        label = `case '${tokens[tag].text}':`;
        bind = after[tag];
      }

      if (wildcard) { label = 'default:'; bind = after[arm]; }

      let bound = '';

      if (bind >= 0 && bind < arrow && tokens[bind].text === '(') {
        if (!branching) return no(bind, 'only a branch arm binds a value');

        const shut = twin[bind];
        const inner = after[bind];
        if (shut < 0 || inner < 0 || inner >= shut) return no(bind, 'an arm binds a name, or nothing at all');

        bound = tokens[inner].text;
      }

      if (label === '' && tokens[before[arrow]].text === ')') return no(arm, 'only a branch arm binds a value');

      const block = tokens[answer].text === '{';

      if (label === '') {
        edits.push({ from: tokens[arm].from, to: tokens[arm].from, text: 'case ' });
        edits.push({ from: tokens[before[arrow]].to, to: tokens[arrow].to, text: ':' });
      }
      else {
        const opens = block || bound === '' ? `${label} ` : `${label} { const ${bound} = ${carried}; return `;
        edits.push({ from: tokens[arm].from, to: tokens[answer].from, text: opens });
      }

      const comma = find(answer, end - 1, [',']);

      if (block) {
        if (bound !== '') edits.push({ from: tokens[answer].to, to: tokens[answer].to, text: ` const ${bound} = ${carried};` });
        if (comma >= 0) edits.push({ from: tokens[comma].from, to: tokens[comma].to, text: '' });

        continue;
      }

      if (label === '' || bound === '') edits.push({ from: tokens[answer].from, to: tokens[answer].from, text: 'return ' });

      const shut = bound === '' ? ';' : '; }';

      if (comma >= 0) edits.push({ from: tokens[comma].from, to: tokens[comma].to, text: shut });
      else {
        const last = before[end];
        edits.push({ from: tokens[last].to, to: tokens[last].to, text: shut });
      }
    }

    if (!wild) return no(i, 'a match needs a _ arm; exhaustiveness is not the transpiler\'s job');
  };

  const propagate = (i: number, init: number, land?: Landing) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');

    const name = temp(i);
    const n = after[init];
    if (n < 0) return no(init, 'try needs an expression');

    const last = ends(init);
    if (tokens[last].text !== ';') return no(init, 'a try statement needs a semicolon');

    const cut = tokens[n].line === tokens[init].line ? tokens[n].from : tokens[init].to;

    edits.push({ from: tokens[i].from, to: cut, text: `const ${name} = ` });

    const lands = land === undefined ? '' : ` ${land.open}${name}.value${land.close};`;
    edits.push({ from: tokens[last].to, to: tokens[last].to, text: ` if (${name}.branch === 'err') return ${name};${lands}` });
  };

  const declining = (i: number, init: number, at: number, land?: Landing) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');

    const tests: string[] = [];
    const name = temp(i);
    const stop = tokens[before[at]].to;
    const fallible = frames[body[i]].fallible;

    let cursor = at;
    let unwraps = false;
    let refuses = false;
    let tip = at;

    while (cursor >= 0 && sigils[cursor] >= 0) {
      const tag = sigils[cursor];
      const word = tokens[tag].text;

      if (tokens[cursor].text === 'any') {
        if (word !== 'some' && word !== 'none') return no(tag, 'any: takes some or none, and nothing else');

        tests.push(`is.${word}(${name})`);
        refuses = refuses || word === 'some';
      }
      else {
        tests.push(`${name}.branch === '${word}'`);
        unwraps = true;
      }

      tip = tag;
      cursor = after[tag];
    }

    const cond = tests.join(' || ');
    const held = unwraps ? `${name}.value` : name;
    const kind = tokens[at].text === 'any' ? 'any:' : 'on:';
    const declines = `an ${kind} in a fallible body has to say how it failed; use err`;
    const lands = land === undefined ? '' : ` ${land.open}${held}${land.close};`;

    edits.push({ from: tokens[i].from, to: tokens[init].from, text: `const ${name} = ` });

    let bound = '';

    if (cursor >= 0 && tokens[cursor].text === '(') {
      if (!unwraps) return no(cursor, 'any: binds nothing; absence carries no value');

      const close = twin[cursor];
      if (close < 0) return no(tip, 'the binding has no closing paren');

      const inner = after[cursor];
      if (inner < 0 || inner >= close) return no(tip, 'a decline binds a name, or nothing at all');

      bound = tokens[inner].text;
      cursor = after[close];
    }

    if (cursor < 0) return no(tip, `${kind} needs a tail`);
    if (refuses && tokens[cursor].text === '=>') return no(cursor, 'any:some declines and never answers; what survives it is absence');

    if (tokens[cursor].text === '=>') {
      const answer = after[cursor];
      if (answer < 0) return no(cursor, 'a fallback needs a value');
      if (land === undefined) return no(at, 'a fallback needs somewhere to land; bind it or return it');

      const last = ends(at);
      if (tokens[last].text !== ';') return no(at, 'a fallback needs a semicolon');

      if (tokens[answer].text === '{') {
        const close = twin[answer];
        if (close < 0) return no(answer, 'a fallback block has no closing brace');

        const opens = frames[holds[answer]].suspends ? 'await (async () => ' : '(() => ';
        edits.push({ from: stop, to: tokens[answer].from, text: `; ${land.open}${cond} ? ${opens}` });
        edits.push({ from: tokens[close].to, to: tokens[close].to, text: `)() : ${held}${land.close}` });

        if (bound !== '') rename(answer, close, bound, held);
        return;
      }

      edits.push({ from: stop, to: tokens[answer].from, text: `; ${land.open}${cond} ? ` });
      edits.push({ from: tokens[last].from, to: tokens[last].from, text: ` : ${held}${land.close}` });

      if (bound !== '') rename(answer, before[last], bound, held);
      return;
    }

    if (tokens[cursor].text === ';') {
      if (fallible) return no(at, declines);

      edits.push({ from: stop, to: tokens[cursor].to, text: `; if (${cond}) return;${lands}` });
      return;
    }

    if (tokens[cursor].text === '{') {
      const close = twin[cursor];
      if (close < 0) return no(cursor, 'a tail block has no closing brace');

      const answers = holding(cursor, ['return', 'ok']);
      if (answers >= 0) return no(answers, `an ${kind} declines; to answer, use =>`);

      edits.push({ from: stop, to: tokens[cursor].from, text: `; if (${cond}) ` });
      if (bound !== '') edits.push({ from: tokens[cursor].to, to: tokens[cursor].to, text: ` const ${bound} = ${held};` });

      if (!leaves(frames[holds[cursor]].last)) {
        if (fallible) return no(at, declines);

        edits.push({ from: tokens[close].from, to: tokens[close].from, text: 'return; ' });
      }

      const semi = after[close] >= 0 && tokens[after[close]].text === ';' ? after[close] : -1;
      const landed = semi >= 0 ? tokens[semi].to : tokens[close].to;

      edits.push({ from: landed, to: landed, text: lands });
      return;
    }

    if (tokens[cursor].text === 'return' || tokens[cursor].text === 'ok') return no(cursor, `an ${kind} declines; to answer, use =>`);

    const last = ends(cursor);
    if (tokens[last].text !== ';') return no(cursor, `an ${kind} tail needs a semicolon`);

    const binds = bound === '' ? '' : `const ${bound} = ${held}; `;
    const tail = leaves(cursor) ? '' : 'return; ';
    if (tail !== '' && fallible) return no(at, declines);

    const braced = binds !== '' || tail !== '';
    edits.push({ from: stop, to: tokens[cursor].from, text: `; if (${cond}) ${braced ? `{ ${binds}` : ''}` });
    edits.push({ from: tokens[last].to, to: tokens[last].to, text: `${braced ? ` ${tail}}` : ''}${lands}` });
  };

  const exit = (i: number) => {
    if (loose(i)) return no(i, 'a file has no body to leave; wrap it in an arrow');

    const t = tokens[i];
    const land = wraps[t.text];
    const kind = frames[body[i]].kind;

    const held = kind === 'match' ? 'a match arm' : 'a fallback';
    if (kind === 'match' || kind === 'iife') return no(i, `${t.text} would leave the iife rather than the function; ${held} answers with return`);

    const n = after[i];

    if (n < 0 || tokens[n].text === ';') {
      edits.push({ from: t.from, to: t.to, text: `${land.open}${land.close}` });
      return;
    }

    const last = ends(i);
    if (tokens[last].text !== ';') return no(i, `${t.text} needs a semicolon`);

    const cut = tokens[n].line === t.line ? tokens[n].from : t.to;
    edits.push({ from: t.from, to: cut, text: land.open });
    edits.push({ from: tokens[last].from, to: tokens[last].from, text: land.close });
  };

  const statement = (i: number) => {
    const t = tokens[i];

    if (t.text === 'guard') return guard(i);

    let init = i;
    let land: Landing | undefined = undefined;

    if (t.text === 'const' || t.text === 'let') {
      const last = ends(i);
      const eq = find(after[i], last, ['=']);
      if (eq < 0) return;

      init = after[eq];
      if (init < 0) return;

      const binder = source.slice(tokens[after[i]].from, tokens[before[eq]].to);
      land = { open: `${t.text} ${binder} = `, close: '' };
    }
    else if (wraps[t.text] !== undefined) {
      init = after[i];
      if (init < 0) return exit(i);

      land = wraps[t.text];
    }

    const last = ends(init);

    if (tokens[init].text === 'try' && keyword(tokens, before, init)) return propagate(i, init, land);

    const at = sigil(init, last);
    if (at >= 0) return declining(i, init, at, land);

    if (wraps[t.text] !== undefined && t.text !== 'return') return exit(i);
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'comment') continue;

    if (t.kind === 'punct') {
      if (t.text === '==') edits.push({ from: t.from, to: t.to, text: '===' });
      if (t.text === '!=') edits.push({ from: t.from, to: t.to, text: '!==' });

      continue;
    }

    if (t.kind !== 'word' || !keyword(tokens, before, i)) continue;

    if (t.text === 'else' && !consumed[i]) return no(i, 'else after an if statement is refused; the funnel is the flow');

    if (t.text === 'if' && (expressions[i] || !starts[i])) {
      const bad = conditional(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (t.text === 'match' && after[i] >= 0 && tokens[after[i]].text === '(' && twin[after[i]] >= 0 && after[twin[after[i]]] >= 0 && tokens[after[twin[after[i]]]].text === '{') {
      const bad = matching(i);
      if (bad !== undefined) return bad;

      continue;
    }

    if (!starts[i]) continue;
    if (frames[owner[i]].kind === 'object') continue;

    const bad = statement(i);
    if (bad !== undefined) return bad;
  }

  for (let f = 1; f < frames.length; f++) {
    const frame = frames[f];
    if (frame.kind !== 'body') continue;

    if (frame.fallible && frame.answers) return no(frame.open, 'a body answers with one of return, ok and err, or async; this one mixes them');
    if (frame.promises && (frame.fallible || frame.answers)) return no(frame.open, 'a body answers with one of return, ok and err, or async; this one mixes them');
    if (frame.promises && frame.suspends) return no(frame.open, 'a body that awaits is a promise already; async x is for one that does not');

    if (frame.suspends) {
      const at = head(frame.open);
      if (at >= 0) edits.push({ from: at, to: at, text: 'async ' });
    }

    if (frame.fallible && !leaves(frame.last) && frame.close >= 0) {
      edits.push({ from: tokens[frame.close].from, to: tokens[frame.close].from, text: 'return result.ok(); ' });
    }
  }

  return result.ok(edits);
};

/** the typescript a tz source emits, one line for one line */
export const emit = (source: string) => {
  const lexed = lex(source);
  if (lexed.branch === 'err') return lexed;

  const read = scan(lexed.value);

  const banned = ban(lexed.value, read);
  if (banned.branch === 'err') return banned;

  const written = rewrite(source, lexed.value, read);
  if (written.branch === 'err') return written;

  return result.ok(apply(source, written.value));
};
