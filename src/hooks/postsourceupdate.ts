import { HookType, PostSourceUpdateResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostSourceUpdateResult>({
    type: HookType.postsourceupdate
});
