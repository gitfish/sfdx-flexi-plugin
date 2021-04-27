import { HookType, PostSourceUpdateResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostSourceUpdateResult>(HookType.postsourceupdate);
