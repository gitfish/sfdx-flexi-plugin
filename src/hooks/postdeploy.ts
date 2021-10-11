import { HookType, PostDeployResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostDeployResult>({
    type: HookType.postdeploy
});
