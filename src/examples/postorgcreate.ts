import { PostOrgCreateResult, SfdxHookContext } from '../types';

export default async (ctx: SfdxHookContext<PostOrgCreateResult>): Promise<void> => {
    const { org } = ctx;

    const conn = org.getConnection();

    // rename the article object
    const result = await conn.metadata.rename('CustomObject', 'Knowledge__kav', 'Knowledge_Article__kav');
    if(!result.success) {
        throw new Error(`Error renaming knowledge article: ${JSON.stringify(result.errors)}`);
    }
};