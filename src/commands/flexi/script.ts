import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson, Optional } from '@salesforce/ts-types';
import * as fs from 'fs';
import * as path from 'path';
import { sync as resolveSync } from 'resolve';
import { ScriptContext, ScriptHookContext } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'org');

export class ScriptCommand extends SfdxCommand {
  public get hook(): ScriptHookContext {
    if (this._hook === undefined) {
      this._hook = this._resolveHookContext();
    }
    return this._hook;
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

  public async run(): Promise<AnyJson> {
    let scriptPath = this.flags.path;

    scriptPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(this.project.getPath(), scriptPath);

    if (!fs.existsSync(scriptPath)) {
      throw new SfdxError(`Unable to find script: ${scriptPath}`);
    }

    this.ux.log(`Executing Script: ${scriptPath}`);

    if (scriptPath.endsWith('.ts')) {
      const tsNodeModule = resolveSync('ts-node', {
        basedir: this.project.getPath(),
        preserveSymLinks: true
      });
      if (tsNodeModule) {
        const tsNode = require(tsNodeModule);
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

      const scriptModule = require(scriptPath);
      let result;
      if (typeof scriptModule === 'function') {
        result = await Promise.resolve(scriptModule(context));
      } else if (scriptModule.run) {
        result = await Promise.resolve(scriptModule.run(context));
      }
      return result;
    }
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
    const hookContext = this.flags.hookcontext;
    if (hookContext) {
      return JSON.parse(hookContext);
    }

    let hookContextPath = this.flags.hookcontextpath;
    if (hookContextPath) {
      hookContextPath = path.isAbsolute(hookContextPath)
        ? hookContextPath
        : path.join(this.project.getPath(), hookContextPath);
      if (fs.existsSync(hookContextPath)) {
        return JSON.parse(
          fs.readFileSync(hookContextPath, { encoding: 'utf8' })
        );
      }
    }

    return null;
  }
}
