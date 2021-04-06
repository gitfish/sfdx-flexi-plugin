import { HookType } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate(HookType.prerun);
