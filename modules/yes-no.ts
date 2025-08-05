export const yes = (x: unknown): x is {} | true => {
  switch (x) {
    case false:
    case null:
    case undefined: return false;
    default: return true;
  }
};

export const no = (x: unknown) => !yes(x);
