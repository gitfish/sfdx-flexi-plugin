import { flags, FlagsConfig, SfdxCommand } from '@salesforce/command';
import { Messages, SfdxProject } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { RequireFunctionRef } from '../../common/require';
import { getModuleFunction } from '../../common/module';
import { SfdxContext, SfdxFunction } from '../../types';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('sfdx-flexi-plugin', 'run');

export class RunCommand extends SfdxCommand {

  get basePath(): string {
    return this.project ? this.project.getPath() : process.cwd();
  }

  public static description = messages.getMessage('commandDescription');

  public static aliases = ['flexi:script', 'flexi:execute', 'flexi:exec'];

  public static examples = [
    '$ sfdx flexi:run --path <module path>',
    '$ sfdx flexi:run --path <module path> --export <module export name>',
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
    export: flags.string({
      char: 'x',
      description: messages.getMessage('exportFlagDescription')
    })
  };

  public async run(): Promise<AnyJson> {
    let modulePath: string = this.flags.path;
    if(!pathUtils.isAbsolute(modulePath)) {
      modulePath = pathUtils.join(this.basePath, modulePath);
    }

    const context: SfdxContext = {
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
      config: this.config,
      argv: this.argv
    };

    // resolve our handler func
    const func: SfdxFunction = getModuleFunction(modulePath, {
      resolvePath: this.basePath,
      requireFunc: RequireFunctionRef.current,
      exportName: this.flags.export
    });

    if (func) {
      const result = await Promise.resolve(func(context));
      return <AnyJson>result;
    }

    throw new Error(`Unable to resolve function from module ${modulePath}`);
  }

  protected async resolveScriptPath(): Promise<string> {
    const r = this.flags.path;
    return r ? pathUtils.isAbsolute(r) ? r : pathUtils.join(this.basePath, r) : undefined;
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
}

export default RunCommand;