import { HookType, PreImportResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PreImportResult>({
    type: HookType.preimport
});
