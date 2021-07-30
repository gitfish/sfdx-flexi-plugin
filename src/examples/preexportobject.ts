import {
    SfdxContext,
    PreExportObjectResult
} from "../types";

export const run = async (context: SfdxContext<PreExportObjectResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Export Object Result');
    ux.logJson(result);
};