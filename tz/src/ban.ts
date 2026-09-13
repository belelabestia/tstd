import { result } from '@belelabestia/tstd';
import { Token } from './lex.js';
import { Scan, keyword, modifier, comparisons } from './scan.js';
import { refusal } from './refusal.js';

const instead: Record<string, string> = {
  class: 'a module, or a closure with an init',
  function: 'an arrow const',
  this: 'an argument',
  new: 'make',
  interface: 'type',
  enum: 'Union or protocol',
  var: 'const, or let',
  namespace: 'a file',
  module: 'a file',
  any: 'unknown',
  instanceof: 'a branch test',
  yield: 'a loop',
  abstract: 'gone with class',
  implements: 'gone with class',
  private: 'gone with class',
  protected: 'gone with class',
  public: 'gone with class',
  super: 'gone with class',
  throw: 'err',
  switch: '? {}',
  catch: 'call.sync, call.async, or try',
  finally: 'call.sync, call.async, or try'
};

/** the words the language refuses, and the words that are not spelled */
export const banned = Object.keys(instead);
export const absent: readonly string[] = ['null', 'undefined'];

const optional = [',', ')', ']'];

/** refuses the first line of source that is not typezig */
export const ban = (tokens: Token[], scanned: Scan) => {
  const { frames, owner, twin, starts, before, after, matcher, tagged } = scanned;

  const ended = (j: number) =>
    j >= 0 && (['word', 'string', 'number', 'template', 'regex'].includes(tokens[j].kind) || tokens[j].text === ')' || tokens[j].text === ']' || tokens[j].text === '}');

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
      if (t.text === '??' || t.text === '??=') return no('?? is refused; ?none => says which half it is doing');

      if (t.text === '==' || t.text === '!=') {
        const l = before[i] >= 0 && absent.includes(tokens[before[i]].text);
        const r = after[i] >= 0 && absent.includes(tokens[after[i]].text);

        if (l || r) return no('comparing against null or undefined is refused; is.some and is.none say presence');
      }

      if (t.text === '?' && typing < 0 && matcher[i] === i) {
        const a = after[i];

        if (a >= 0 && comparisons.includes(tokens[a].text) && t.to !== tokens[a].from) return no('the operator glues onto the ?; write ?== ...');
        if (a >= 0 && (tokens[a].text === '&' || tokens[a].text === '|') && t.to !== tokens[a].from) return no('a group glues onto the ?; write ?&(...) or ?|(...)');
        if (a >= 0 && tokens[a].text === '=' && t.to === tokens[a].from) return no('?= compares nothing; compare with ?== ...');
        if (a >= 0 && tokens[a].kind === 'word' && ['none', 'some', 'ok', 'err'].includes(tokens[a].text)) {
          const w = after[a];
          if (w < 0 || tokens[w].text === ';' || tokens[w].text === ',' || tokens[w].text === ')' || tokens[w].text === ']' || tokens[w].text === '}') {
            return no('a matcher glues onto the ?; write ?none ...');
          }
        }
        if (a >= 0 && tokens[a].kind === 'word' && (tokens[a].text === 'null' || tokens[a].text === 'undefined')) return no('null and undefined are never spelled; test presence with ?none or ?some');

        let j = after[i];

        while (j >= 0) {
          const u = tokens[j];
          if (u.kind === 'comment') { j = after[j]; continue; }
          if (u.text === '(' || u.text === '[' || u.text === '{') { j = twin[j] >= 0 ? after[twin[j]] : after[j]; continue; }
          if (u.text === ')' || u.text === ']' || u.text === '}') break;
          if (u.text === ':') return no('a ? with : is a ternary; answer with ? => ... else ...');
          if (u.text === ';' || u.text === '=>' || u.text === 'else') break;
          if (u.kind === 'word' && (u.text === 'return' || u.text === 'ok' || u.text === 'err' || u.text === 'async' || u.text === 'break' || u.text === 'continue')) break;
          j = after[j];
        }
      }

      if (t.text === '?' && typing < 0 && matcher[i] < 0 && after[i] >= 0 && tokens[after[i]].text !== ':' && tokens[after[i]].text !== '{' && !optional.includes(tokens[after[i]].text)) {
        const a = after[i];

        let j = after[i];

        while (j >= 0) {
          const u = tokens[j];
          if (u.kind === 'comment') { j = after[j]; continue; }
          if (u.text === '(' || u.text === '[' || u.text === '{') { j = twin[j] >= 0 ? after[twin[j]] : after[j]; continue; }
          if (u.text === ')' || u.text === ']' || u.text === '}') break;
          if (u.text === ':') return no('a ? with : is a ternary; answer with ? => ... else ...');
          if (u.text === ';' || u.text === '=>' || u.text === 'else') break;
          if (u.kind === 'word' && (u.text === 'return' || u.text === 'ok' || u.text === 'err' || u.text === 'async' || u.text === 'break' || u.text === 'continue')) break;
          j = after[j];
        }

        if ((tokens[a].kind === 'number' || tokens[a].kind === 'string' || tokens[a].kind === 'template') && t.to === tokens[a].from) {
          return no('a value glues onto nothing; compare it with ?== ...');
        }

        if ((tokens[a].text === '-' || tokens[a].text === '+') && t.to === tokens[a].from && after[a] >= 0 && tokens[after[a]].kind === 'number' && tokens[a].to === tokens[after[a]].from) {
          return no('a value glues onto nothing; compare it with ?== ...');
        }

        if ((tokens[a].text === '-' || tokens[a].text === '+') && after[a] >= 0 && tokens[after[a]].kind === 'number' && tokens[a].to === tokens[after[a]].from) {
          return no('a comparison needs its operator; write ?== ...');
        }

        if (tokens[a].kind === 'word' && (tokens[a].text === 'true' || tokens[a].text === 'false') && t.to === tokens[a].from) {
          return no('?true and ?false are retired; a boolean subject reads cond ?');
        }

        if (tokens[a].text === '=' && t.to === tokens[a].from) {
          return no('?= compares nothing; compare with ?== ...');
        }

        if (comparisons.includes(tokens[a].text)) {
          if (t.to !== tokens[a].from) return no('the operator glues onto the ?; write ?== ...');

          const w = after[a];
          if (w >= 0 && tokens[a].to === tokens[w].from) return no('the operand takes a space; write ?== ...');
        }

        if (tokens[a].text === '&' || tokens[a].text === '|') {
          return no('a group glues onto the ?; write ?&(...) or ?|(...)');
        }

        if (tokens[a].kind === 'template' && !(t.to === tokens[a].from)) {
          return no('a template rides its ?==; write ?== `tpl`');
        }

        if ((tokens[a].kind === 'number' || tokens[a].kind === 'string' || (tokens[a].kind === 'word' && (tokens[a].text === 'true' || tokens[a].text === 'false'))) && t.to !== tokens[a].from) {
          return no('a comparison needs its operator; write ?== ...');
        }

        if (tokens[a].text === '(' && t.to !== tokens[a].from) {
          return no('a condition glues onto the ?; write ?(...)');
        }

        return no('?: is refused; answer with ? => ... else ...');
      }

      continue;
    }

    if (t.kind !== 'word') continue;
    if (!keyword(tokens, before, i)) continue;

    const property = after[i] >= 0 && tokens[after[i]].text === ':' && frames[owner[i]].kind === 'object';
    if (property) continue;

    if ((t.text === 'on' || t.text === 'any') && after[i] >= 0 && tokens[after[i]].text === ':' && after[after[i]] >= 0 && tokens[after[after[i]]].kind === 'word') {
      const middle = after[i];
      const tag = after[middle];
      if (t.to === tokens[middle].from && tokens[middle].to === tokens[tag].from && ended(before[i])) {
        return no(`${t.text}: is retired; match with ?${t.text === 'on' ? ':tag' : 'none or ?some'}`);
      }
    }

    const banned = instead[t.text];
    if (banned !== undefined) return no(`${t.text} is refused; use ${banned}`);

    if (t.text === 'try' && after[i] >= 0 && tokens[after[i]].text === '{') {
      return no('the typescript try is refused; use call.sync, call.async, or the tz try');
    }

    if (t.text === 'return' && (after[i] < 0 || tokens[after[i]].text === ';' || tokens[after[i]].text === '}')) {
      const bound = (p: number) => {
        if (p >= 0 && tagged[p] >= 0) return true;

        if (p >= 0 && tokens[p].text === ')') {
          const open = twin[p];
          if (open >= 0 && tagged[open] >= 0) return true;
          const tag = open >= 0 ? before[open] : -1;
          if (tag >= 0 && tagged[tag] >= 0) return true;
        }

        return false;
      };

      if (bound(before[i])) continue;

      const f = owner[i];
      const open = f > 0 && frames[f].kind === 'block' ? frames[f].open : -1;
      if (open >= 0 && bound(before[open])) continue;

      return no('a bare return is refused; every one of them is a decline, so it is a matcher');
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

    if (after[i] >= 0 && tokens[after[i]].text === '(' && twin[after[i]] >= 0 && !(before[i] >= 0 && tokens[before[i]].text === ':')) {
      const close = twin[after[i]];
      if (after[close] >= 0 && tokens[after[close]].text === '{') return no('method shorthand is refused; write x: () => {}');
    }
  }

  return result.ok();
};
