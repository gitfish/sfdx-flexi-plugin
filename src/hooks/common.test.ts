import { Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import * as pathUtils from 'path';
import { FileServiceRef } from '../common/fs';
import { RequireFunctionRef, ResolveFunctionRef } from '../common/require';
import { HookType, PreDeployResult, SfdxHookContext } from '../types';
import {
  createHookDelegate, getTargetDevHubUsername, getTargetUsername, isJson
} from './common';

const throwInvalidCall = async () => {
  throw new Error('Invalid Call');
};

jest.mock('resolve', () => {
  return {
    sync(id: string) {
      return id;
    }
  };
});

describe('Hook Common', () => {
  test('get arg values', () => {
    let source = ['--json', '--targetusername', 'test@woo.com'];
    expect(getTargetUsername(source)).toBe('test@woo.com');
    expect(isJson(source)).toBeTruthy();

    source = ['--targetdevhubusername', 'test@hub.com'];
    expect(isJson(source)).toBeFalsy();
    expect(getTargetUsername(source)).toBeFalsy();
    expect(getTargetDevHubUsername(source)).toBe('test@hub.com');
  });

  test('hook delegate from project config js', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      async resolveProjectConfig(): Promise<JsonMap> {
        return {
          packageDirectories: [
            {
              path: 'force-app',
              default: true
            }
          ],
          plugins: {
            flexi: {
              hooks: {
                predeploy: 'woo.js'
              }
            }
          }
        };
      }
    });

    SfdxProject.resolve = mockResolveProject;

    const mockOrgCreate = jest.fn();
    mockOrgCreate.mockResolvedValue({
      getOrgId() {
        return 'test-org-id';
      }
    });

    Org.create = mockOrgCreate;

    const readFilePaths: string[] = [];
    FileServiceRef.current = {
      async pathExists(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      async readFile(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdir: throwInvalidCall,
      readdir: throwInvalidCall,
      unlink: throwInvalidCall,
      writeFile: throwInvalidCall
    };

    let requiredId: string;
    let runContext: SfdxHookContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    RequireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: SfdxHookContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    ResolveFunctionRef.current = (id: string) => {
      return id;
    };

    const predeploy = createHookDelegate<PreDeployResult>({
      type: HookType.predeploy
    });
    expect(predeploy).toBeTruthy();

    const preDeployResult: PreDeployResult = {
      woo: {
        mdapiFilePath: 'poo/woo/xml',
        workspaceElements: [
          {
            fullName: 'woo.xml',
            metadataName: 'Woo',
            sourcePath: 'src/woo.xml',
            state: 'dunno',
            deleteSupported: false
          }
        ]
      }
    };

    await Promise.resolve(
      predeploy.call(
        {},
        {
          Command: null,
          commandId: 'hook:parent',
          argv: [],
          result: preDeployResult
        }
      )
    );

    expect(requiredId).toBe('woo.js');
    expect(runContext).toBeTruthy();
    expect(runContext.commandId).toBe('hook:parent');
    expect(runContext.type).toBe(HookType.predeploy);
    expect(runContext.result).toBeTruthy();
    expect(runContext.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeFalsy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });

  test('hook delegate from project config ts', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      async resolveProjectConfig(): Promise<JsonMap> {
        return {
          packageDirectories: [
            {
              path: 'force-app',
              default: true
            }
          ],
          plugins: {
            flexi: {
              hooks: {
                predeploy: 'woo.ts'
              }
            }
          }
        };
      }
    });

    SfdxProject.resolve = mockResolveProject;

    const mockOrgCreate = jest.fn();
    mockOrgCreate.mockResolvedValue({
      getOrgId() {
        return 'test-org-id';
      }
    });

    Org.create = mockOrgCreate;

    const readFilePaths: string[] = [];
    FileServiceRef.current = {
      async pathExists(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      async readFile(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdir: throwInvalidCall,
      readdir: throwInvalidCall,
      unlink: throwInvalidCall,
      writeFile: throwInvalidCall
    };

    let requiredId: string;
    let runContext: SfdxHookContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    RequireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: SfdxHookContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    ResolveFunctionRef.current = (id: string) => {
      return id;
    };

    const predeploy = createHookDelegate<PreDeployResult>({
      type: HookType.predeploy
    });
    expect(predeploy).toBeTruthy();

    const preDeployResult: PreDeployResult = {
      woo: {
        mdapiFilePath: 'poo/woo/xml',
        workspaceElements: [
          {
            fullName: 'woo.xml',
            metadataName: 'Woo',
            sourcePath: 'src/woo.xml',
            state: 'dunno',
            deleteSupported: false
          }
        ]
      }
    };

    await Promise.resolve(
      predeploy.call(
        {},
        {
          Command: null,
          commandId: 'hook:parent',
          argv: [],
          result: preDeployResult
        }
      )
    );

    expect(requiredId).toBe('woo.ts');
    expect(runContext).toBeTruthy();
    expect(runContext.commandId).toBe('hook:parent');
    expect(runContext.type).toBe(HookType.predeploy);
    expect(runContext.result).toBeTruthy();
    expect(runContext.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeTruthy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });


});
