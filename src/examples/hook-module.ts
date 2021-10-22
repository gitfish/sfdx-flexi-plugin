import { PostOrgCreateResult, PrePushResult, SfdxHookContext } from "../types";

export const prepush = async (context: SfdxHookContext<PrePushResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Push - need to do something meaningful with this');
    ux.logJson(result);
};

export const postorgcreate = async (context: SfdxHookContext<PostOrgCreateResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Deploy - need to do something meaningful with this');
    ux.logJson(result);
};