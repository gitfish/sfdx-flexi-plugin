import { SfdxError } from '@salesforce/core';
import { RequireFunctionRef, ResolveFunctionRef } from './require';

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
  const resolveFunc = ResolveFunctionRef.current;

  if (path.endsWith('.ts')) {
    // resolve the path to ts node
    const tsNodePath = resolveFunc('ts-node', {
      paths: [resolvePath]
    });
    if (tsNodePath) {
      const tsNode = requireFunc(tsNodePath);
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

  const resolvedPath = resolveFunc(path, {
    paths: [resolvePath]
  });

  return requireFunc(resolvedPath);
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
