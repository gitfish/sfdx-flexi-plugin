import { SfdxError } from '@salesforce/core';
import * as pathUtils from 'path';
import { sync as resolveSync } from 'resolve';

export interface ModuleLoadOptions {
  resolvePath?: string;
  requireFunc?: NodeRequireFunction;
}

export const defaultModuleLoadOptions: ModuleLoadOptions = {
  resolvePath: process.cwd(),
  requireFunc: require
};

/**
 * Load a project module
 * @param path the module path
 * @param opts the module load options
 * @returns
 */
export const loadModule = (path: string, opts?: ModuleLoadOptions) => {
  opts = { ...defaultModuleLoadOptions, ...opts };
  const { resolvePath, requireFunc } = opts;
  path = pathUtils.isAbsolute(path) ? path : pathUtils.join(resolvePath, path);

  if (path.endsWith('.ts')) {
    const tsNodeModule = resolveSync('ts-node', {
      basedir: resolvePath,
      preserveSymLinks: true
    });
    if (tsNodeModule) {
      const tsNode = requireFunc(tsNodeModule);
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
export const getFunction = <T>(module: T | { [key: string]: T }): T => {
  let r: T;
  if (typeof module === 'function') {
    r = module;
  } else if (module !== null && typeof module === 'object') {
    for (const key in module as { [key: string]: T }) {
      if (module.hasOwnProperty(key) && typeof module[key] === 'function') {
        r = module[key];
        break;
      }
    }
  }
  return r;
};

/**
 * Load a project function using the project module loader
 * @param path the path to the module
 * @param opts module loading options
 * @returns
 */
export const getModuleFunction = <T>(path: string, opts?: ModuleLoadOptions): T => {
  return getFunction(loadModule(path, opts)) as T;
};
