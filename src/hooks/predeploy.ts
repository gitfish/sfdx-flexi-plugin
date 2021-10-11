import { HookType, PreDeployResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PreDeployResult>({
    type: HookType.predeploy
});
