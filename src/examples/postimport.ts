import {
    SfdxContext,
    PostImportResult
} from "../types";

export const run = async (context: SfdxContext<PostImportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Import Result');
    ux.logJson(result);
};