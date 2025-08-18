import { result } from './result';

/** turns a sync try-catch block into a result */
export const sync = <T extends unknown>(f: () => T) => {
  try { return result.success(f()) }
  catch (error) { return result.error(error as unknown) }
};

/** turns an async try-catch block into a promise of result */
export const async = async <T extends Promise<unknown>>(f: () => Promise<T>) => {
  try { return result.success(await f()) }
  catch (error) { return result.error(error as unknown) }
};
