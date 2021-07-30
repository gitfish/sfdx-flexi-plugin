import {
    PostImportObjectResult,
    SfdxContext
} from '../types';

const OBJECT_TYPE_CONTACT = 'Contact';

export default async (context: SfdxContext<PostImportObjectResult>): Promise<void> => {
    const { hook } = context;
    const result = hook.result;

    if (result.objectConfig.sObjectType === OBJECT_TYPE_CONTACT && result.state.restoreAccounts) {
        await (<() => Promise<void>>result.state.restoreAccounts)();
    }
}