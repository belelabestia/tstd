import { branch, Union } from '../modules/branch';

export const branchEverything = () => {
  console.log('i have an operation that might return in different ways');
  const toughDecision = () => {
    const ran = Math.random();

    if (ran < 0.2) return branch('xs', { a: 1 });
    if (ran < 0.4) return branch('s', 'hello');
    if (ran < 0.6) return branch('m', 2);
    if (ran < 0.8) return branch('l', [1, 2, 3]);
    return branch('xl', null);
  };

  type Res = Union<{ xs: { a: number }, s: string, m: number, l: number[], xl: null }>;

  console.log('the return value can be assigned to a union-typed variable');
  const res: Res = toughDecision();

  const iWantRes = (res: Res) => console.log('or passed as a union-typed argument', res);
  iWantRes(toughDecision());

  console.log('now i can make decisions');
  switch (res.branch) {
    case 'xs':
      console.log('extra small', res.value);
      return;
    case 's':
      console.log('small', res.value);
      return;
    case 'm':
      console.log('medium', res.value);
      return;
    case 'l':
      console.log('large', res.value);
      return;
    case 'xl':
      console.log('extra large', res.value);
      return;
  }
};
