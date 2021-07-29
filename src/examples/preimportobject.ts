import {
    SfdxContext,
    PreImportObjectResult
} from "../types";

const SUFFIX_HOOK = '-hook';
const OBJECT_TYPE_ACCOUNT = 'Account';

export const run = async (context: SfdxContext<PreImportObjectResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    const objectConfig = result.objectConfig;

    if (result.objectConfig.sObjectType === OBJECT_TYPE_ACCOUNT) {
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