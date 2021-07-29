import {
    SfdxContext,
    PostExportResult
} from "../types";

export const run = async (context: SfdxContext<PostExportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Export Result');
    ux.logJson(result);
};