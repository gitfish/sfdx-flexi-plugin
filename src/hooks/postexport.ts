import { HookType, PostExportResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostExportResult>({
    type: HookType.postexport
});
