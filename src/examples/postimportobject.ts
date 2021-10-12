import {
    PostImportObjectResult,
    SfdxHookContext
} from '../types';

const OBJECT_TYPE_CONTACT = 'Contact';

export default async (context: SfdxHookContext<PostImportObjectResult>): Promise<void> => {
    const { result } = context;

    if (result.objectConfig.object === OBJECT_TYPE_CONTACT && result.state.restoreAccounts) {
        await (<() => Promise<void>>result.state.restoreAccounts)();
    }
}