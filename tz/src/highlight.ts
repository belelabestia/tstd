import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const need = createRequire(import.meta.url);
const tm: typeof import('vscode-textmate') = need('vscode-textmate');
const onig: typeof import('vscode-oniguruma') = need('vscode-oniguruma');

/** one token the way the editor sees it, text plus its scope stack */

export const token = (text: string, scopes: string[]) => ({ text, scopes });

const file = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const grammar = (name: string) => tm.parseRawGrammar(file(name), name);

/** tokenize tz files with the words injected, like vs code does */

export const highlight = async () => {
  const bytes = readFileSync(fileURLToPath(new URL('../node_modules/vscode-oniguruma/release/onig.wasm', import.meta.url)));
  await onig.loadWASM(Uint8Array.from(bytes));

  const registry = new tm.Registry({
    onigLib: Promise.resolve(onig),
    loadGrammar: async (scope) => {
      if (scope === 'source.ts') return grammar('./typescript.tmLanguage.json');
      if (scope === 'source.tz') return grammar('../editor/syntaxes/tz.tmLanguage.json');
      if (scope === 'tz.words') return grammar('../editor/syntaxes/tz-words.tmLanguage.json');
      return null;
    },
    getInjections: (scope) => (scope === 'source.tz' ? ['tz.words'] : undefined)
  });

  const tz = await registry.loadGrammar('source.tz');

  if (!tz) throw new Error('source.tz did not load');

  const cache = new Map<string, { text: string; scopes: string[] }[][]>();

  const lines = (name: string) => {
    const known = cache.get(name);
    if (known) return known;

    const out: { text: string; scopes: string[] }[][] = [];
    let stack = tm.INITIAL;

    for (const line of file(`../${name}`).split('\n')) {
      const result = tz.tokenizeLine(line, stack);
      stack = result.ruleStack;
      out.push(result.tokens.map((t) => token(line.slice(t.startIndex, t.endIndex), [...t.scopes])));
    }

    cache.set(name, out);

    return out;
  };

  const line = (name: string, n: number) => lines(name)[n - 1] ?? [];

  const snippet = (text: string) => {
    const out: { text: string; scopes: string[] }[][] = [];
    let stack = tm.INITIAL;

    for (const line of text.split('\n')) {
      const result = tz.tokenizeLine(line, stack);
      stack = result.ruleStack;
      out.push(result.tokens.map((t) => token(line.slice(t.startIndex, t.endIndex), [...t.scopes])));
    }

    return out;
  };

  return { lines, line, snippet };
};
