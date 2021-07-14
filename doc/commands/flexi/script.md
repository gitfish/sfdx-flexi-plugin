# Script Command

The script command allows execution of a function exported by a typescript or javascript module. The function is provided with the sfdx context including such items as the current project, the target org and so on.

## Module structure
The command will resolve the first exported function from the module - where that's `default` or named - i.e. the following are equivalent:

```typescript
import { ScriptContext } from "sfdx-flexi-plugin/lib/types";

export default async (context: ScriptContext) => {
    
}
```

```typescript
import { ScriptContext } from "sfdx-flexi-plugin/lib/types";

export const run = async (context: ScriptContext) => {
    
}
```

## Example

The following (typescript) example is used to list the status of deployments in an org:

```typescript
import { ScriptContext } from "sfdx-flexi-plugin/lib/types";

export default async (context: ScriptContext) => {
	const { ux, org, varargs } = context;
	const conn = org.getConnection();
	const r = await conn.tooling.query(
		`select Id, CreatedDate, CreatedBy.Name, StartDate, CompletedDate, Status, StateDetail, CheckOnly, NumberComponentsTotal, NumberComponentErrors, NumberComponentsDeployed, NumberTestsTotal, NumberTestsCompleted, NumberTestErrors, ErrorMessage from DeployRequest ORDER BY CreatedDate desc NULLS LAST limit ${
			varargs.limit || 10
		}`
	);
	ux.table(r.records, {
		columns: [
			{ key: "Id", label: "ID" },
			{
				key: "Created",
				label: "Created",
				get(row) {
					return `${new Date(
						Date.parse((<any>row).CreatedDate)
					).toLocaleString()} by ${(<any>row).CreatedBy.Name}`;
				}
			},
			{
				key: "StartDate",
				label: "Start Date",
				get(row) {
					const r = <any>row;
					if (r.StartDate) {
						return new Date(Date.parse(r.StartDate)).toLocaleString();
					}
					return "";
				}
			},
			{
				key: "CompletedDate",
				label: "Completed Date",
				get(row) {
					const r = <any>row;
					if (r.CompletedDate) {
						return new Date(Date.parse(r.CompletedDate)).toLocaleString();
					}
					return "";
				}
			},
			{ key: "CheckOnly", label: "Check Only" },
			{ key: "Status", label: "Status" },
			{
				key: "Components",
				label: "Components",
				get(row) {
					const r = <any>row;
					if (r.NumberComponentsTotal) {
						if(r.NumberComponentsDeployed === r.NumberComponentsTotal) {
							return `${r.NumberComponentsTotal}`;
						}
						return `${r.NumberComponentsDeployed} / ${r.NumberComponentsTotal}`;
					}
					return "";
				}
			},
			{
				key: "Tests",
				label: "Tests",
				get(row) {
					const r = <any>row;
					if (r.NumberTestsTotal) {
						if(r.NumberTestsCompleted === r.NumberTestsTotal) {
							return `${r.NumberTestsTotal}`;
						}
						return `${r.NumberTestsCompleted} / ${r.NumberTestsTotal}`;
					}
					return "";
				}
			},
			{ key: "ErrorMessage", label: "Error Message" }
		]
	});
};
```

Suppose this script was saved in the project at `tasks/deploymentSummary.ts` then we'd execute this function using the following command:

    sfdx flexi:script -p tasks/deploymentSummary.ts -u ORGNAME limit=13

where

    - `ORGNAME` is the username or the alias of the org we want to retrieve the deployment summary for
    - `limit` is the number of records we want to display (this is optional and would default to 10)

NOTE: To use typescript, you have to ensure (ts-node)(https://github.com/TypeStrong/ts-node) is installed as a peer dependency in your project.

In this example, you can see that we're retrieving DeployRequest records using the tooling api and making use of the sfdx ux to render a table of the records.

## Hooks

