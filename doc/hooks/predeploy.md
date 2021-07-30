# Pre Deploy Hook

Fires after the CLI converts your source files to Metadata API format but before it sends the files to the org.

Please see the [sfdx hooks documentation](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks.htm) for more details.

## Configuration

The default paths are `hooks/predeploy.ts` or `hooks/predeploy.js` and this can be overridden in `sfdx-project.json` with a `predeploy` entry under `hooks`.

## Example

The following example modifies profiles to remove certain user permissions when they're being deployed to an org that's not a scratch org.
