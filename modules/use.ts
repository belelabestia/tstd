export type Sync<Resource, Result> = {
  resource: Resource,
  dispose: (x: Resource) => unknown,
  action: (x: Resource) => Result
};

export type Async<Resource, Result> = {
  resource: Resource,
  dispose: (x: Resource) => Promise<unknown>,
  action: (x: Resource) => Promise<Result>
};

export const sync = <X, R>(x: Sync<X, R>) => {
  try { return x.action(x.resource) }
  finally { x.dispose(x.resource) }
};

export const async = async <X, R>(x: Async<X, R>) => {
  try { return await x.action(x.resource) }
  finally { await x.dispose(x.resource) }
};
