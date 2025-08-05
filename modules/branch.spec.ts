import { branch, Union } from './branch';
import { no } from './yes-no';

/*
  a little bit of theory

  branching is a technique that never really got popularized enough in the js world;
  sure, we have many kinds of runtime type checks but they aren't really ergonomic at all.

  branching simplifies pattern matching by creating a flexible return type
  that makes it easy for ts to infer types while still relying on very basic runtime checks.

  branch is a factory function used to make single branches of tagged union types;
  it's designed to work with the Union generic type.

  this design aims at staying very close to vanilla ts while significanly improving its ergonomics.
*/

export const branchEverything = () => {
  // in ts we often struggle to leverage the flexibility of a dynamic language without compromising safety;
  // `branch` is a very simple utility that enables type-safe dynamic tagged unions as a return type.

  // here we have an operation that might return in different ways:
  const toughDecision = () => {
    const ran = Math.random();

    if (ran < 0.2) return branch('xs', { a: 1 });
    if (ran < 0.4) return branch('s', 'hello');
    if (ran < 0.6) return branch('m', 2);
    if (ran < 0.8) return branch('l', [1, 2, 3]);
    return branch('xl', null);
  };

  // see how ts has inferred the return type of `toughDecision`;
  // this inferred type signature can be assigned to a union-typed variable:
  type Res = Union<{ xs: { a: number }, s: string, m: number, l: number[], xl: null }>;
  const res: Res = toughDecision();

  // or passed as a union-typed argument
  const iWantRes = (res: Res) => {};
  iWantRes(toughDecision());

  // see how ergonomic it is to make decisions:
  switch (res.branch) {
    case 'xs':
      return;
    case 's':
      return;
    case 'm':
      return;
    case 'l':
      return;
    case 'xl':
      return;
  }
};

export const branchSomething = () => {
  // sometimes you don't need to qualify a branch for a void return;
  // so you can decide to only qualify some branches:
  const onlyQualifySomeBranches = () => {
    const ran = Math.random();

    if (ran > 0.8) return branch('big', ran);
    if (ran < 0.2) return branch('small', ran);
  };

  const res = onlyQualifySomeBranches();

  // now res might be undefined so you need to check;
  // use yes/no to perform safe nullish checks:
  if (no(res)) return;

  // now ts will easily scaffold a switch statement:
  switch (res.branch) {
    case 'big':
      return;
    case 'small':
      return;
  }
};
