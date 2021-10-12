import { HookType, PreExportObjectResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PreExportObjectResult>({
    type: HookType.preexportobject
});
