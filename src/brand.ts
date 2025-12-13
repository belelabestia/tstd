/** a brand property identifier that lives only at compile time */
declare const brand: unique symbol;

/** marks any type as checked against a particular requirement, without affecting its runtime value */
export type Brand<Name extends string> = { [brand]: Name };
