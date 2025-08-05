import { task } from './index';

type Constructor<Args extends unknown[], Instance> = new (...args: Args) => Instance;
export const make = <Args extends unknown[], Instance>(c: Constructor<Args, Instance>, ...args: Args) => task.sync(() => new c(...args));
