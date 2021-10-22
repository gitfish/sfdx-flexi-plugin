import { HookType, PostRetrieveHookResult } from '../types';
import { createHookDelegate } from './common';
import { SOURCE_PULL_COMMAND_ID } from './constants';

export const hook = createHookDelegate<PostRetrieveHookResult>({
    getType(opts) {
        return opts.commandId === SOURCE_PULL_COMMAND_ID ? HookType.postpull : HookType.postretrieve
    }
});
