/** Wraps a try-catch block. */
export const $try = <T>(f: () => T | Promise<T>) => {
  try {
    return { result: f() };
  }
  catch (error) {
    return { error };
  }
};
