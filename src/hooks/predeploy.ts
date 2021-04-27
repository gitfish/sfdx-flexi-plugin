import { HookType, PreDeployResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreDeployResult>(HookType.predeploy);
