import { HookType, PostExportResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostExportResult>({ hookType: HookType.postexport });
