import { FlagsConfig, SfdxCommand, flags } from "@salesforce/command";
import { Messages, SfdxError } from "@salesforce/core";
import { AnyJson } from "@salesforce/ts-types";
import { sync as resolveSync } from "resolve";
import * as path from "path";
import * as fs from "fs";

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages("flexi-hooks", "org");

export class ScriptCommand extends SfdxCommand {
  public static description = messages.getMessage("commandDescription");

  public static examples = [`$ sfdx flexi:script --path <script file path>`];

  public static args = [{ name: "file" }];

  static supportsUsername = true;

  static requiresProject = true;

  protected static flagsConfig: FlagsConfig = {
    path: flags.string({
      char: "p",
      required: true,
      description: messages.getMessage("pathFlagDescription"),
    }),
  };

  // this stores the hook context - typically used when called from the flexi hooks stuff
  public static hook: any;

  public hook: any;

  public async run(): Promise<AnyJson> {
    this.hook = ScriptCommand.hook;
    ScriptCommand.hook = undefined;

    let scriptPath = this.flags.path;

    scriptPath = path.isAbsolute(scriptPath)
      ? scriptPath
      : path.join(this.project.getPath(), scriptPath);

    if (!fs.existsSync(scriptPath)) {
      throw new SfdxError(`Unable to find hook script: ${scriptPath}`);
    }

    this.ux.log(`Executing Script: ${scriptPath}`);

    if (scriptPath.endsWith(".ts")) {
      const tsNodeModule = resolveSync("ts-node", {
        basedir: this.project.getPath(),
        preserveSymLinks: true,
      });
      if (tsNodeModule) {
        const tsNode = require(tsNodeModule);
        tsNode.register({
          transpileOnly: true,
          skipProject: true,
          compilerOptions: {
            target: "es2017",
            module: "commonjs",
            strict: false,
            skipLibCheck: true,
            skipDefaultLibCheck: true,
            moduleResolution: "node",
            allowJs: true,
            esModuleInterop: true,
          },
          files: [scriptPath],
        });
      } else {
        throw new SfdxError(`In order to use TypeScript, you need to install "ts-node" module:
          npm install -D ts-node
        or
          yarn add -D ts-node
        `);
      }

      const scriptModule = require(scriptPath);
      let result;
      if (typeof scriptModule === "function") {
        result = await Promise.resolve(scriptModule(this));
      } else if (scriptModule.run) {
        result = await Promise.resolve(scriptModule.run(this));
      }
      return result;
    }
  }
}
