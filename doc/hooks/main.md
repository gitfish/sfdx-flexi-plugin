# Hooks

For further information on hooks, please see the [sfdx hooks documentation](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks.htm) for more details.

The flexi plugin supports all of the hooks outlined in [salesforce cli hook types](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks_list.htm)

## Configuration

The hooks can be configured with a `flexi` plugin entry in `sfdx-project.json` - e.g.:

```json
{
    "plugins": {
        "flexi": {
            "hooks": {
                "postorgcreate": "<path to postorgreate hook module>",
                "predeploy": "<path to predeploy hook module>",
                "postdeploy": "<path to postdeploy hook module>",
                "preretrieve": "<path to preretrieve hook module>",
                "postretrieve": "<path to postretrieve hook module>",
                "postsourceupdate": "<path to postsourceupdate hook module>"

            }
        }
    }
}
```

As per the run command, to support typescript modules, you'll need to have `ts-config` installed.

## Examples

- [Post Org Create](./postorgcreate.md)
- [Pre Deploy](./predeploy.md)