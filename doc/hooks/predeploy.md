# Pre Deploy Example

Fires after the CLI converts your source files to Metadata API format but before it sends the files to the org.

The following example modifies profiles to remove certain user permissions when they're being deployed.

```typescript
import { PreDeployItem, PreDeployResult, SfdxContext } from 'sfdx-flexi-plugin/lib/types';
import { parseStringPromise, Builder } from 'xml2js';
import * as fs from 'fs/promises';

const DEFAULT_PERMISSION_TO_REMOVE = [
    "ManageDashboards",
    "EditPublicReports",
    "EditReports"
];

const permissionsToRemove = [
    ...DEFAULT_PERMISSION_TO_REMOVE
];

// permissions from env
const envRemove = process.env.SF_PERMISSION_TO_REMOVE;
if (envRemove) {
    const envPerms = envRemove.split(' ');
    envPerms.forEach(envPerm => {
        if (envPerm && envPerm.trim()) {
            permissionsToRemove.push(envPerm.trim());
        }
    });
}

const getMetadataName = (item: PreDeployItem): string => {
    return item.workspaceElements && item.workspaceElements.length > 0
        ? item.workspaceElements[0].metadataName
        : undefined;
};

/**
 * Removes the specified permissions from the specified profile or permission set
 * @param path 
 * @param type 
 * @param permissionsToRemove 
 * @returns 
 */
export const removeUserPermissions = async (path: string, permissionsToRemove: string[]): Promise<boolean> => {
    const source = await fs.readFile(path, { encoding: "utf8" });
    const wrapper = await parseStringPromise(source);
    const root = wrapper?.Profile || wrapper?.PermissionSet;
    const userPermissions = root?.userPermissions;
    if (!userPermissions || userPermissions.length === 0) {
        return false;
    }

    let modified = false;
    permissionsToRemove.forEach(perm => {
        const permIdx = userPermissions.findIndex(userPermission => {
            return (
                userPermission.name &&
                userPermission.name.length > 0 &&
                userPermission.name[0] === perm
            );
        });
        if (permIdx >= 0) {
            userPermissions.splice(permIdx, 1);
            modified = true;
        }
    });

    if (modified) {
        const xml = new Builder().buildObject(wrapper);
        await fs.writeFile(path, xml);
    }

    return modified;
};

const removePermissions = async (item: PreDeployItem, context: SfdxContext) => {
    const name = getMetadataName(item);
    // only looking at profiles and permission sets
    if (name !== "Profile" && name !== "PermissionSet") {
        return;
    }

    const modified = await removeUserPermissions(item.mdapiFilePath, permissionsToRemove);

    if (modified) {
        context.ux.log('-- Modified User Permissions in ' + item.mdapiFilePath);
    }
};

export default async (context: SfdxHookContext<PreDeployResult>): Promise<void> => {
    const result = context.result;
    const itemKeys = Object.keys(result);
    for (const key of itemKeys) {
        const item = result[key];
        await removePermissions(item, context);
    }
};
```

If this file were present in the project under the `hooks/predeploy.ts` folder, we can configure it in `sfdx-project.json` as follows:


## Configuration

The hooks can be configured with a plugin entry in `sfdx-project.json` - e.g.:

```json
{
    "plugins": {
        "flexi": {
            "hooks": {
                "predeploy": "hooks/predeploy.ts"
            }
        }
    }
}
```
