import { SfdxError, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { sync as resolveSync } from 'resolve';

/**
 * Load a project module
 * @param project
 * @param scriptPath
 * @param requireFunc
 * @returns
 */
export const loadProjectModule = (
  project: SfdxProject,
  scriptPath: string,
  requireFunc: NodeRequireFunction = require
): unknown => {
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

export const loadProjectFunction = <T>(
  project: SfdxProject,
  scriptPath: string,
  requireFunc: NodeRequireFunction = require
): T => {
  return getModuleFunction(loadProjectModule(project, scriptPath, requireFunc)) as T;
};
