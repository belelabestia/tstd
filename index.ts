import { branchEverything } from './samples/branch-everything';
import { branchingProtocols } from './samples/branching-protocols';
import { deferCleanup } from './samples/defer-cleanup';
import { initSafe } from './samples/init-safe';
import { niceTry } from './samples/nice-try';
import { throwUnreachable } from './samples/throw-unreachable';

branchEverything();
throwUnreachable();
niceTry();
branchingProtocols();
deferCleanup();
initSafe();
