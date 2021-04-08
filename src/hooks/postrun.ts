import { HookType } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<unknown>({ hookType: HookType.postrun });
