import { HookType, PostImportObjectResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostImportObjectResult>({ hookType: HookType.postimportobject });
