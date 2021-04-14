import { HookType, PreExportResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PreExportResult>({ hookType: HookType.preexport });
