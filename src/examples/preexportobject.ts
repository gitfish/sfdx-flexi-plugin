import {
    PreExportObjectResult,
    SfdxHookContext
} from "../types";

export const run = async (context: SfdxHookContext<PreExportObjectResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Pre Export Object Result');
    ux.logJson(result);
};