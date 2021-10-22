
sfdx-flexi-plugin
==================

[![Version](https://img.shields.io/npm/v/sfdx-flexi-plugin.svg)](https://npmjs.org/package/sfdx-flexi-plugin)
[![check](https://github.com/gitfish/sfdx-flexi-plugin/actions/workflows/check.yml/badge.svg)](https://github.com/gitfish/sfdx-flexi-plugin/actions/workflows/check.yml)
[![Downloads/week](https://img.shields.io/npm/dw/sfdx-flexi-plugin.svg)](https://npmjs.org/package/sfdx-flexi-plugin)
[![License](https://img.shields.io/npm/l/sfdx-flexi-plugin.svg)](https://github.com/gitfish/sfdx-flexi-plugin/blob/master/package.json)


<!-- commands -->
Executes a function resolved from a js or ts module with a provided sfdx context

```
USAGE

  sfdx flexi:run [name=value...] [-p <string>] [-x <string>] [-v <string>] [-u <string>] [--apiversion <string>] 
  [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -p, --path=path                                                                   The script module path to load the
                                                                                    function from

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  -x, --export=export                                                               The module export to execute

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

ALIASES
  $ sfdx flexi:script
  $ sfdx flexi:execute
  $ sfdx flexi:exec

EXAMPLES
  $ sfdx flexi:run --path <module path>
  $ sfdx flexi:run --path <module path> --export <module export name>
```

_See code: [src/commands/flexi/run.ts](https://github.com/gitfish/sfdx-flexi-plugin/blob/v26.0.0/src/commands/flexi/run.ts)_
<!-- commandsstop -->


## Function resolution
The command can be run with the `--export` (`-x`) flag to specify what export to treat as the function to be invoked. If no export is specified, the plugin will resolve the function from the module in the following order of precedence

  1. The module if it's a function
  2. The default export if it's a function
  3. The first export that's a function

So the following module definitions are all equivalent when run without the export flag

```typescript
import { SfdxContext } from 'sfdx-flexi-plugin/lib/types';

export default async (context: SfdxContext) => {
    
}
```

```typescript
import { SfdxContext } from 'sfdx-flexi-plugin/lib/types';

export const run = async (context: SfdxContext) => {
    
}
```

```typescript
import { SfdxContext } from 'sfdx-flexi-plugin/lib/types';

export const main = async (context: SfdxContext) => {
    
}
```

## Sample Applications

### Deployment Summary

The following (typescript) example is used to list the status of deployments in an org:

```typescript
import { SfdxRunContext } from '../types';

export interface DeploymentSummaryArgs {
  limit: number | string;
}

export default async (context: SfdxRunContext<DeploymentSummaryArgs>): Promise<void> => {
  const { ux, org, args } = context;
  const conn = org.getConnection();
  const r = await conn.tooling.query(
    `select Id, CreatedDate, CreatedBy.Name, StartDate, CompletedDate, Status, StateDetail, CheckOnly, NumberComponentsTotal, NumberComponentErrors, NumberComponentsDeployed, NumberTestsTotal, NumberTestsCompleted, NumberTestErrors, ErrorMessage from DeployRequest ORDER BY CreatedDate desc NULLS LAST limit ${
      args.limit || 10
    }`
  );
  
  ux.table(r.records, {
    columns: [
      { key: 'Id', label: 'ID' },
      {
        key: 'Created',
        label: 'Created',
        get(row: any) {
          return `${new Date(Date.parse(row.CreatedDate)).toLocaleString()} by ${
            row.CreatedBy.Name
          }`;
        },
      },
      {
        key: 'StartDate',
        label: 'Start Date',
        get(row: any) {
          if (row.StartDate) {
            return new Date(Date.parse(row.StartDate)).toLocaleString();
          }
          return '';
        },
      },
      {
        key: 'CompletedDate',
        label: 'Completed Date',
        get(row: any) {
          if (row.CompletedDate) {
            return new Date(Date.parse(row.CompletedDate)).toLocaleString();
          }
          return '';
        },
      },
      { key: 'CheckOnly', label: 'Check Only' },
      { key: 'Status', label: 'Status' },
      {
        key: 'Components',
        label: 'Components',
        get(row: any) {
          if (row.NumberComponentsTotal) {
            if (row.NumberComponentsDeployed === row.NumberComponentsTotal) {
              return `${row.NumberComponentsTotal}`;
            }
            return `${row.NumberComponentsDeployed} / ${row.NumberComponentsTotal}`;
          }
          return '';
        },
      },
      {
        key: 'Tests',
        label: 'Tests',
        get(row: any) {
          if (row.NumberTestsTotal) {
            if (row.NumberTestsCompleted === row.NumberTestsTotal) {
              return `${row.NumberTestsTotal}`;
            }
            return `${row.NumberTestsCompleted} / ${row.NumberTestsTotal}`;
          }
          return '';
        },
      },
      { key: 'ErrorMessage', label: 'Error Message' },
    ],
  });
};
```

Supposing this script was saved in the project at `tasks/deploymentsummary.ts` then we'd execute this function using the following command:

```
sfdx flexi:run -p tasks/deploymentsummary.ts -u ORGNAME limit=13
```

where
  - `ORGNAME` is the username or the alias of the org we want to retrieve the deployment summary for
  - `limit` is the number of records we want to display (this is optional and would default to 10)

*NOTE: To use typescript, you have to ensure (ts-node)(https://github.com/TypeStrong/ts-node) is installed as a peer dependency in your project.

In this example, you can see that we're retrieving DeployRequest records using the tooling api and making use of the sfdx ux to render a table of the records.

### Update Local Metadata API Versions

The following (typescript) example is used to update the metadata api version of metadata within an sfdx project.

```typescript
import * as fs from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import { NamedPackageDir, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { SfdxRunContext } from '../types';
import * as glob from 'glob';

interface TypeConfig {
    type: string;
    pattern: string;
}

// this is not exhaustive - I've definitely missed something
const typeConfigs: TypeConfig[] = [
    {
        type: 'ApexClass',
        pattern: '**/classes/**/*-meta.xml'
    },
    {
        type: 'ApexTrigger',
        pattern: '**/triggers/**/*-meta.xml'
    },
    {
        type: 'ApexComponent',
        pattern: '**/components/**/*-meta.xml'
    },
    {
        type: 'ApexPage',
        pattern: '**/pages/**/*-meta.xml'
    },
    {
        type: 'LightningComponentBundle',
        pattern: '**/lwc/**/*-meta.xml'
    },
    {
        type: 'AuraDefinitionBundle',
        pattern: '**/aura/**/*-meta.xml'
    }
];

const globPromise = async (pattern: string, options: glob.IOptions): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        glob(pattern, options, (err, matches) => {
            if(err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    });
};

const updateVersion = async (path: string, rootElement: string, version: string): Promise<void> => {
    const source = await fs.promises.readFile(path, { encoding: "utf8" });
    const wrapper = await parseStringPromise(source);
    const root = wrapper[rootElement];
    if (root && root.apiVersion && root.apiVersion.length > 0) {
        const currentVersion = root.apiVersion[0];
        if (currentVersion !== version) {
            root.apiVersion[0] = version;
            const xml = new Builder({
                xmldec: {
                    version: "1.0",
                    encoding: "UTF-8",
                    standalone: null
                },
                renderOpts: {
                    pretty: true,
                    indent: '    ',
                    newline: '\n'
                }
            }).buildObject(wrapper);
            await fs.promises.writeFile(path, xml);
        }
    }
};

const updateTypeMetaVersions = async (packageDir: NamedPackageDir, pattern: string, type: string, version: string): Promise<void> => {
    const items = await globPromise(pattern, { cwd: packageDir.fullPath });
    if (items) {
        await Promise.all(items.map(item => {
            return updateVersion(pathUtils.join(packageDir.fullPath, item), type, version);
        }));
    }
};

const updatePackageDirMetaVersions = async (packageDir: NamedPackageDir, version: string): Promise<void> => {
    await Promise.all(typeConfigs.map(typeConfig => {
        return updateTypeMetaVersions(packageDir, typeConfig.pattern, typeConfig.type, version);
    }));
};

/**
 * Update project metadata versions. This will update the api versions on metadata files in
 * the project to the specified version. If no version is specified, the version is taken from the
 * project source api version.
 */
const updateProjectMetaVersions = async (project: SfdxProject, version?: string): Promise<void> => {
    const updateVersion = version || project.getSfdxProjectJson().getContents().sourceApiVersion;
    await Promise.all(project.getPackageDirectories().map(packageDir => {
        return updatePackageDirMetaVersions(packageDir, updateVersion);
    }));
};

interface UpdateMetaVersionArgs {
    version?: string;
}

export default async (ctx: SfdxRunContext<UpdateMetaVersionArgs>): Promise<void> => {
    const { project, args } = ctx;
    await updateProjectMetaVersions(project, args.version);
};
```
## Hooks

### Configuration

Hooks can be configured for a project in multiple ways, outlined below:

### Under the plugins section of `sfdx-project.json`

Add an entry under the `plugins.flexi.hooks` path for the hook you'd like to execute a script for - e.g.

```json
{
  "plugins": {
    "flexi": {
      "hooks": {
        "postorgcreate": "some/project/path/postorgcreate.js",
        "predeploy": "some/project/path/predeploy.ts"
      }
    }
  }
}
```

You can specify either `.js` or `.ts` extensions - as per the `run` command, if you're using `.ts` you'll need `ts-node` installed.

### As a module named `sfdx.flexi.hooks.ts` or `sfdx.flexi.hooks.js` in the project directory

This module can export a single handle for all hooks or an export for each hook type - e.g. the following module provides `predeploy` and `postorgcreate` hooks.

```typescript
import { PostOrgCreateResult, PreDeployResult, SfdxHookContext } from "../types";

export const predeploy = async (context: SfdxHookContext<PreDeployResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Deploy - need to do something meaningful with this');
    ux.logJson(result);
};

export const postorgcreate = async (context: SfdxHookContext<PostOrgCreateResult>): Promise<void> => {
    const { ux, result } = context;
    ux.log('Pre Deploy - need to do something meaningful with this');
    ux.logJson(result);
};
```

### As a module under the project directory `sfdx.flexi.hooks`

You can place a module under the `sfdx.flexi.hooks` project directory with the name matching the hook type - e.g. `predeploy.ts`


### Predeploy Example

A Fires after the CLI converts your source files to Metadata API format but before it sends the files to the org.

Please see the [sfdx hooks documentation](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks.htm) for more details.

*NOTE: The `force:source:push` / `force:source:deploy` and `force:source:pull` / `force:source:retrieve`  hooks no longer receive the same payload and this example needs to be updated to cover both `force:source:push` and `force:source:deploy` examples.

The following example modifies profiles to remove certain user permissions when they're being deployed.

```typescript
import { PreDeployItem, PreDeployResult, SfdxContext } from "sfdx-flexi-plugin/lib/types";
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
