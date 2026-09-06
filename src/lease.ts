import { branch, Union } from './branch.js';
import { Result, result, scope } from './result.js';

/** how a lease ends: with the value the use produced, or at the step that threw */
export type Lease<V> = Result<V, Union<{ open: unknown, use: unknown, close: unknown, abort: unknown; }>>;

/** hold a resource for exactly as long as it takes to use it */
export const lease = {
  sync: <R, V>(x: {
    open: () => R,
    use: (r: R) => V,
    close: (r: R) => void,
    abort: (r: R) => void;
  }) => {
    const open = scope.sync(x.open);
    if (open.branch === 'error') return result.error(branch('open', open.value));

    const use = scope.sync(x.use, open.value);

    if (use.branch === 'error') {
      const abort = scope.sync(x.abort, open.value);
      if (abort.branch === 'error') return result.error(branch('abort', abort.value));

      return result.error(branch('use', use.value));
    }

    const close = scope.sync(x.close, open.value);
    if (close.branch === 'error') return result.error(branch('close', close.value));

    return result.success(use.value);
  },
  async: async <R, V>(x: {
    open: () => Promise<R>,
    use: (r: R) => Promise<V>,
    close: (r: R) => Promise<void>,
    abort: (r: R) => Promise<void>;
  }) => {
    const open = await scope.async(x.open);
    if (open.branch === 'error') return result.error(branch('open', open.value));

    const use = await scope.async(x.use, open.value);

    if (use.branch === 'error') {
      const abort = await scope.async(x.abort, open.value);
      if (abort.branch === 'error') return result.error(branch('abort', abort.value));

      return result.error(branch('use', use.value));
    }

    const close = await scope.async(x.close, open.value);
    if (close.branch === 'error') return result.error(branch('close', close.value));

    return result.success(use.value);
  }
};
