import { HookType, PreImportObjectResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PreImportObjectResult>({
    type: HookType.preimportobject
});
