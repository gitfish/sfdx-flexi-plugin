import { HookType, PostRetrieveResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostRetrieveResult>(HookType.postretrieve);
