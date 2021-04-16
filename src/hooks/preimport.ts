import { HookType, PreImportResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreImportResult>({ hookType: HookType.preimport });
