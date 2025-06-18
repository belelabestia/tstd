import { unreachable } from '../modules/unreachable';

export const throwUnreachable = () => {
  console.log('unreachable is the only error you need to throw');
  const logicAssertion = () => {
    const ran = Math.random();

    if (ran < 0) {
      console.log('this code is actually unreachable');
      throw unreachable();
    }
  };

  console.log('you should not be concerned to make an assertion');
  logicAssertion();
};
