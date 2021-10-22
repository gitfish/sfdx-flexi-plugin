import { HookType, PreRetrieveHookResult } from '../types';
import { createHookDelegate } from './common';
import { SOURCE_PULL_COMMAND_ID } from './constants';

// see comment for predeploy - sf have made a bit of a meal of this
export const hook = createHookDelegate<PreRetrieveHookResult>({
    getType(opts) {
        return opts.commandId === SOURCE_PULL_COMMAND_ID ? HookType.prepull : HookType.preretrieve;
    }
});
