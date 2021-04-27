import { HookType, PreRetrieveResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreRetrieveResult>(HookType.preretrieve);
