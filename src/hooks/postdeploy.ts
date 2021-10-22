import { HookType, PostDeployHookResult } from '../types';
import { createHookDelegate } from './common';
import { SOURCE_PUSH_COMMAND_ID } from './constants';

export const hook = createHookDelegate<PostDeployHookResult>({
    getType(opts) {
        return opts.commandId === SOURCE_PUSH_COMMAND_ID ? HookType.postpush : HookType.postdeploy;
    }
});
