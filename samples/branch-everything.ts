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
      break;
    case 's':
      console.log('small', res.value);
      break;
    case 'm':
      console.log('medium', res.value);
      break;
    case 'l':
      console.log('large', res.value);
      break;
    case 'xl':
      console.log('extra large', res.value);
      break;
  }
};

export const branchSomething = () => {
  console.log('you can also decide to qualify only some branches');
  const onlyQualifySomeBranches = () => {
    const ran = Math.random();

    if (ran > 0.8) return branch('big', ran);
    if (ran < 0.2) return branch('small', ran);
    return;
  };

  const res = onlyQualifySomeBranches();

  console.log('you should first check against the default case');
  if (!res) {
    console.log('not an interesting size');
    return;
  }
  
  console.log('this way ts has only a string union left and will easily scaffold a switch statement');
  switch (res.branch) {
    case 'big':
      console.log('soo big', res.value);
      return;
    case 'small':
      console.log('soo small', res.value);
      return;
  }
};
