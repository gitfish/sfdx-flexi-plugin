import { HookType, PostExportObjectResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostExportObjectResult>(HookType.postexportobject);
