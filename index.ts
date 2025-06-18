import { $try, defer } from './modules';
import { branch, Union } from './modules/branch';
import { $new } from './modules/new';
import { unreachable } from './modules/unreachable';

const branchEverything = () => {
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
branchEverything();

const throwUnreachable = () => {
  console.log('here i have an operation that might fork');
  const toughDecision = () => {
    const ran = Math.random();

    if (ran < 0.01) return branch('unlikely low', null);
    if (ran > 0.99) return branch('unlikely high', null);
    return branch('likely', 1);
  };

  console.log('but i only care about the likely branch');
  const res = toughDecision();

  console.log('then i can unsafely assert that the unlikely branch is unreachable');
  $try.sync(() => { if (res.branch !== 'likely') throw unreachable(); });

  console.log('unreachable is the only error you need to throw');
  const logicAssertion = () => {
    const ran = Math.random();

    console.log('this code is actually unreachable');
    if (ran < 0) throw unreachable();
  };

  console.log('you should not be concerned to make an assertion');
  logicAssertion();
};
throwUnreachable();

const niceTry = () => {
  console.log('say i have a function that throws');
  const functionThatThrows = () => {
    if (Math.random() > 0.5) throw new Error('Ops.');
    return 1;
  };

  console.log('i can wrap it with $try and get its result');

  const result = $try.sync(functionThatThrows);
  if (result.branch === 'error') {
    console.log('if there is an error i can handle it and exit early', result.value);
    return;
  }

  console.log('else i can safely work with it', result.value);
};
niceTry();

const branchingProtocols = () => {
  console.log('you can create branching protocols like this one');

  type Result<T> = Union<{ success: T, error: { message: string } }>;

  const result = {
    success: <T>(x: T) => branch('success', x),
    error: (message: string) => branch('error', { message }),
    unwrap: <T>(x: Result<T>) => {
      if (x.branch === 'error') throw unreachable();
      return x.value;
    }
  };

  console.log('and adopt them as a standard')
  const dangerousAction = () => {
    const ran = Math.random();

    if (ran < 0.5) return result.error('not enough');
    if (ran > 0.99) return result.success('incredible');
    return result.success(ran);
  };

  type Res = Result<number | string>;

  console.log('and you can assign the result to a protocol-typed variable');
  const res: Result<number | string> = dangerousAction();

  const iWantRes = (res: Res) => console.log('or pass it as a union-typed argument', res);
  iWantRes(res);

  console.log('and operate it via the protocol api');
  $try.sync(() => result.unwrap(res));
};
branchingProtocols();

const deferCleanup = async () => {
  console.log('here i have some brand new variables');
  let a = 1;
  let b = 1;

  console.log('but i need to clean them up before i go');

  using _resetA = defer.sync(() => {
    a = 0;
    console.log('a was cleaned up', { a });
  });

  await using _resetB = defer.async(() => {
    b = 0;
    console.log('b was cleaned up', { b });
    return Promise.resolve();
  });

  console.log('now i can do whatever i want');
  if (a === 0) throw unreachable();
  if (b === 0) throw unreachable();

  console.log('and resources will be cleaned up right after');
};
deferCleanup();

const initSafe = () => {
  console.log('i have a module that needs to be instantiated as a class');
  console.log('but constructors can explode so i use $new');

  const res = $new(URL, 'https://google.com');
  if (res.branch === 'error') {
    console.log('if the constructor snaps i can react', res.value);
    return;
  }

  console.log('otherwise i can work with the instance', res.value);
};
initSafe();
