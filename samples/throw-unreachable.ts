import { $try } from '../modules';
import { branch } from '../modules/branch';
import { unreachable } from '../modules/unreachable';

export const throwUnreachable = () => {
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
