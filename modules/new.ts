import { $try } from '.';

type Constructor<Args extends unknown[], Instance> = new (...args: Args) => Instance;
export const $new = <Args extends unknown[], Instance>(c: Constructor<Args, Instance>, ...args: Args) => $try.sync(() => new c(...args));
