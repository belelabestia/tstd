import { is } from '../modules';
import { branchEverything } from './branch-everything';
import { branchingProtocols } from './branching-protocols';
import { deferCleanup } from './defer-cleanup';
import { initSafe } from './init-safe';
import { niceTry } from './nice-try';
import { throwUnreachable } from './throw-unreachable';

console.log('this module is just here to propose an order of reading');
console.log('but of course you can run it too');

branchEverything();
throwUnreachable();
niceTry();
branchingProtocols();
deferCleanup();
initSafe();

console.log('hope everything was clear :)');
