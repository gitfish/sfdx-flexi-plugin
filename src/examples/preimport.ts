import {
    SfdxContext,
    PreImportResult
} from "../types";

export const run = async (context: SfdxContext<PreImportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Import Result');
    ux.logJson(result);
};