import { HookType, PreImportObjectResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreImportObjectResult>(HookType.preimportobject);
