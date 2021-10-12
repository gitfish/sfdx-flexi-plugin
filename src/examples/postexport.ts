import {
    PostExportResult,
    SfdxHookContext
} from "../types";

export const run = async (context: SfdxHookContext<PostExportResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Post Export Result');
    ux.logJson(result);
};