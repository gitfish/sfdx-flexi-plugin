import { PostOrgCreateResult, PreDeployResult, SfdxHookContext } from "../types";

export const predeploy = async (context: SfdxHookContext<PreDeployResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Deploy - need to do something meaningful with this');
    ux.logJson(result);
};

export const postorgcreate = async (context: SfdxHookContext<PostOrgCreateResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Deploy - need to do something meaningful with this');
    ux.logJson(result);
};