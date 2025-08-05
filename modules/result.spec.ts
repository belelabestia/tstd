import { task, Union } from '../modules';
import { Result, result } from '../modules/result';

export const branchingProtocols = () => {
  console.log('since branches are between a function and its caller, you can usually do free-branching');
  console.log('however, some forms of branching are very common, such the result api');
  console.log('which is still very flexible in tstd');

  const dangerousAction = () => {
    const ran = Math.random();

    if (ran < 0.5) return result.error('not enough');
    if (ran > 0.99) return result.success('incredible');
    return result.success(ran);
  };

  console.log('you can assign the result to a protocol-typed variable');
  
  type R = Result<number | string, string>;
  const res: R = dangerousAction();

  type U = Union<{ success: number | string, error: string }>;
  const iWantRes = (res: U) => console.log('or pass it as a union-typed argument', res);
  iWantRes(res);

  console.log('and operate it via the protocol api');
  const finalResult = task.sync(() => {
    if (typeof dangerousAction().bet() === 'string') return 0;
    if (typeof dangerousAction().bet() === 'number') return 1;
    return dangerousAction().bet();
  });

  if (finalResult.branch === 'error') {
    console.log('the bet api throws whatever content of the error branch wrapped in a ResultError for diagnostic reasons', finalResult.value);
    console.log('however the caught error will always be unknown because javascript');
    return;
  }

  console.log('you should only bet when you really just care about the happy path', finalResult.value);
  console.log('otherwise use the standard branching technique');

  if (res.branch === 'error') return;
  console.log('this way the api stays consistent and minimal', res.value);
};
