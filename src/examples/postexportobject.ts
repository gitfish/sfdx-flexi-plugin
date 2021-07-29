import {
    SfdxContext,
    PostExportObjectResult
} from "../types";

export const run = async (context: SfdxContext<PostExportObjectResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Export Object Result');
    ux.logJson(result);
};