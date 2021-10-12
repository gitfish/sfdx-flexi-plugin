import { HookType, PostExportObjectResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostExportObjectResult>({
    type: HookType.postexportobject
});
