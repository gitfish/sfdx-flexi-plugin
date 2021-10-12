import {
    PreImportObjectResult,
    SfdxHookContext
} from "../types";

const SUFFIX_HOOK = '-hook';
const OBJECT_TYPE_ACCOUNT = 'Account';

export const run = async (context: SfdxHookContext<PreImportObjectResult>): Promise<void> => {
    const { result, ux } = context;
    const objectConfig = result.objectConfig;

    if (result.objectConfig.object === OBJECT_TYPE_ACCOUNT) {
        // track the original records
        const forRestore = result.records.map((record) => {
            return { ...record };
        });

        result.records.forEach((record) => {
            record.Name += SUFFIX_HOOK;
        });

        // this will be called in the post import object example below (to restore the original account records)
        result.state.restoreAccounts = async () => {
            ux.startSpinner("Restoring Account Records");
            await result.service.saveRecords(objectConfig, forRestore);
            ux.stopSpinner();
        };
    }
};