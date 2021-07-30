# Export Command

The export command is for exporting data from an org from a set of local json files.

This command was created as a compatible but more flexible alternative to the [json bourne](https://github.com/realestate-com-au/json-bourne-sfdx-cli) export command.

## Configuration

See the [import documentation](./import.md) for information about the configuration - this is shared with the import command.

Assuming the configuration file was available at path `config/data-config.json` we'd export all objects to the `woohoo` directory(the default is `data` under the project directory) with the following:

    sfdx flexi:export -c config/data-config.json -u ORGNAME -d woohoo

or export a specific object (or objects) (Contact in this case) with:

    sfdx flexi:export -c config/data-config.json -u ORGNAME -d woohoo -o Contact

## Hooks

The hook implementation delegates to a function exported by a typescript or javascript module. The hook function is invoked with a context that contains a `hook` property to provide hook specific context (such as what records are being imported and so on).

The following hooks can be defined in the project:

### Pre Export

Called before any object is exported

#### Configuration

The default paths are `hooks/preexport.ts` or `hooks/preexport.js` and this can be overridden in `sfdx-project.json` with a `preexport` entry under `hooks`.

#### Use ideas
- Preparation

#### Example

```typescript
import {
    SfdxContext,
    PreExportResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: SfdxContext<PreExporAnytResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Export Any Result');
    ux.logJson(result);
};
```

### Pre Export Object

Called before the export of a specific object.

#### Configuration
The default paths are `hooks/preexportobject.ts` or `hooks/preexportobject.js` and this can be overridden in `sfdx-project.json` with a `preexportobject` entry under `hooks`.

#### Use ideas
- Preparation of directory / directories
- Haven't thought of any great ideas yet

#### Example

```typescript
import {
    SfdxContext,
    PreExportObjectResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: SfdxContext<PreExportObjectResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Export Object Result');
    ux.logJson(result);
};
```

### Post Export Object

Called after the export of a specific object.

#### Configuration

The default paths are `hooks/postexportobject.ts` or `hooks/postexportobject.js` and this can be overridden in `sfdx-project.json` with a `postexportobject` entry under `hooks`.

#### Use ideas
- Cleanup
- Modify records

#### Example

```typescript
import {
    SfdxContext,
    PostExportObjectResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: SfdxContext<PostExportObjectResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Export Object Result');
    ux.logJson(result);
};
```

### Post Export All

Called after all objects have been exported.

#### Configuration

The default paths are `hooks/postexport.ts` or `hooks/postexport.js` and this can be overridden in `sfdx-project.json` with a `postexport` entry under `hooks`.

#### Use ideas
- Cleanup
- Modify records

#### Example

```typescript
import {
    SfdxContext,
    PostExportResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: SfdxContext<PostExportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Export Result');
    ux.logJson(result);
};
```


