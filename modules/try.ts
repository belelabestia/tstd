import { branch } from './branch';

/** Wraps a sync try-catch block. */
export const sync = <T extends unknown>(f: () => T) => {
  try { return branch('result', f()); }
  catch (error) { return branch('error', error); }
};

/** Wraps an async try-catch block. */
export const async = async <T extends Promise<unknown>>(f: () => Promise<T>) => {
  try { return branch('result', await f()); }
  catch (error) { return branch('error', error); }
}
