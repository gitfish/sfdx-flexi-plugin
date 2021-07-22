# Import and Export Command

The import command is for importing data to an org from a set of local json files. This is typically used in conjunction with the export command as analogies to the metadata push/pull (or more accurately deploy/retrieve)

These command were created as a compatible but more flexible alternative to the [json bourne](https://github.com/realestate-com-au/json-bourne-sfdx-cli) and support is still maintained for the [json bourne managed package](https://github.com/realestate-com-au/json-bourne-sfdx-pkg) API for importing data. Most importantly, the flexi commands support hooks as outlined below.

## Configuration

The import and export configuration are captured in a single configuration file. An basic example configuration file for importing and exporting Accounts and related Contacts would be:

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

An example exporting all objects to the `woohoo` project directory (the default is `data` under the project directory):

    sfdx flexi:export -c config/data-config.json -u ORGNAME -d woohoo

or export a specific object (or objects) (Contact in this case) with:

    sfdx flexi:export -c config/data-config.json -u ORGNAME -d woohoo -o Contact

## Hooks

The hook implementation delegates to a function exported by a typescript or javascript module. The hook function is invoked with a context that contains a `hook` property to provide hook specific context (such as what records are being imported and so on).

The following hooks can be defined in the project:

### Pre Import

Called before the import of any object.

#### Configuration

The default paths are `hooks/preimport.ts` or `hooks/preimport.js` and this can be overridden in `sfdx-project.json` with a `preimport` entry under `hooks`.

#### Example

```typescript
import {
    PreImportResult,
    ScriptContext 
} from 'sfdx-flexi-plugin/lib/types';

export default async (context: ScriptContext<PreImportResult>) => {
    const { hook } = context;
    // ... do you worst
}
```

### Pre Import Object

Called before the import of a specific object.

#### Configuration

The default paths are `hooks/preimportobject.ts` or `hooks/preimportobject.js` and this can be overridden in `sfdx-project.json` with a `preimportobject` entry under `hooks`.

#### Example

The following example will suffix all the name field on all Account records with `-hook` that don't have the suffix before they're saved to the org:

```typescript
import {
	ScriptContext,
	PreImportObjectResult
} from "sfdx-flexi-plugin/lib/types";

export const run = async (context: ScriptContext<PreImportObjectResult>) => {
	const { hook } = context;
    if (result.objectConfig.sObjectType === 'Account') {
        hook.result.records.forEach((record) => {
            if(!record.Name.endsWith('-hook')) {
                record.Name += '-hook';
            }
        });
    }
};
```

### Post Import Object

Called after the import of a specific object.

#### Configuration

The default paths are `hooks/postimportobject.ts` or `hooks/postimportobject.js` and this can be overridden in `sfdx-project.json` with a `postimportobject` entry under `hooks`.

#### Example

```typescript
import {
    PostImporObjectResult,
    ScriptContext 
} from 'sfdx-flexi-plugin/lib/types';

export default async (context: ScriptContext<PostImporObjectResult>) => {
    const { hook } = context;
    // ... do you worst
}
```

### Pre Export Object

Called after the export of a specific object.

#### Configuration
The default paths are `hooks/postexportobject.ts` or `hooks/postexportobject.js` and this can be overridden in `sfdx-project.json` with a `preexportobject` entry under `hooks`.

### Example



- `preexportobject` - default path: `hooks/preexportobject.ts` or `hooks/preexportobject.js`
- `postexportobject` - default path: `hooks/postexportobject.ts` or `hooks/postexportobject.js`
- `postexport` - default path: `hooks/postexport.ts` or `hooks/postexport.js`