import {
    PostImportResult,
    SfdxHookContext
} from "../types";

export const run = async (context: SfdxHookContext<PostImportResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Post Import Result');
    ux.logJson(result);
};