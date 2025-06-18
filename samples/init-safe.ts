import { $new } from '../modules/new';

export const initSafe = () => {
  console.log('i have a module that needs to be instantiated as a class');
  console.log('but constructors can explode so i use $new');

  const res = $new(URL, 'https://google.com');
  if (res.branch === 'error') {
    console.log('if the constructor snaps i can react', res.value);
    return;
  }

  console.log('otherwise i can work with the instance', res.value);
};
