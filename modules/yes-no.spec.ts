import { yes, no } from './yes-no';

export const ifYes = () => {
  console.log('you can use yes/no for a different boolean casting');

  let a: number | null = Math.random() > 0.5 ? 0 : null;

  if (!a) return;
  console.log('here 0 is excluded', a);

  if (no(a)) return;
  console.log('but here it is not', a);

  console.log('yes casts only false, null and undefined as false');
  console.log('you can also use it with ternary');

  const b = yes(a) ? a : 'nope';
  console.log('so b can be 0 or any other falsy non-nullish value', b);
};

export const ifNo = () => {
  console.log('since yes is mostly meant to be used in null guards, anoter utility is provided');

  let a: number | null = Math.random() > 0.5 ? 0 : null;

  if (no(a)) return;
  console.log('very convenient and ergonomic', a);
};
