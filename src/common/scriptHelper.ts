import { SfdxError, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { sync as resolveSync } from 'resolve';
import Ref from './Ref';

export type ProjectModuleLoader = (
    project: SfdxProject,
    scriptPath: string,
    requireFunc: NodeRequireFunction
  ) => unknown;

/**
 * Load a project module
 * @param project
 * @param scriptPath
 * @param requireFunc
 * @returns
 */
export const loadProjectModule: ProjectModuleLoader = (
  project: SfdxProject,
  scriptPath: string,
  requireFunc: NodeRequireFunction = require
) => {
  scriptPath = pathUtils.isAbsolute(scriptPath)
    ? scriptPath
    : pathUtils.join(project.getPath(), scriptPath);

  if (scriptPath.endsWith('.ts')) {
    const tsNodeModule = resolveSync('ts-node', {
      basedir: project.getPath(),
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

  return requireFunc(scriptPath);
};

interface ProjectModuleEntry {
  module: unknown;
  requireFunc: NodeRequireFunction;
}

const projectModuleEntries: { [key: string]: ProjectModuleEntry[] } = {};

/**
 * Loads a module and caches it
 * @param project
 * @param scriptPath
 * @param requireFunc
 * @returns
 */
export const loadProjectModuleCached: ProjectModuleLoader = (
  project: SfdxProject,
  scriptPath: string,
  requireFunc: NodeRequireFunction = require
) => {
  const key = `${project.getPath()}:${scriptPath}`;
  let entries = projectModuleEntries[key];
  if (!entries) {
    entries = [];
    projectModuleEntries[key] = entries;
  }

  let entry = entries.find(e => e.requireFunc === requireFunc);
  if (!entry) {
    entry = {
      module: loadProjectModule(project, scriptPath, requireFunc),
      requireFunc
    };
    entries.push(entry);
  }
  return entry.module;
};

/**
 * Maintains a reference to the project module loader
 */
export const projectModuleLoaderRef = new Ref<ProjectModuleLoader>({
  defaultSupplier: () => loadProjectModuleCached
});

/**
 * Resolve a function out of a module
 * @param module
 * @returns
 */
export const getModuleFunction = <T>(module: T | { [key: string]: T }): T => {
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
 * @param project
 * @param scriptPath
 * @param requireFunc
 * @returns
 */
export const getProjectFunction = <T>(
  project: SfdxProject,
  scriptPath: string,
  requireFunc: NodeRequireFunction = require
): T => {
  return getModuleFunction(projectModuleLoaderRef.current(project, scriptPath, requireFunc)) as T;
};
