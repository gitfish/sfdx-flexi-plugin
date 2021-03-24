import { createScriptDelegate } from "./common";
import { HookType, PostOrgCreateResult} from "../types";

export const hook = createScriptDelegate<PostOrgCreateResult>(HookType.postorgcreate);