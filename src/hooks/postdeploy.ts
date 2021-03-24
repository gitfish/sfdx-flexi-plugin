import { createScriptDelegate, HookType } from "./common";
import { DeployResult } from "jsforce";

export const hook = createScriptDelegate<DeployResult>(HookType.postdeploy);
