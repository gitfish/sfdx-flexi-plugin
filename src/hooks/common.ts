import { Command, Hook } from '@oclif/config';
import { SfdxProject, SfdxProjectJson } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import ScriptCommand from '../commands/flexi/script';
import { FileService, fileServiceRef } from '../common/FileService';
import hookContextStore from '../common/hookContextStore';
import { next } from '../common/Id';
import { HookResult, HookType, ScriptHookContext } from '../types';

export interface HookOptions<R extends HookResult> {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: R;
}

export type HookFunction<R extends HookResult> = (this: Hook.Context, options: HookOptions<R>) => Promise<unknown>;

export enum ErrorBehaviour {
  exit = 'exit',
  log = 'log',
  throw = 'throw'
}

export enum FlagType {
  string = 'string',
  boolean = 'boolean'
}

export interface FlagSpec {
  name: string;
  char?: string;
  type: FlagType;
}

export const getFlagIndex = (argv: string[], spec: FlagSpec): number => {
  let idx = argv.indexOf(`--${spec.name}`);
  if (idx < 0 && spec.char) {
    idx = argv.indexOf(`-${spec.char}`);
  }
  return idx;
};

export const containsFlag = (argv: string[], spec: FlagSpec): boolean => {
  return getFlagIndex(argv, spec) >= 0;
};

export const getFlagValue = (argv: string[], spec: FlagSpec): unknown => {
  const idx = getFlagIndex(argv, spec);
  if (idx >= 0) {
    if (spec.type === FlagType.boolean) {
      return true;
    } else if (argv.length > idx + 1) {
      return argv[idx + 1];
    }
  }
};

export const copyFlagValues = (source: string[], dest: string[], specs: FlagSpec[]) => {
  if (specs && source && dest) {
    specs.forEach(spec => {
      if (!containsFlag(dest, spec)) {
        const value = getFlagValue(source, spec);
        if (value) {
          dest.push(`--${spec.name}`);
          if (spec.type === FlagType.string) {
            dest.push(value as string);
          }
        }
     }
    });
  }
};

const scriptCopyFlagSpecs: FlagSpec[] = [];

// pass on any flags supported by the script command - this is not ideal - probably a cleaner way
if (ScriptCommand.requiresUsername) {
  scriptCopyFlagSpecs.push({ name: 'targetusername', char: 'u', type: FlagType.string });
  scriptCopyFlagSpecs.push({ name: 'apiversion', type: FlagType.string });
}
if (ScriptCommand.requiresDevhubUsername) {
  scriptCopyFlagSpecs.push({ name: 'targetdevhubusername', char: 'v', type: FlagType.string });
}
scriptCopyFlagSpecs.push({ name: 'json', type: FlagType.boolean });

export interface CreateScriptDelegateOptions {
  hookType: HookType;
  fileService?: FileService;
  hooksDir?: string;
}

export const defaultScriptDelegateOptions: Partial<CreateScriptDelegateOptions> = {
  hooksDir: 'hooks'
};

/**
 * Creates a hook function that delegates to a script with the sfdx project.
 * NOTE: By default if an exception is caught when executing the delegate script, the plugin will exit.
 * To change this behaviour, set errorBehaviour to 'throw' or 'warn' (by default it's 'exit')
 * @param hookType the type of hook to create
 * @returns a HookFunction
 */
export const createScriptDelegate = <R extends HookResult = HookResult>(
  opts: CreateScriptDelegateOptions
): HookFunction<R> => {
  opts = { ...defaultScriptDelegateOptions, ...opts };

  // Note that we're using a standard function as arrow functions are bound to the current 'this'.
  return async function(hookOpts: HookOptions<R>) {
    const project = await SfdxProject.resolve();

    if (!project) {
      return;
    }

    const { hookType, hooksDir } = opts;
    let { fileService } = opts;
    if (!fileService) {
      fileService = fileServiceRef.current;
    }

    // we try to find any hook configuration from the project file
    const projectJson: SfdxProjectJson = project.getSfdxProjectJson();
    const projectConfig = projectJson.getContents();
    // the flexi hooks config will be configured against the flexiHooks key in the project config
    const hookConfig = projectConfig.hooks as JsonMap;

    let scriptPath = hookConfig?.[hookType] as string;

    if (!scriptPath) {
      const basePath = pathUtils.isAbsolute(hooksDir) ? hooksDir : pathUtils.join(project.getPath(), hooksDir);
      scriptPath = pathUtils.join(
       basePath,
        `${opts.hookType}.js`
      );
      if (!fileService.existsSync(scriptPath)) {
        scriptPath = pathUtils.join(
          basePath,
          `${opts.hookType}.ts`
        );
      }
    }

    // make our script path absolute
    scriptPath = pathUtils.isAbsolute(scriptPath)
      ? scriptPath
      : pathUtils.join(project.getPath(), scriptPath);

    if (!fileService.existsSync(scriptPath)) {
      return;
    }

    // setup our error handler
    let errorBehaviour = hookConfig?.errorBehaviour as ErrorBehaviour;
    if (!errorBehaviour) {
      errorBehaviour = ErrorBehaviour.exit;
    }

    let errorHandler: (error: string | Error) => void;
    if (errorBehaviour === ErrorBehaviour.throw) {
      errorHandler = error => {
        throw error;
      };
    } else if (errorBehaviour === ErrorBehaviour.log) {
      errorHandler = error => {
        this.log(error);
      };
    } else {
      errorHandler = error => {
        this.error(error);
      };
    }

    const hookContext: ScriptHookContext = {
      hookType: opts.hookType,
      commandId: hookOpts.commandId || hookOpts.Command?.id,
      result: hookOpts.result
    };

    const hookContextId = next('hook');
    hookContextStore[hookContextId] = hookContext;

    // build our script command arguments
    const scriptCommandArgs: string[] = ['--path', scriptPath, '--hookcontextid', hookContextId];
    copyFlagValues(hookOpts.argv, scriptCommandArgs, scriptCopyFlagSpecs);

    // run our script command
    try {
      await ScriptCommand.run(scriptCommandArgs);
    } catch (error) {
      errorHandler(error);
    }
  };
};
