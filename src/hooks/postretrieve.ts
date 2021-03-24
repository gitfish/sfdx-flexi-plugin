import { createScriptDelegate } from "./common";
import { HookType, PostRetrieveItem } from "../types";

export const hook = createScriptDelegate<PostRetrieveItem>(HookType.postretrieve);