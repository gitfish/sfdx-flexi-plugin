import { HookType, PostOrgCreateResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostOrgCreateResult>({
    type: HookType.postorgcreate,
    // we override these guys for post org create so we can get org handles (and a connection) in the hook
    getOrgUsername(opts) {
        return opts.result.username;
    },
    getHubOrgUsername(opts) {
        return opts.result.devHubUsername;
    }
});
