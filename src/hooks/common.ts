import { ConfigAggregator, SfdxProject, Org, Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { HookFunction, HookOptions, HookResult, HookType, SfdxHookContext, SfdxHookFunction } from '../types';
import { getModuleFunction } from '../common/module';
import { getPluginConfig } from '../common/project';

enum FlagType {
  string = 'string',
  boolean = 'boolean'
}

interface FlagSpec {
  name: string;
  char?: string;
  type: FlagType;
}

const targetUsernameSpec = { name: 'targetusername', char: 'u', type: FlagType.string };
const targetDevHubUsernameSpec = { name: 'targetdevhubusername', char: 'v', type: FlagType.string };
const jsonSpec = { name: 'json', type: FlagType.boolean };

export const getFlagIndex = (argv: string[], spec: FlagSpec): number => {
  let idx = argv.indexOf(`--${spec.name}`);
  if (idx < 0 && spec.char) {
    idx = argv.indexOf(`-${spec.char}`);
  }
  return idx;
};

const getFlagValue = (argv: string[], spec: FlagSpec): boolean | string => {
  const idx = getFlagIndex(argv, spec);
  if (idx >= 0) {
    if (spec.type === FlagType.boolean) {
      return true;
    }

    if (argv.length > idx + 1) {
      return argv[idx + 1].trim();
    }
  }
};

export const getTargetUsername = (argv: string[]): string => {
  return <string>getFlagValue(argv, targetUsernameSpec);
};

export const getTargetDevHubUsername = (argv: string[]): string => {
  return <string>getFlagValue(argv, targetDevHubUsernameSpec);
};

export const isJson = (argv: string[]): boolean => {
  return <boolean>getFlagValue(argv, jsonSpec);
};

interface ResolveDelegateOptions {
  type: HookType;
  project: SfdxProject;
}

const resolveDelegate = async (opts: ResolveDelegateOptions): Promise<SfdxHookFunction> => {
  const { type, project } = opts;

  // grab the config from the project
  const flexiConfig = await getPluginConfig(project);
  if (flexiConfig) {
    const modulePath = flexiConfig.hooks?.[type];
    if (modulePath) {
      return getModuleFunction(modulePath, {
        resolvePath: project.getPath(),
        tsConfig: flexiConfig.tsConfig
      });
    }
  }
};

export interface CreateHookDelegateOptions<R extends HookResult = HookResult> {
  type: HookType;
  noOrg?: boolean;
  noHubOrg?: boolean;
  getOrgUsername?: (opts: HookOptions<R>) => string;
  getHubOrgUsername?: (opts: HookOptions<R>) => string;
}

/**
 * Creates a hook function that delegates to a script with the sfdx project.
 * @param hookType the type of hook to create
 * @returns a HookFunction
 */
export const createHookDelegate = <R extends HookResult = HookResult>(
  opts: CreateHookDelegateOptions<R>
): HookFunction<R> => {

  const { type, getOrgUsername, getHubOrgUsername } = opts;

  // Note that we're using a standard function as arrow functions are bound to the current 'this'.
  // tslint:disable-next-line: only-arrow-functions
  return async function (hookOpts: HookOptions<R>) {
    const argv = hookOpts.argv;

    // resolve our project
    const project = await SfdxProject.resolve();

    // find a handler for our hook type
    const delegate = await resolveDelegate({ type, project });

    if (delegate) {
      const commandId = hookOpts.commandId || hookOpts.Command?.id;
      const logger = await Logger.child(`${commandId}-flexi-hook-${type}`);
      const ux = new UX(logger, !isJson(argv));

      const configAggregator = await ConfigAggregator.create();

      let org: Org;
      const aliasOrUsername = getOrgUsername ? getOrgUsername(hookOpts) : getTargetUsername(argv);
      try {
        org = await Org.create({
          aggregator: configAggregator,
          aliasOrUsername // if this is blank, the org will be the default org configured - if there is one
        });
      } catch(err) {
        // warn when we can't resolve the org
        ux.warn(`Unable to resolve Org: ${err}`);
      }
      
      let hubOrg: Org;
      const hubAliasOrUsername = getHubOrgUsername ? getHubOrgUsername(hookOpts) : getTargetDevHubUsername(argv);
      try {
        hubOrg = await Org.create({
          aggregator: configAggregator,
          aliasOrUsername: hubAliasOrUsername,
          isDevHub: true
        });
      } catch(err) {
        // warn when we can't resolve the hub org
        ux.warn(`Unable to resolve Hub Org: ${err}`);
      }

      const context: SfdxHookContext = {
        logger,
        ux,
        context: this,
        type,
        commandId,
        result: hookOpts.result,
        config: this.config,
        argv,
        configAggregator,
        project,
        org,
        hubOrg
      };

      return Promise.resolve(delegate(context));
    }
  };
};
