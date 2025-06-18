import { $try } from '../modules';
import { Union, branch } from '../modules/branch';
import { unreachable } from '../modules/unreachable';

export const branchingProtocols = () => {
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
