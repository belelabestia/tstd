import { result } from './result';

type Constructor<Args extends unknown[], Instance> = new (...args: Args) => Instance;

export const make = <Args extends unknown[], Instance>(c: Constructor<Args, Instance>, ...args: Args) => {
  try {
    return result.success(new c(...args));
  }
  catch (error) {
    return result.error(error);
  }
};
