import { HookType, PostOrgCreateResult } from '../types';
import { createScriptDelegate } from './common';

export const hook = createScriptDelegate<PostOrgCreateResult>({ hookType: HookType.postorgcreate });
