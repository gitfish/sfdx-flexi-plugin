import { PreDeployItem, PreDeployResult, SfdxHookContext } from "../types";
import { parseStringPromise, Builder } from "xml2js";
import { promises as fsp } from "fs";

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
    const source = await fsp.readFile(path, { encoding: "utf8" });
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
        await fsp.writeFile(path, xml);
    }

    return modified;
};

const removePermissions = async (item: PreDeployItem, context: SfdxHookContext) => {
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