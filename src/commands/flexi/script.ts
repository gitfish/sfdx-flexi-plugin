import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson, Optional } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { sync as resolveSync } from 'resolve';
import { FileService, fileServiceRef } from '../../common/FileService';
import { requireFunctionRef } from '../../common/Require';
import { ScriptContext, ScriptHookContext, ScriptModule, ScriptModuleFunc } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'org');

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
    '$ sfdx flexi:script --path <script file path> --hookcontextpath <hook context json path>'
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
    hookcontext: flags.string({
      char: 'h',
      required: false,
      description: messages.getMessage('hookContextFlagDescription')
    }),
    hookcontextpath: flags.string({
      char: 'd',
      required: false,
      description: messages.getMessage('hookContextPathFlagDescription')
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

    this.ux.log(`Executing Script: ${scriptPath}`);

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

    let result;
    if (typeof scriptModule === 'function') {
      result = await Promise.resolve(scriptModule(context));
    } else if (scriptModule.run) {
      result = await Promise.resolve(scriptModule.run(context));
    }
    return result;
  }

  protected loadScriptModule(scriptPath: string): ScriptModule | ScriptModuleFunc {
    if (scriptPath.endsWith('.ts')) {
      const tsNodeModule = resolveSync('ts-node', {
        basedir: this.project.getPath(),
        preserveSymLinks: true
      });
      if (tsNodeModule) {
        const tsNode = this.requireFunc(tsNodeModule);
        tsNode.register({
          transpileOnly: true,
          skipProject: true,
          compilerOptions: {
            target: 'es2017',
            module: 'commonjs',
            strict: false,
            skipLibCheck: true,
            skipDefaultLibCheck: true,
            moduleResolution: 'node',
            allowJs: true,
            esModuleInterop: true
          },
          files: [scriptPath]
        });
      } else {
        throw new SfdxError(`In order to use TypeScript, you need to install "ts-node" module:
          npm install -D ts-node
        or
          yarn add -D ts-node
        `);
      }
    }

    return this.requireFunc(scriptPath) as ScriptModule | ScriptModuleFunc;
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
    const hookContext = this.flags?.hookcontext;
    if (hookContext) {
      return JSON.parse(hookContext);
    }

    let hookContextPath = this.flags?.hookcontextpath;
    if (hookContextPath) {
      hookContextPath = pathUtils.isAbsolute(hookContextPath)
        ? hookContextPath
        : pathUtils.join(this.project.getPath(), hookContextPath);
      if (this.fileService.existsSync(hookContextPath)) {
        return JSON.parse(
          this.fileService.readFileSync(hookContextPath)
        );
      }
    }

    return null;
  }
}
