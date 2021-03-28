import { createScriptDelegate } from "./common";
import { HookType } from "../types";

export const hook = createScriptDelegate<any>(HookType.prerun);