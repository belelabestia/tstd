import { branch, Union } from './branch';

/** a particularly useful union type */
export type Result<Value, Error> = Union<{ success: Value, error: Error }>;

/** this error exists for diagnostic reasons */
export class ResultError<X> extends Error {
  constructor(public content: X) { super('Result bet error.') }
}

/** convenience api for a result branch protocol */
export const result = {
  success: <X>(x: X) => ({
    ...branch('success', x),
    bet: () => x
  }),
  error: <X>(x: X) => ({
    ...branch('error', x),
    bet: () => { throw new ResultError(x) }
  })
};
