import { defer } from '../modules';
import { unreachable } from '../modules/unreachable';

export const deferCleanup = async () => {
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
