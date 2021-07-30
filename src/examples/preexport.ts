import {
    SfdxContext,
    PreExportResult
} from "../types";

export const run = async (context: SfdxContext<PreExportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Export Result');
    ux.logJson(result);
};