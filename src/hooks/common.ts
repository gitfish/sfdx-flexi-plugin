import { Command, Hook } from '@oclif/config';
import ScriptCommand from '../commands/flexi/script';
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
scriptCopyFlagSpecs.push({ name: 'targetusername', char: 'u', type: FlagType.string });
scriptCopyFlagSpecs.push({ name: 'apiversion', type: FlagType.string });
scriptCopyFlagSpecs.push({ name: 'targetdevhubusername', char: 'v', type: FlagType.string });
scriptCopyFlagSpecs.push({ name: 'json', type: FlagType.boolean });

/**
 * Creates a hook function that delegates to a script with the sfdx project.
 * NOTE: By default if an exception is caught when executing the delegate script, the plugin will exit.
 * To change this behaviour, set errorBehaviour to 'throw' or 'warn' (by default it's 'exit')
 * @param hookType the type of hook to create
 * @returns a HookFunction
 */
export const createScriptDelegate = <R extends HookResult = HookResult>(
  hookType: HookType
): HookFunction<R> => {

  // Note that we're using a standard function as arrow functions are bound to the current 'this'.
  // tslint:disable-next-line: only-arrow-functions
  return async function(hookOpts: HookOptions<R>) {
    const hookContext: ScriptHookContext = {
      hookType,
      commandId: hookOpts.commandId || hookOpts.Command?.id,
      result: hookOpts.result,
      config: this.config
    };

    const hookContextId = next('hook');
    hookContextStore[hookContextId] = hookContext;

    // build our script command arguments
    const scriptCommandArgs: string[] = ['--hookcontext', hookContextId];
    copyFlagValues(hookOpts.argv, scriptCommandArgs, scriptCopyFlagSpecs);

    // run our script command
    await ScriptCommand.run(scriptCommandArgs);
  };
};
