# Post Org Create Example

Fires after the CLI creates a scratch org.

The following renames the default knowledge article object

```typescript
import { PostOrgCreateResult, SfdxHookContext } from 'sfdx-flexi-plugin/lib/types';

export default async (ctx: SfdxHookContext<PostOrgCreateResult>): Promise<void> => {
    const { org } = ctx;

    const conn = org.getConnection();

    // rename the article object
    const result = await conn.metadata.rename('CustomObject', 'Knowledge__kav', 'Knowledge_Article__kav');
    if(!result.success) {
        throw new Error(`Error renaming knowledge article: ${JSON.stringify(result.errors)}`);
    }
};
```

If this file were present in the project under the `hooks/postorgcreate.ts` folder, we can configure it in `sfdx-project.json` as follows:


## Configuration

The hooks can be configured with a plugin entry in `sfdx-project.json` - e.g.:

```json
{
    "plugins": {
        "flexi": {
            "hooks": {
                "postorgcreate": "hooks/postorgcreate.ts"
            }
        }
    }
}
```
