import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError, SfdxProject, SfdxProjectJson } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { FileService, fileServiceRef } from '../../common/FileService';
import hookContextStore from '../../common/hookContextStore';
import { RequireFunc, requireFunctionRef } from '../../common/Require';
import { getModuleFunction } from '../../common/scriptHelper';
import { ScriptContext, ScriptFunction, ScriptHookContext } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'script');

export const DEFAULT_HOOKS_DIR = 'hooks';

export class ScriptCommand extends SfdxCommand {
  public get hook(): ScriptHookContext {
    if (!this.hookInternal) {
      this.hookInternal = this.resolveHookContext();
    }
    return this.hookInternal;
  }
  public set hook(value: ScriptHookContext) {
    this.hookInternal = value;
  }

  public get requireFunc(): RequireFunc {
    if (!this.requireFuncInternal) {
      return requireFunctionRef.current;
    }
    return this.requireFuncInternal;
  }
  public set requireFunc(value: RequireFunc) {
    this.requireFuncInternal = value;
  }

  public get fileService(): FileService {
    if (!this.fileServiceInternal) {
      return fileServiceRef.current;
    }
    return this.fileServiceInternal;
  }
  public set fileService(value: FileService) {
    this.fileServiceInternal = value;
  }

  get basePath(): string {
    return this.project ? this.project.getPath() : process.cwd();
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ sfdx flexi:script --path <script file path>',
    '$ sfdx flexi:script --hookcontext <hook context json>',
    '$ sfdx flexi:script --hookcontextid <hook context json path>'
  ];

  public static supportsUsername = true;

  public static supportsDevhubUsername = true;

  // NOTE: whilst we require project here, we've overridden the assignProject so that the project will be null if we're not inside a project
  public static requiresProject = true;

  public static varargs = true;

  protected static flagsConfig: FlagsConfig = {
    path: flags.string({
      char: 'p',
      description: messages.getMessage('pathFlagDescription'),
      required: false
    }),
    hookcontext: flags.string({
      char: 'h',
      required: false,
      description: messages.getMessage('hookContextFlagDescription')
    }),
    hookdir: flags.string({
      char: 'd',
      required: false,
      description: messages.getMessage('hookDirFlagDescription'),
      default: DEFAULT_HOOKS_DIR
    })
  };

  private hookInternal: ScriptHookContext;
  private requireFuncInternal: RequireFunc;
  private fileServiceInternal: FileService;

  public async run(): Promise<AnyJson> {
    const path = await this.resolveScriptPath();

    // if we're in a hook we don't care whether the
    if (!path) {
      if (this.hook) {
        return null;
      }
      throw new SfdxError('Please specify a script path');
    }

    if (!this.fileService.existsSync(path)) {
      if (this.hook) {
        return null;
      }
      throw new SfdxError(`Unable to find script: ${path}`);
    }

    const context: ScriptContext = {
      args: this.args,
      configAggregator: this.configAggregator,
      flags: this.flags,
      logger: this.logger,
      result: this.result,
      ux: this.ux,
      hubOrg: this.hubOrg,
      org: this.org,
      project: this.project,
      varargs: this.varargs,
      hook: this.hook,
      config: this.config,
      argv: this.argv
    };

    // resolve our handler func
    let func: ScriptFunction;
    try {
      func = getModuleFunction(path, {
        resolvePath: this.basePath,
        requireFunc: this.requireFunc
      });
    } catch(err) {
      this.ux.log(`Error loading module: ${path} with resolve path: ${this.basePath}`);
      this.logger.error(err);
      throw err;
    }

    let result;

    if (func) {
      result = await Promise.resolve(func(context));
    }

    return result;
  }

  protected async resolveHookScriptPath(): Promise<string> {
    let r: string;
    if (this.project) {
      // we try to find any hook configuration from the project file
      const projectJson: SfdxProjectJson = this.project.getSfdxProjectJson();
      const projectConfig = projectJson.getContents();
      // the flexi hooks config will be configured against the hooks key in the project config
      const hookConfig = projectConfig.hooks;

      r = <string>hookConfig?.[this.hook.hookType];
    }

    if (!r) {
      let hookBasePath = this.flags.hookdir || DEFAULT_HOOKS_DIR;
      if (!pathUtils.isAbsolute(hookBasePath)) {
        hookBasePath = pathUtils.join(this.basePath, hookBasePath);
      }
      r = pathUtils.join(hookBasePath, `${this.hook.hookType}.js`);
      if (!this.fileService.existsSync(r)) {
        r = pathUtils.join(hookBasePath, `${this.hook.hookType}.ts`);
      }
    }

    return r;
  }

  protected async resolveScriptPath(): Promise<string> {
    let r = this.flags.path;
    if (!r && this.hook) {
      r = await this.resolveHookScriptPath();
    }

    return r ? pathUtils.isAbsolute(r) ? r : pathUtils.join(this.basePath, r) : undefined;
  }

  // eslint-disable-next-line
  protected async catch(err: any): Promise<void> {
    await super.catch(err);
    if (this.hook) {
      throw err;
    }
  }

  protected async assignProject(): Promise<void> {
    // Throw an error if the command requires to be run from within an SFDX project but we
    // don't have a local config.
    try {
      this.project = await SfdxProject.resolve();
    } catch (err) {
      if (err.name === 'InvalidProjectWorkspace') {
        this.ux.warn('The command is not running within a project context');
      } else {
        throw err;
      }
    }
  }

  private resolveHookContext(): ScriptHookContext {
    const hookContextId = this.flags.hookcontext;
    if (hookContextId) {
      let hookContext = hookContextStore[hookContextId];
      if (!hookContext) {
        const hookContextPath = pathUtils.isAbsolute(hookContextId)
        ? hookContextId
        : pathUtils.join(this.basePath, hookContextId);
        if (this.fileService.existsSync(hookContextPath)) {
          hookContext = JSON.parse(
            this.fileService.readFileSync(hookContextPath)
          );
        }
      }
      if (!hookContext) {
        throw new SfdxError(`Unable to resolve hook context from id: ${hookContextId}`);
      }

      return hookContext;
    }

    return null;
  }
}

export default ScriptCommand;
