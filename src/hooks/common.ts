import { ConfigAggregator, SfdxProject, Org, Logger } from '@salesforce/core';
import { UX } from '@salesforce/command';
import { FlexiPluginConfig, HookFunction, HookOptions, HookType, SfdxHookContext, SfdxHookFunction } from '../types';
import * as pathUtils from 'path';
import { FileService, FileServiceRef } from '../common/fs';
import { getFunction, getModuleFunction, loadModule } from '../common/module';
import { RequireFunc, RequireFunctionRef } from '../common/require';

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
      return argv[idx + 1];
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

export const PLUGIN_KEY = 'flexi';
export const JS_HOOKS_MODULE = 'sfdx.flexi.hooks.js';
export const TS_HOOKS_MODULE = 'sfdx.flexi.hooks.ts';
export const HOOKS_DIR = 'sfdx.flexi.hooks';

const resolveDelegate = async (resolvePath: string, type: HookType, project: SfdxProject, opts: ServiceOptions): Promise<SfdxHookFunction> => {
  const { fs, requireFunc } = opts;

  // first we check the project if present
  if (project) {
    const pc = await project.resolveProjectConfig();
    const flexiConfig: FlexiPluginConfig = pc?.plugins?.[PLUGIN_KEY];
    if (flexiConfig) {
      const modulePath = flexiConfig.hooks?.[type];
      if (modulePath) {
        return getModuleFunction(modulePath, {
          resolvePath
        });
      }
    }
  }

  const getModuleHandler = async (modulePath: string): Promise<SfdxHookFunction> => {
    if (await fs.pathExists(modulePath)) {
      const module = loadModule(modulePath, {
        resolvePath,
        requireFunc
      });
      let typeHandler: SfdxHookFunction = getFunction(module, type);
      if (!typeHandler) {
        typeHandler = getFunction(module);
      }
      if (typeHandler) {
        return typeHandler;
      }
    }
  };

  // the module paths to check
  const checkModulePaths: string[] = [
    pathUtils.join(resolvePath, JS_HOOKS_MODULE),
    pathUtils.join(resolvePath, TS_HOOKS_MODULE),
    pathUtils.join(resolvePath, HOOKS_DIR, `${type}.js`),
    pathUtils.join(resolvePath, HOOKS_DIR, `${type}.ts`)
  ];

  for(const checkModulePath of checkModulePaths) {
    const r = await getModuleHandler(checkModulePath);
    if(r) {
      return r;
    }
  }
};

export interface ServiceOptions {
  fs?: FileService;
  requireFunc?: RequireFunc;
}

export interface CreateHookDelegateOptions<HookResult = unknown> extends ServiceOptions {
  type?: HookType;
  noProject?: boolean;
  noOrg?: boolean;
  noHubOrg?: boolean;
  getType?: (opts: HookOptions<HookResult>) => HookType;
  getOrgUsername?: (opts: HookOptions<HookResult>) => string;
  getHubOrgUsername?: (opts: HookOptions<HookResult>) => string;
}

/**
 * Creates a hook function that delegates to a script with the sfdx project.
 * @param hookType the type of hook to create
 * @returns a HookFunction
 */
export const createHookDelegate = <HookResult = unknown>(
  opts: CreateHookDelegateOptions<HookResult>
): HookFunction<HookResult> => {

  const { noOrg, noHubOrg, noProject, getOrgUsername, getHubOrgUsername, getType } = opts;
  const configuredType = opts.type;

  const fs = opts.fs || FileServiceRef.current;
  const requireFunc = opts.requireFunc || RequireFunctionRef.current;

  // Note that we're using a standard function as arrow functions are bound to the current 'this'.
  // tslint:disable-next-line: only-arrow-functions
  return async function (hookOpts: HookOptions<HookResult>) {
    const argv = hookOpts.argv;
    let type = configuredType;
    if(!type) {
      type = getType(hookOpts);
    }

    let project: SfdxProject;
    if (!noProject) {
      try {
        project = await SfdxProject.resolve();
      } catch (err) {
        if (err.name !== 'InvalidProjectWorkspace') {
          throw err;
        }
      }
    }

    const resolvePath = project?.getPath() || process.cwd();
    // find a handler for our hook type
    const delegate = await resolveDelegate(resolvePath, type, project, { fs, requireFunc });

    if (delegate) {
      const configAggregator = await ConfigAggregator.create();

      let org: Org;
      let hubOrg: Org;

      if (!noOrg) {
        const aliasOrUsername = getOrgUsername ? getOrgUsername(hookOpts) : getTargetUsername(argv);
        org = await Org.create({
          aggregator: configAggregator,
          aliasOrUsername
        });
      }

      if (!noHubOrg) {
        const aliasOrUsername = getHubOrgUsername ? getHubOrgUsername(hookOpts) : getTargetDevHubUsername(argv);
        hubOrg = await Org.create({
          aggregator: configAggregator,
          aliasOrUsername,
          isDevHub: true
        });
      }

      const commandId = hookOpts.commandId || hookOpts.Command?.id;

      const logger = await Logger.child(`${commandId}-flexi-hook-${type}`);
      const ux = new UX(logger, !isJson(argv));

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
