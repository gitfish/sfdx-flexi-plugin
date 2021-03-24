import { createScriptDelegate, HookType } from "./common";

export interface PostOrgCreateResult {
    accessToken: string;
    clientId: string;
    created: string;
    createdOrgInstance: string;
    devHubUsername: string;
    expirationDate: string;
    instanceUrl: string;
    loginUrl: string;
    orgId: string;
    username: string;
}


export const hook = createScriptDelegate<PostOrgCreateResult>(HookType.postorgcreate);