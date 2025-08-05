import { Brand } from './brand';

// type branding is a very clever technique, but it's usually overengineered;
// all we really need is the brand, not the branded type.
type Int = number & Brand<'Int'>;
declare const int: Int;

// this decouples the trait or requirement you're trying to mark from the runtime type
// and makes it easier to involve brands in type algebra:
type Truhty = Brand<'Truthy'>;
type Trimmed = string & Brand<'Trimmed'>;
type Valid = (number | Trimmed) & Truhty;

// after you've defined your branded types you can create type guards for them
const number = (x: unknown) => typeof x === 'number';
const truthy = (x: unknown): x is Truhty => Boolean(x);
const trimmed = (x: unknown): x is Trimmed => typeof x === 'string' && x.trim() === x;

// this way, boolean algebra and type algebra match perfectly:
const valid = (x: unknown): x is Valid => (number(x) || trimmed(x)) && truthy(x);

// now you can be very specific about function parameter types:
const veryStrictFunction = (x: Valid) => {};

// and you can only pass runtime-validated values without ever doing a type assertion:
declare const x: unknown;
if (valid(x)) veryStrictFunction(x);
