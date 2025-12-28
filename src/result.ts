import { branch, Union } from './branch';

/** a particularly useful union type */
export type Result<S, E> = Union<{ success: S; error: E; }>;

/** convenience factory api */
export const result = {
  success: <X = void>(x?: X) => branch('success', x),
  error: <X = void>(x?: X) => branch('error', x)
};
