import { Command, Hook } from "@oclif/config";
import { SfdxProject, SfdxProjectJson } from "@salesforce/core";
import { JsonMap } from "@salesforce/ts-types";
import * as path from "path";
import * as fs from "fs";
import { ScriptCommand } from "../commands/flexi/script";

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

export enum HookType {
  predeploy = "predeploy",
  postdeploy = "postdeploy",
  preretrieve = "preretrieve",
  postretrieve = "postretrieve",
  postsourceupdate = "postsourceupdate",
  postorgcreate = "postorgcreate",
}

export enum ErrorBehaviour {
  exit = "exit",
  log = "log",
  throw = "throw",
}

const DEFAULT_PROJECT_HOOKS_DIR = "hooks";

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

    ScriptCommand.hook = {
      hookType,
      commandId: hookOpts.commandId,
      commandArgs: hookOpts.argv,
      result: hookOpts.result,
      context: this
    };

    // run our script command
    try {
      await ScriptCommand.run(['--path', scriptPath])
    } catch(error) {
      errorHandler(error);
    }
  };
};
