import { branch, Union } from './branch.js';
import { call, Result } from './result.js';

type Resource<R> = {
  open: () => R,
  close: (r: R) => void,
  abort: (r: R) => void;
};

type Async<S> = { [K in keyof S]: S[K] extends (...args: infer A) => infer T ? (...args: A) => Promise<T> : never };

type Release = { close: () => void, abort: () => void; };

type Hold = <R>(x: Resource<R>) => Result<R, unknown>;

type Holds = <R>(x: Async<Resource<R>>) => Promise<Result<R, unknown>>;

/** how the work left the scope: with its own result, or with the throw nobody caught */
export type Exit<U> = Union<{ done: U, panic: unknown; }>;

/** how a scope ends: what the work exited with, and whatever leaked on the way out */
export type Scope<U> = {
  exit: Exit<U>,
  leaked: unknown[];
};

/** hold as many resources as the work needs, and give them all back in reverse */
export const scope = {
  sync: <U extends Result<unknown, unknown>>(work: (hold: Hold) => U) => {
    const taken: Release[] = [];

    const hold = <R>(x: Resource<R>) => {
      const open = call.sync(x.open);
      if (open.branch === 'error') return open;

      taken.push({ close: () => x.close(open.value), abort: () => x.abort(open.value) });

      return open;
    };

    const unwind = (kind: 'close' | 'abort') => {
      const leaked: unknown[] = [];

      for (const release of [...taken].reverse()) {
        const gave = call.sync(release[kind]);
        if (gave.branch === 'error') leaked.push(gave.value);
      }

      return leaked;
    };

    const done = call.sync(work, hold);
    if (done.branch === 'error') return { exit: branch('panic', done.value), leaked: unwind('abort') };

    const fail: Result<unknown, unknown> = done.value;
    if (fail.branch === 'error') return { exit: branch('done', done.value), leaked: unwind('abort') };

    return { exit: branch('done', done.value), leaked: unwind('close') };
  },
  async: async <U extends Result<unknown, unknown>>(work: (hold: Holds) => Promise<U>) => {
    const taken: Async<Release>[] = [];

    const hold = async <R>(x: Async<Resource<R>>) => {
      const open = await call.async(x.open);
      if (open.branch === 'error') return open;

      taken.push({ close: () => x.close(open.value), abort: () => x.abort(open.value) });

      return open;
    };

    const unwind = async (kind: 'close' | 'abort') => {
      const leaked: unknown[] = [];

      for (const release of [...taken].reverse()) {
        const gave = await call.async(release[kind]);
        if (gave.branch === 'error') leaked.push(gave.value);
      }

      return leaked;
    };

    const done = await call.async(work, hold);
    if (done.branch === 'error') return { exit: branch('panic', done.value), leaked: await unwind('abort') };

    const fail: Result<unknown, unknown> = done.value;
    if (fail.branch === 'error') return { exit: branch('done', done.value), leaked: await unwind('abort') };

    return { exit: branch('done', done.value), leaked: await unwind('close') };
  }
};
