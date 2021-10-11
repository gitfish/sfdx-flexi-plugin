import {
    PreExportResult,
    SfdxHookContext
} from "../types";

export const run = async (context: SfdxHookContext<PreExportResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Pre Export Result');
    ux.logJson(result);
};