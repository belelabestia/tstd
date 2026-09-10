import { result } from '@belelabestia/tstd';
import { Token } from './lex.js';
import { Scan, keyword, modifier } from './scan.js';
import { refusal } from './refusal.js';

const instead: Record<string, string> = {
  class: 'a module, or a closure with an init',
  function: 'an arrow const',
  this: 'an argument',
  new: 'make',
  interface: 'type',
  enum: 'Union',
  var: 'const, or let',
  namespace: 'a file',
  module: 'a file',
  any: 'unknown',
  instanceof: 'a guard',
  yield: 'a loop',
  abstract: 'gone with class',
  implements: 'gone with class',
  private: 'gone with class',
  protected: 'gone with class',
  public: 'gone with class',
  super: 'gone with class',
  throw: 'err',
  switch: 'match',
  catch: 'call.sync, call.async, or try',
  finally: 'call.sync, call.async, or try'
};

const absence = ['null', 'undefined'];

const optional = [',', ')', ']'];

/** refuses the first line of source that is not typezig */
export const ban = (tokens: Token[], scanned: Scan) => {
  const { frames, owner, twin, starts, before, after, sigils } = scanned;

  let typing = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === 'comment') continue;

    const no = (message: string) => result.err(refusal(t.line, t.column, message));

    if (starts[i]) {
      if (typing >= 0 && owner[i] === typing) typing = -1;

      const declaring = t.text === 'type' || (t.text === 'export' && after[i] >= 0 && tokens[after[i]].text === 'type');
      if (declaring) typing = owner[i];
    }

    if (t.kind === 'punct') {
      if (t.text === '===' || t.text === '!==') return no(`${t.text} is refused; == and != already emit it`);
      if (t.text === '??' || t.text === '??=') return no('?? is refused; any:none says which half it is doing');

      if (t.text === '==' || t.text === '!=') {
        const l = before[i] >= 0 && absence.includes(tokens[before[i]].text);
        const r = after[i] >= 0 && absence.includes(tokens[after[i]].text);

        if (l || r) return no('comparing against null or undefined is refused; is.some and is.none say presence');
      }

      if (t.text === '?' && typing < 0 && after[i] >= 0 && tokens[after[i]].text !== ':' && !optional.includes(tokens[after[i]].text)) {
        return no('?: is refused; the if expression is the one conditional');
      }

      continue;
    }

    if (t.kind !== 'word') continue;
    if (!keyword(tokens, before, i)) continue;

    const property = after[i] >= 0 && tokens[after[i]].text === ':' && frames[owner[i]].kind === 'object';
    if (property) continue;

    if (sigils[i] >= 0) continue;

    const banned = instead[t.text];
    if (banned !== undefined) return no(`${t.text} is refused; use ${banned}`);

    if (t.text === 'try' && after[i] >= 0 && tokens[after[i]].text === '{') {
      return no('the typescript try is refused; use call.sync, call.async, or the tz try');
    }

    if (t.text === 'return' && (after[i] < 0 || tokens[after[i]].text === ';' || tokens[after[i]].text === '}')) {
      return no('a bare return is refused; every one of them is a decline, so it is a guard');
    }

    if (t.text === 'async' && modifier(tokens, twin, after, i)) {
      return no('the async modifier is refused; an await in the body infers it, and async x states the rest');
    }

    if (t.text === 'Promise' && after[i] >= 0 && tokens[after[i]].text === '.' && after[after[i]] >= 0 && tokens[after[after[i]]].text === 'reject') {
      return no('Promise.reject is refused; a rejection is a throw on a later tick, so resolve with a Result');
    }

    if (frames[owner[i]].kind !== 'object') continue;

    if ((t.text === 'get' || t.text === 'set') && after[i] >= 0 && tokens[after[i]].kind === 'word') {
      const name = after[i];
      if (after[name] >= 0 && tokens[after[name]].text === '(') return no(`${t.text} is refused; a method is a function wearing a hat`);
    }

    if (after[i] >= 0 && tokens[after[i]].text === '(' && twin[after[i]] >= 0) {
      const close = twin[after[i]];
      if (after[close] >= 0 && tokens[after[close]].text === '{') return no('method shorthand is refused; write x: () => {}');
    }
  }

  return result.ok();
};
