import { HookType, PreExportObjectResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreExportObjectResult>(HookType.preexportobject);
