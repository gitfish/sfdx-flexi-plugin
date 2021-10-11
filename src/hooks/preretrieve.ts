import { HookType, PreRetrieveResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PreRetrieveResult>({
    type: HookType.preretrieve
});
