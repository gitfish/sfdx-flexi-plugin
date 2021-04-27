import { HookType, PostDeployResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostDeployResult>(HookType.postdeploy);
