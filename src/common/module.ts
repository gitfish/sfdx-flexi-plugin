import { SfdxError } from '@salesforce/core';
import * as pathUtils from 'node:path';
import { sync as resolveSync } from 'resolve';
import { RequireFunctionRef } from './require';

export interface ModuleLoadOptions {
  resolvePath?: string;
  tsConfig?: any; // eslint-disable-line
}

export const defaultModuleLoadOptions: ModuleLoadOptions = {
  resolvePath: process.cwd(),
};

export const tsConfigDefault = {
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    target: 'es2021',
    module: 'CommonJS',
    strict: false,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    moduleResolution: 'node',
    allowJs: true,
    esModuleInterop: true
  }
};

/**
 * Load a project module
 * @param path the module path
 * @param opts the module load options
 * @returns
 */
// eslint-disable-next-line
export const loadModule = (path: string, opts?: ModuleLoadOptions): any => {
  opts = { ...defaultModuleLoadOptions, ...opts };
  const { resolvePath } = opts;
  const requireFunc = RequireFunctionRef.current;
  path = pathUtils.isAbsolute(path) ? path : pathUtils.join(resolvePath, path);

  if (path.endsWith('.ts')) {
    const tsNodeModule = resolveSync('ts-node', {
      basedir: resolvePath,
      preserveSymLinks: true
    });
    if (tsNodeModule) {
      const tsNode = requireFunc(tsNodeModule);
      let registerOpts = {
        ...tsConfigDefault
      };
      if(opts.tsConfig) {
        // this is a bit of a mess - we need a deep merge
        const tsConfig = { ...opts.tsConfig };
        const tsCompilerOptions = tsConfig.compilerOptions;
        delete tsConfig.compilerOptions;
        registerOpts = {
          ...registerOpts,
          ...tsConfig
        };
        if(tsCompilerOptions) {
          registerOpts.compilerOptions = {
            ...registerOpts.compilerOptions,
            ...tsCompilerOptions
          };
        }
      }
      tsNode.register({
        ...registerOpts,
        files: [path]
      });
    } else {
      throw new SfdxError(`In order to use TypeScript, you need to install "ts-node" module:
          npm install -D ts-node
        or
          yarn add -D ts-node
        `);
    }
  }

  return requireFunc(path);
};

/**
 * Resolve a function out of a module
 * @param module the module to resolve the function from
 * @returns
 */
// eslint-disable-next-line
export const getFunction = <T>(module: any, exportName?: string): T => {
  if(exportName) {
    return module[exportName];
  }
  
  if (typeof module === 'function') {
    return module;
  }

  const defaultExport = module.default;
  if(defaultExport) {
    return defaultExport;
  }

  for (const key of Object.keys(module)) {
    if (typeof module[key] === 'function') {
      return module[key];
    }
  }
};

export interface GetModuleFunctionOptions extends ModuleLoadOptions {
  exportName?: string;
}

/**
 * Load a project function using the project module loader
 * @param path the path to the module
 * @param opts module loading options
 * @returns
 */
export const getModuleFunction = <T>(path: string, opts?: GetModuleFunctionOptions): T => {
  return <T>getFunction(loadModule(path, opts), opts?.exportName);
};
