import { lex } from './lex.js';
import { scan, keyword } from './scan.js';
import { warned } from './typecore.js';

/** a warning on a tz line, shaped the way lsp notes are */
type Note = { line: number, column: number, level: 'warning', code: string, message: string; };

/** every library spelling in a buffer, warned with the tz form it should be */
export const smells = (text: string): Note[] => {
  const notes: Note[] = [];
  const lexed = lex(text);
  if (lexed.branch === 'err') return notes;

  const tokens = lexed.value;
  const read = scan(tokens);
  const { before, after } = read;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind !== 'word') continue;
    if (!keyword(tokens, before, i)) continue;

    const n = after[i];
    let spelling: string | undefined;

    if (n >= 0 && tokens[n].text === '.') {
      const member = after[n];
      if (member >= 0) spelling = `${t.text}.${tokens[member].text}`;
    }
    else if (n >= 0 && tokens[n].text === '(') spelling = t.text;

    const instead = spelling === undefined ? undefined : warned[spelling];
    if (instead === undefined) continue;

    notes.push({ line: t.line + 1, column: t.column + 1, level: 'warning', code: 'TZL0005', message: `${spelling} is the library spelling; ${instead}` });
  }

  return notes;
};
