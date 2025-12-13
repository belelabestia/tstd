import { branch, Union } from './branch';

/** a particularly useful union type */
export type Result<Value, Error> = Union<{ success: Value, error: Error; }>;

/** convenience api for a result branch protocol */
export const result = {
  success: <X = void>(x?: X) => branch('success', x),
  error: <X = void>(x?: X) => branch('error', x)
};
