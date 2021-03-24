import { createScriptDelegate, HookType } from "./common";

export interface PreRetrieveResult {
    packageXmlPath: string;
}


export const hook = createScriptDelegate<PreRetrieveResult>(HookType.preretrieve);