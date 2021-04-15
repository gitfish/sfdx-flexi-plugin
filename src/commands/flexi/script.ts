import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson, Optional } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { FileService, fileServiceRef } from '../../common/FileService';
import hookContextStore from '../../common/hookContextStore';
import { requireFunctionRef } from '../../common/Require';
import { loadProjectModule } from '../../common/scriptHelper';
import { ScriptContext, ScriptHookContext, ScriptModule, ScriptModuleFunc } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'script');

export class ScriptCommand extends SfdxCommand {
  public get hook(): ScriptHookContext {
    if (!this._hook) {
      this._hook = this._resolveHookContext();
    }
    return this._hook;
  }
  public set hook(value: ScriptHookContext) {
    this._hook = value;
  }

  public get requireFunc(): NodeRequireFunction {
    if (!this._requireFunc) {
      return requireFunctionRef.current;
    }
    return this._requireFunc;
  }
  public set requireFunc(value: NodeRequireFunction) {
    this._requireFunc = value;
  }

  public get fileService(): FileService {
    if (!this._fileService) {
      return fileServiceRef.current;
    }
    return this._fileService;
  }
  public set fileService(value: FileService) {
    this._fileService = value;
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    '$ sfdx flexi:script --path <script file path>',
    '$ sfdx flexi:script --path <script file path> --hookcontext <hook context json>',
    '$ sfdx flexi:script --path <script file path> --hookcontextid <hook context json path>'
  ];

  public static requiresUsername = true;

  public static requiresDevhubUsername = true;

  public static requiresProject = true;

  protected static flagsConfig: FlagsConfig = {
    path: flags.string({
      char: 'p',
      required: true,
      description: messages.getMessage('pathFlagDescription')
    }),
    hookcontextid: flags.string({
      char: 'i',
      required: false,
      description: messages.getMessage('hookContextIdDescription')
    }),
    hookcontext: flags.string({
      char: 'h',
      required: false,
      description: messages.getMessage('hookContextFlagDescription')
    })
  };

  private _hook: ScriptHookContext;
  private _requireFunc: NodeRequireFunction;
  private _fileService: FileService;

  public async run(): Promise<AnyJson> {
    let scriptPath = this.flags.path;

    scriptPath = pathUtils.isAbsolute(scriptPath)
      ? scriptPath
      : pathUtils.join(this.project.getPath(), scriptPath);

    if (!this.fileService.existsSync(scriptPath)) {
      throw new SfdxError(`Unable to find script: ${scriptPath}`);
    }

    this.ux.startSpinner(`Executing Script: ${scriptPath}`);

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
      hook: this.hook
    };

    const scriptModule = this.loadScriptModule(scriptPath);

    // resolve our handler func
    let result;
    let func: ScriptModuleFunc;
    if (typeof scriptModule === 'function') {
      func = scriptModule;
    } else if (scriptModule !== null && typeof scriptModule === 'object') {
      for (const key in scriptModule) {
        if (scriptModule.hasOwnProperty(key) && typeof scriptModule[key] === 'function') {
          func = scriptModule[key];
          break;
        }
      }
    }
    if (func) {
      result = await Promise.resolve(func(context));
    }

    this.ux.stopSpinner();

    return result;
  }

  protected loadScriptModule(scriptPath: string): ScriptModule | ScriptModuleFunc {
    return loadProjectModule(this.project, scriptPath, this.requireFunc) as ScriptModule | ScriptModuleFunc;
  }

  protected async finally(err: Optional<Error>): Promise<void> {
    // we don't want to output anything when we're in a hook
    if (!this.hook) {
      return super.finally(err);
    }
    if (!this.flags.json) {
      this.result.display();
    }
  }

  private _resolveHookContext(): ScriptHookContext {
    const hookContextId = this.flags.hookcontextid;
    if (hookContextId) {
      let hookContext = hookContextStore[hookContextId];
      if (!hookContext) {
        const hookContextPath = pathUtils.isAbsolute(hookContextId)
        ? hookContextId
        : pathUtils.join(this.project.getPath(), hookContextId);
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

    if (this.flags.hookcontext) {
      return JSON.parse(this.flags.hookcontext);
    }

    return null;
  }
}
