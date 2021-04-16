import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson, Optional } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { FileService, fileServiceRef } from '../../common/FileService';
import hookContextStore from '../../common/hookContextStore';
import { requireFunctionRef } from '../../common/Require';
import { loadProjectFunction } from '../../common/scriptHelper';
import { ScriptContext, ScriptFunction, ScriptHookContext } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'script');

export default class ScriptCommand extends SfdxCommand {
  public get hook(): ScriptHookContext {
    if (!this.hookInternal) {
      this.hookInternal = this._resolveHookContext();
    }
    return this.hookInternal;
  }
  public set hook(value: ScriptHookContext) {
    this.hookInternal = value;
  }

  public get requireFunc(): NodeRequireFunction {
    if (!this.requireFuncInternal) {
      return requireFunctionRef.current;
    }
    return this.requireFuncInternal;
  }
  public set requireFunc(value: NodeRequireFunction) {
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

  private hookInternal: ScriptHookContext;
  private requireFuncInternal: NodeRequireFunction;
  private fileServiceInternal: FileService;

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

    // resolve our handler func
    const func: ScriptFunction = loadProjectFunction(this.project, scriptPath, this.requireFunc);

    let result;
    if (func) {
      result = await Promise.resolve(func(context));
    }

    this.ux.stopSpinner();

    return result;
  }

  protected async finally(err: Optional<Error>): Promise<void> {
    // we don't want to output anything when we're in a hook
    if (!this.hook) {
      await super.finally(err);
      // if we're in a hook and we have an error, we want to throw
      if (err) {
        throw err;
      }
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
