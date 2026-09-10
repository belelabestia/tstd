/** a piece of source the language will not accept, and where it is */
export type Refusal = { line: number, column: number, message: string; };

/** states a refusal at a source position */
export const refusal = (line: number, column: number, message: string) => ({ line, column, message });
