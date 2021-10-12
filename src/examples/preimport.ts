import {
    SfdxHookContext,
    PreImportResult
} from "../types";

export const run = async (context: SfdxHookContext<PreImportResult>): Promise<void> => {
    const { result, ux } = context;
    // do something real - I'm out of ideas
    ux.log('Pre Import Result');
    ux.logJson(result);
};