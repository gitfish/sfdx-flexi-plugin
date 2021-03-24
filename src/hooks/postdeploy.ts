import { createScriptDelegate } from "./common";
import { HookType, PostDeployResult } from "../types";

export const hook = createScriptDelegate<PostDeployResult>(HookType.postdeploy);
