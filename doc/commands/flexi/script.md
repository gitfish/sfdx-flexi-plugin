# Script Command

The script command allows execution of a function exported by a typescript or javascript module. The function is provided with the sfdx context including such items as the current project, the target org and so on.

## Module structure
The command will resolve the first exported function from the module - where that's `default` or named - i.e. the following are equivalent:

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

## Example 1

The following (typescript) example is used to list the status of deployments in an org:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SfdxContext } from '../types';

export default async (context: SfdxContext): Promise<void> => {
  const { ux, org, varargs } = context;
  const conn = org.getConnection();
  const r = await conn.tooling.query(
    `select Id, CreatedDate, CreatedBy.Name, StartDate, CompletedDate, Status, StateDetail, CheckOnly, NumberComponentsTotal, NumberComponentErrors, NumberComponentsDeployed, NumberTestsTotal, NumberTestsCompleted, NumberTestErrors, ErrorMessage from DeployRequest ORDER BY CreatedDate desc NULLS LAST limit ${
      varargs.limit || 10
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

Suppose this script was saved in the project at `tasks/deploymentsummary.ts` then we'd execute this function using the following command:

    sfdx flexi:script -p tasks/deploymentsummary.ts -u ORGNAME limit=13

where

    - `ORGNAME` is the username or the alias of the org we want to retrieve the deployment summary for
    - `limit` is the number of records we want to display (this is optional and would default to 10)

NOTE: To use typescript, you have to ensure (ts-node)(https://github.com/TypeStrong/ts-node) is installed as a peer dependency in your project.

In this example, you can see that we're retrieving DeployRequest records using the tooling api and making use of the sfdx ux to render a table of the records.

## Example 2

The following (typescript) example is used to update the metadata api version of metadata within an sfdx project.

```typescript
import { promises as fsp } from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import { NamedPackageDir, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { SfdxContext } from 'sfdx-flexi-plugin/lib/types';
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
    const source = await fsp.readFile(path, { encoding: "utf8" });
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
            await fsp.writeFile(path, xml);
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

export default async (ctx: SfdxContext): Promise<void> => {
    const { project, varargs } = ctx;
    await updateProjectMetaVersions(project, varargs.version as string);
};
```