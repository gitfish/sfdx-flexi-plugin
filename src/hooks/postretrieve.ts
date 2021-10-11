import { HookType, PostRetrieveResult } from '../types';
import { createHookDelegate } from './common';

export const hook = createHookDelegate<PostRetrieveResult>({
    type: HookType.postretrieve
});
