/** the words typecore refuses, and the line to write instead */
export const refused: Record<string, string> = {
  class: 'a module, or a closure with an init',
  function: 'an arrow const',
  this: 'an argument',
  new: 'make',
  interface: 'type',
  enum: 'Union or protocol',
  var: 'const, or let',
  namespace: 'a file',
  module: 'a file',
  any: 'unknown',
  instanceof: 'a branch test',
  yield: 'a loop',
  abstract: 'gone with class',
  implements: 'gone with class',
  private: 'gone with class',
  protected: 'gone with class',
  public: 'gone with class',
  super: 'gone with class',
  throw: 'err',
  switch: '? {}',
  catch: 'call.sync, call.async, or try',
  finally: 'call.sync, call.async, or try'
};

/** the words typecore refuses to spell, presence and absence */
export const absent: readonly string[] = ['null', 'undefined'];

/** the words the language refuses */
export const banned = Object.keys(refused);

/** the library spellings typecore warns about, and the tz form each should be */
export const warned: Record<string, string> = {
  'protocol.init': 'declare with protocol { ... }',
  'result.ok': 'construct with :ok(...)',
  'result.err': 'construct with :err(...)',
  'scope.sync': 'use scope (hold) => { ... }',
  'scope.async': 'use scope (hold) => { ... }',
  'call.sync': 'use call',
  'call.async': 'use call',
  branch: 'construct with :tag(...)',
  make: 'use make => ...'
};
