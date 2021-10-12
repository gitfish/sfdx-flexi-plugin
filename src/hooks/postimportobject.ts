import { HookType, PostImportObjectResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostImportObjectResult>({
    type: HookType.postimportobject
});
