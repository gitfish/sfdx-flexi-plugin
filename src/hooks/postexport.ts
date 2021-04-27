import { HookType, PostExportResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostExportResult>(HookType.postexport);
