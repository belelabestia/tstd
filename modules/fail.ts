class UnreachableCodeError extends Error {}
export const unreachable = () => new UnreachableCodeError('Unreachable code.');
