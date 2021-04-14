import { HookType, PostImportResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostImportResult>({ hookType: HookType.postimport });
