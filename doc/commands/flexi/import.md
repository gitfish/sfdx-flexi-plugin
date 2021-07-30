# Import Command

The import command is for importing data to an org from a set of local json files. The data is typically considered 'reference' data and is intended to be stored in version control.

This command was created as a compatible but more flexible alternative to the [json bourne](https://github.com/realestate-com-au/json-bourne-sfdx-cli) import command and support is still maintained for the [json bourne managed package](https://github.com/realestate-com-au/json-bourne-sfdx-pkg) API for importing data. The most useful additions are:
- Being able to change the import implementation on a per-object (sobject) basis
- Hooks

## Configuration

The import and export configuration are captured in a single configuration file. A basic example configuration file for importing and exporting Accounts and related Contacts would be:

```json
{
    "bourne": {
        "payloadLength": 1500000
    },
    "importRetries": 3,
    "importHandler": "bourne",
    "objects": [
        {
            "sObjectType": "Account",
            "query": "select Name, External_Id__c from Account",
            "externalid": "External_Id__c",
            "directory": "accounts",
            "filename": "External_Id__c"
        },
        {
            "sObjectType": "Contact",
            "query": "select FirstName, LastName, Email, External_Id__c, Account.External_Id__c from Contact",
            "externalid": "External_Id__c",
            "directory": "contacts",
            "filename": "External_Id__c",
            "cleanupFields": [
                "Account"
            ],
            "importHandler": "default"
        }
    ]
}
```

In this example, the `query` field for the entry is used by the `export` command to retrieve records and save the files based on the `filename` field to `directory`. This also assumes there's a field named `External_Id__c` defined on the objects which is also used to form the relationships on import.

In this example, the default importHandler is set to `bourne` and this can be overridden at the object level, as it is in the `Contact` object example. The `importHandler` can also be a path to a typescript or javascript module that exports a function implementing the `SaveOperation` interface.

Assuming this file was available at path `config/data-config.json` we'd import all objects with the following:

    sfdx flexi:import -c config/data-config.json -u ORGNAME

or import a specific object (or objects) (Account in this case) with:

    sfdx flexi:import -c config/data-config.json -o Account -u ORGNAME

## Hooks

The hook implementation delegates to a function exported by a typescript or javascript module. The hook function is invoked with a context that contains a `hook` property to provide hook specific context (such as what records are being imported and so on).

The following hooks can be defined in the project:

### Pre Import

Called before the import of any specific object.

#### Configuration

The default paths are `hooks/preimport.ts` or `hooks/preimport.js` and this can be overridden in `sfdx-project.json` with a `preimport` entry under `hooks`.

#### Use ideas
- Turn off triggers for the whole import
- Setup import session state (e.g. an import session record in salesforce)

#### Example

```typescript
import {
    SfdxContext,
    PreImportResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: SfdxContext<PreImportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Pre Import Result');
    ux.logJson(result);
};
```

### Pre Import Object

Called before the import of a specific object.

#### Configuration

The default paths are `hooks/preimportobject.ts` or `hooks/preimportobject.js` and this can be overridden in `sfdx-project.json` with a `preimportobject` entry under `hooks`.

#### Use ideas
- Disabling trigger(s) for the target object (provided you have a way to do that - i.e. custom setting)
- Modifying records before they are imported

#### Example

The following (fairly contrived) example will suffix the name field on all Account records with `-hook` before they're saved to the target org. It also adds in some state to restore the original account records in another hook.

```typescript
import {
    SfdxContext,
    PreImportObjectResult
} from "sfdx-flexi-plugin/lib/types";

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
```

### Post Import Object

Called after the import of a specific object.

#### Configuration

The default paths are `hooks/postimportobject.ts` or `hooks/postimportobject.js` and this can be overridden in `sfdx-project.json` with a `postimportobject` entry under `hooks`.

#### Use ideas
- Enabling trigger(s) for the target object
- Restoring any other state that might have been modified in the pre import object hook

#### Example

This restores accounts based on the pre import object example above.

```typescript
import {
    PostImportObjectResult,
    SfdxContext
} from 'sfdx-flexi-plugin/types';

const OBJECT_TYPE_CONTACT = 'Contact';

export default async (context: SfdxContext<PostImportObjectResult>): Promise<void> => {
    const { hook } = context;
    const result = hook.result;

    if (result.objectConfig.sObjectType === OBJECT_TYPE_CONTACT && result.state.restoreAccounts) {
        await (<() => Promise<void>>result.state.restoreAccounts)();
    }
}
```

### Post Import (Current unavailable)

Called after the import of all objects

**NOTE** This is currently unavailable as it hangs and then fails when invoked for some inexplicable reason - it requires investigation.

#### Configuration

The default paths are `hooks/postmport.ts` or `hooks/postimport.js` and this can be overridden in `sfdx-project.json` with a `postimport` entry under `hooks`.

#### Use ideas
- Enable triggers
- Update any state regarding the import process (e.g. you might want to update an import session record in Salesforce with the completed date)

#### Example

```typescript
import {
    SfdxContext,
    PostImportResult
} from "../types";

export const run = async (context: SfdxContext<PostImportResult>): Promise<void> => {
    const { hook, ux } = context;
    const result = hook.result;
    // do something real - I'm out of ideas
    ux.log('Post Import Result');
    ux.logJson(result);
};
```

## Future Work

Moving forward, the implementation will move to an approach of staging the data in a temporary location, with two lifecycle hooks only (i.e. `preimport` and `preexport`) being provided with results that reference this staging location. This approach will simplify the process greatly - it's mostly in the current state for backwards compatibility with `bourne`.