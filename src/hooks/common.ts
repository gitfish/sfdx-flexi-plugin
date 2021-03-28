import { Command, Hook } from "@oclif/config";
import { SfdxProject, SfdxProjectJson } from "@salesforce/core";
import { JsonMap } from "@salesforce/ts-types";
import * as path from "path";
import * as fs from "fs";
import { ScriptCommand } from "../commands/flexi/script";
import { HookType, ScriptHookContext } from "../types";

export interface HookOptions<R = any> {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: R;
}

// tslint:disable-next-line:no-any
export interface HookFunction<R = any> {
  (this: Hook.Context, options: HookOptions<R>): Promise<any>;
}

export enum ErrorBehaviour {
  exit = "exit",
  log = "log",
  throw = "throw",
}

const DEFAULT_PROJECT_HOOKS_DIR = "hooks";

export enum FlagType {
  string = "string",
  boolean = "boolean"
}

export interface FlagSpec {
  name: string;
  char?: string;
  type: FlagType;
}

export const getFlagIndex = (argv: string[], spec: FlagSpec): number => {
  let idx = argv.indexOf(`--${spec.name}`);
  if(idx < 0 && spec.char) {
    idx = argv.indexOf(`-${spec.char}`);
  }
  return idx;
};

export const containsFlag = (argv: string[], spec: FlagSpec): boolean => {
  return getFlagIndex(argv, spec) >= 0;
};

export const getFlagValue = (argv: string[], spec: FlagSpec): any => {
  const idx = getFlagIndex(argv, spec);
  if(idx >= 0) {
    if(spec.type === FlagType.boolean) {
      return true;
    } else if(argv.length > idx + 1) {
      return argv[idx + 1];
    }
  }
};

export const copyFlagValues = (source: string[], dest: string[], specs: FlagSpec[]) => {
  if(specs) {
    specs.forEach(spec => {
      if(!containsFlag(dest, spec)) {
        const value = getFlagValue(source, spec);
        if(value) {
          dest.push(`--${spec.name}`);
          if(spec.type === FlagType.string) {
            dest.push(value);
          }
        }
     }
    });
  }
};

const scriptCopyFlagSpecs: FlagSpec[] = []

// pass on any flags supported by the script command - this is not ideal - probably a cleaner way
if(ScriptCommand.requiresUsername) {
  scriptCopyFlagSpecs.push({ name: 'targetusername', char: 'u', type: FlagType.string });
  scriptCopyFlagSpecs.push({ name: 'apiversion', type: FlagType.string });
}
if(ScriptCommand.requiresDevhubUsername) {
  scriptCopyFlagSpecs.push({ name: 'targetdevhubusername', char: 'v', type: FlagType.string });
}
scriptCopyFlagSpecs.push({ name: 'json', type: FlagType.boolean });

/**
 * Creates a hook function that delegates to a script with the sfdx project.
 * NOTE: By default if an exception is caught when executing the delegate script, the plugin will exit.
 * To change this behaviour, set errorBehaviour to 'throw' or 'warn' (by default it's 'exit')
 * @param hookType the type of hook to create
 * @returns a HookFunction
 */
export const createScriptDelegate = <R = any>(
  hookType: HookType
): HookFunction => {
  // Note that we're using a standard function as arrow functions are bound to the current 'this'.
  return async function (hookOpts: HookOptions<R>) {
    const project = await SfdxProject.resolve();

    if (!project) {
      return;
    }

    // we try to find any hook configuration from the project file
    const projectJson: SfdxProjectJson = await project.retrieveSfdxProjectJson();
    const projectConfig = await projectJson.read();
    // the flexi hooks config will be configured against the flexiHooks key in the project config
    const hookConfig = (projectConfig.hooks ||
      projectConfig.flexiHooks) as JsonMap;

    const scriptConfig = hookConfig?.scripts?.[hookType];
    let scriptPath;
    // NOTE that a script config can be a string or an object of the
    if (scriptConfig) {
      if (typeof scriptConfig === "string") {
        scriptPath = scriptConfig as string;
      } else {
        // if disabled return
        if (scriptConfig.disabled) {
          return;
        }
        scriptPath = scriptConfig.path as string;
      }
    }

    if (!scriptPath) {
      // by default we look for a script under a hooks directory in the project
      scriptPath = path.join(
        project.getPath(),
        DEFAULT_PROJECT_HOOKS_DIR,
        `${hookType}.js`
      );
      if (!fs.existsSync(scriptPath)) {
        scriptPath = path.join(
          project.getPath(),
          DEFAULT_PROJECT_HOOKS_DIR,
          `${hookType}.ts`
        );
      }
    }

    // make our script path absolute
    scriptPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(project.getPath(), scriptPath);

    if(!fs.existsSync(scriptPath)) {
      return;
    }

    // setup our error handler
    let errorBehaviour = hookConfig?.errorBehaviour as ErrorBehaviour;
    if (!errorBehaviour) {
      errorBehaviour = ErrorBehaviour.exit;
    }

    let errorHandler: (error: any) => void;
    if (errorBehaviour === ErrorBehaviour.throw) {
      errorHandler = (error) => {
        throw error;
      };
    } else if (errorBehaviour === ErrorBehaviour.log) {
      errorHandler = (error) => {
        this.log(error);
      };
    } else {
      errorHandler = (error) => {
        this.error(error);
      };
    }

    const hookContext: ScriptHookContext = {
      hookType,
      commandId: hookOpts.commandId || hookOpts.Command.id,
      result: hookOpts.result as any
    };

    // build our script command arguments
    const scriptCommandArgs: string[] = [`--path`, scriptPath, '--hookcontext', JSON.stringify(hookContext)];
    copyFlagValues(hookOpts.argv, scriptCommandArgs, scriptCopyFlagSpecs);

    // run our script command
    try {
      await ScriptCommand.run(scriptCommandArgs);
    } catch(error) {
      errorHandler(error);
    }
  };
};
