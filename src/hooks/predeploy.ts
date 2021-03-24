import { PreDeployResult, HookType } from "../types";
import { createScriptDelegate } from "./common";

export const hook = createScriptDelegate<PreDeployResult>(HookType.predeploy);