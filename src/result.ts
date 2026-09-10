import { Union } from './branch.js';
import * as protocol from './protocol.js';

const shape = <S, E>() => ({
  success: (value: S) => {},
  error: (value: E) => {}
});

/** a particularly useful union type */
export type Result<S, E> = Union<protocol.Model<typeof shape<S, E>>>;

/** convenience factory api */
export const result = protocol.init(shape());

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
export const call = {
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
