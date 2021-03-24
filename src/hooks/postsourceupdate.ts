import { createScriptDelegate } from "./common";
import { HookType, PostSourceUpdateResult } from "../types";

export const hook = createScriptDelegate<PostSourceUpdateResult>(HookType.postsourceupdate);