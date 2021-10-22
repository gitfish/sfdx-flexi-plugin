import { HookType, PreDeployHookResult } from '../types';
import { createHookDelegate } from './common';
import { SOURCE_PUSH_COMMAND_ID } from './constants';

// This is scary stuff, but according to this: https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_customize_hooks_list.htm
// if the command is force:source:push, then the result type is PreDeployResult, otherwise it's an array of MetadataComponent[] - this is captured by the PreDeployHookResult type.
// If this seems confusing, then welcome to the club.
export const hook = createHookDelegate<PreDeployHookResult>({
    getType(opts) {
        return opts.commandId === SOURCE_PUSH_COMMAND_ID ? HookType.prepush : HookType.predeploy;
    }
});
