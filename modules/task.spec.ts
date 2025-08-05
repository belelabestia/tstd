import { task } from '../modules';

export const niceTry = () => {
  console.log('say i have a function that throws');
  const functionThatThrows = () => {
    if (Math.random() > 0.5) throw new Error('Ops.');
    return 1;
  };

  console.log('i can wrap it with task and get its result');

  const result = task.sync(functionThatThrows);
  if (result.branch === 'error') {
    console.log('if there is an error i can handle it and exit early', result.value);
    return;
  }

  console.log('else i can safely work with it', result.value);
};
