import { createScriptDelegate, HookType } from "./common";

export interface PostRetrieveItem {
    mdapiFilePath: string;
}

export interface PostRetrieveResult {
    [itemName: string]: PostRetrieveItem;
}


export const hook = createScriptDelegate<PostRetrieveItem>(HookType.postretrieve);