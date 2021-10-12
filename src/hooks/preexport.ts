import { HookType, PostImportResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostImportResult>({
    type: HookType.preexport
});