import {
    PostExportObjectResult,
    SfdxHookContext
} from "../types";

export const run = async (context: SfdxHookContext<PostExportObjectResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Post Export Object Result');
    ux.logJson(result);
};