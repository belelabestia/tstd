import { result } from './result';

/** Wraps a sync try-catch block. */
export const sync = <T extends unknown>(f: () => T) => {
  try { return result.success(f()) }
  catch (error) { return result.error(error as unknown) }
};

/** Wraps an async try-catch block. */
export const async = async <T extends Promise<unknown>>(f: () => Promise<T>) => {
  try { return result.success(await f()) }
  catch (error) { return result.error(error as unknown) }
};
