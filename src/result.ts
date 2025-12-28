import { branch, Union } from './branch';

/** a particularly useful union type */
export type Result<S, E> = Union<{ success: S; error: E; }>;

/** convenience factory api */
export const result = {
  success: <X = void>(x?: X) => branch('success', x),
  error: <X = void>(x?: X) => branch('error', x)
};

/** convert a constructor into a safe function call returning a result */
export const make = <Args extends unknown[], Instance>(c: new (...args: Args) => Instance, ...args: Args) => {
  try {
    return result.success(new c(...args));
  }
  catch (error) {
    return result.error(error);
  }
};

/** safely call functions */
export const scope = {
  sync: <Args extends unknown[], Value>(f: (...args: Args) => Value, ...args: Args) => {
    try {
      return result.success(f(...args));
    }
    catch (error) {
      return result.error(error);
    }
  },
  async: async <Args extends unknown[], Value>(f: (...args: Args) => Promise<Value>, ...args: Args) => {
    try {
      return result.success(await f(...args));
    }
    catch (error) {
      return result.error(error);
    }
  }
};
