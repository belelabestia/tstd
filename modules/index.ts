// modules with global naming, like `branch` or `Prettify<T>`
export * from './branch';
export * from './brand';
export * from './make';
export * from './prettify';

// modules with scoped naming, like `defer.sync/async` or `is.array/record/etc`
export * as defer from './defer';
export * as is from './is';
export * as task from './task';
export * as use from './use';
