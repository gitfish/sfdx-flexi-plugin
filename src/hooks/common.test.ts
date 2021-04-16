import { Org, SfdxProject, SfdxProjectJson } from '@salesforce/core';
import * as pathUtils from 'path';
import { fileServiceRef } from '../common/FileService';
import { requireFunctionRef } from '../common/Require';
import { HookType, PreDeployResult, ScriptContext } from '../types';
import {
  copyFlagValues,
  createScriptDelegate,
  defaultScriptDelegateOptions,
  FlagType
} from './common';

jest.mock('resolve', () => {
  return {
    sync(id: string) {
      return id;
    }
  };
});

describe('Hook Common', () => {
  test('copy flag values', () => {
    const source = ['--json', '--targetusername', 'test@woo.com'];
    const dest = [];
    copyFlagValues(source, dest, [
      {
        name: 'json',
        type: FlagType.boolean
      },
      {
        name: 'targetusername',
        type: FlagType.string
      }
    ]);

    expect(source[0]).toBe('--json');
    expect(source[1]).toBe('--targetusername');
    expect(source[2]).toBe('test@woo.com');
  });

  test('hook delegate default', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      getSfdxProjectJson(): Partial<SfdxProjectJson> {
        return {
          getContents() {
            return {
              packageDirectories: [
                {
                  path: 'force-app',
                  default: true
                }
              ]
            };
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
    fileServiceRef.current = {
      existsSync(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      readFileSync(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdirSync() {
        throw new Error('Illegal Call');
      },
      async readdir() {
        throw new Error('Illegal Call');
      },
      readdirSync() {
        throw new Error('Illegal Call');
      },
      async unlink() {
        throw new Error('Illegal Call');
      },
      async writeFile() {
        throw new Error('Illegal Call');
      }
    };

    let requiredId: string;
    let runContext: ScriptContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    requireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: ScriptContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    const predeploy = createScriptDelegate<PreDeployResult>({
      hookType: HookType.predeploy
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

    expect(requiredId).toBe(
      pathUtils.join(
        projectPath,
        defaultScriptDelegateOptions.hooksDir,
        'predeploy.js'
      )
    );
    expect(runContext).toBeTruthy();
    expect(runContext.hook.commandId).toBe('hook:parent');
    expect(runContext.hook.hookType).toBe(HookType.predeploy);
    expect(runContext.hook.result).toBeTruthy();
    expect(runContext.hook.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeFalsy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });

  test('hook delegate default typescript', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      getSfdxProjectJson(): Partial<SfdxProjectJson> {
        return {
          getContents() {
            return {
              packageDirectories: [
                {
                  path: 'force-app',
                  default: true
                }
              ]
            };
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
    fileServiceRef.current = {
      existsSync(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return path.endsWith('.ts');
      },
      readFileSync(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdirSync() {
        throw new Error('Illegal Call');
      },
      async readdir() {
        throw new Error('Illegal Call');
      },
      readdirSync() {
        throw new Error('Illegal Call');
      },
      async unlink() {
        throw new Error('Illegal Call');
      },
      async writeFile() {
        throw new Error('Illegal Call');
      }
    };

    let requiredId: string;
    let runContext: ScriptContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    requireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: ScriptContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    const predeploy = createScriptDelegate<PreDeployResult>({
      hookType: HookType.predeploy
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

    expect(requiredId).toBe(
      pathUtils.join(
        projectPath,
        defaultScriptDelegateOptions.hooksDir,
        'predeploy.ts'
      )
    );
    expect(runContext).toBeTruthy();
    expect(runContext.hook.commandId).toBe('hook:parent');
    expect(runContext.hook.hookType).toBe(HookType.predeploy);
    expect(runContext.hook.result).toBeTruthy();
    expect(runContext.hook.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeTruthy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });

  test('hook delegate from project config js', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      getSfdxProjectJson(): Partial<SfdxProjectJson> {
        return {
          getContents() {
            return {
              packageDirectories: [
                {
                  path: 'force-app',
                  default: true
                }
              ],
              hooks: {
                predeploy: 'woo.js'
              }
            };
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
    fileServiceRef.current = {
      existsSync(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      readFileSync(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdirSync() {
        throw new Error('Illegal Call');
      },
      async readdir() {
        throw new Error('Illegal Call');
      },
      readdirSync() {
        throw new Error('Illegal Call');
      },
      async unlink() {
        throw new Error('Illegal Call');
      },
      async writeFile() {
        throw new Error('Illegal Call');
      }
    };

    let requiredId: string;
    let runContext: ScriptContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    requireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: ScriptContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    const predeploy = createScriptDelegate<PreDeployResult>({
      hookType: HookType.predeploy
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

    expect(requiredId).toBe(pathUtils.join(projectPath, 'woo.js'));
    expect(runContext).toBeTruthy();
    expect(runContext.hook.commandId).toBe('hook:parent');
    expect(runContext.hook.hookType).toBe(HookType.predeploy);
    expect(runContext.hook.result).toBeTruthy();
    expect(runContext.hook.result.woo).toBeTruthy();
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
      getSfdxProjectJson(): Partial<SfdxProjectJson> {
        return {
          getContents() {
            return {
              packageDirectories: [
                {
                  path: 'force-app',
                  default: true
                }
              ],
              hooks: {
                predeploy: 'woo.ts'
              }
            };
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
    fileServiceRef.current = {
      existsSync(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      readFileSync(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdirSync() {
        throw new Error('Illegal Call');
      },
      async readdir() {
        throw new Error('Illegal Call');
      },
      readdirSync() {
        throw new Error('Illegal Call');
      },
      async unlink() {
        throw new Error('Illegal Call');
      },
      async writeFile() {
        throw new Error('Illegal Call');
      }
    };

    let requiredId: string;
    let runContext: ScriptContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    requireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: ScriptContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    const predeploy = createScriptDelegate<PreDeployResult>({
      hookType: HookType.predeploy
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

    expect(requiredId).toBe(pathUtils.join(projectPath, 'woo.ts'));
    expect(runContext).toBeTruthy();
    expect(runContext.hook.commandId).toBe('hook:parent');
    expect(runContext.hook.hookType).toBe(HookType.predeploy);
    expect(runContext.hook.result).toBeTruthy();
    expect(runContext.hook.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeTruthy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });

  test('hook delegate from project config ts', async () => {
    const projectPath = `${pathUtils.sep}test-project`;

    const mockResolveProject = jest.fn();
    mockResolveProject.mockResolvedValue({
      getPath() {
        return projectPath;
      },
      getSfdxProjectJson(): Partial<SfdxProjectJson> {
        return {
          getContents() {
            return {
              packageDirectories: [
                {
                  path: 'force-app',
                  default: true
                }
              ],
              hooks: {
                predeploy: 'woo.ts'
              }
            };
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
    fileServiceRef.current = {
      existsSync(path: string) {
        console.log('-- Checking Path Exists: ' + path);
        return true;
      },
      readFileSync(path: string) {
        console.log('-- Read File: ' + path);
        readFilePaths.push(path);
        return null;
      },
      mkdirSync() {
        throw new Error('Illegal Call');
      },
      async readdir() {
        throw new Error('Illegal Call');
      },
      readdirSync() {
        throw new Error('Illegal Call');
      },
      async unlink() {
        throw new Error('Illegal Call');
      },
      async writeFile() {
        throw new Error('Illegal Call');
      }
    };

    let requiredId: string;
    let runContext: ScriptContext<PreDeployResult>;
    let tsNodeRegisterOpts;
    requireFunctionRef.current = (id: string) => {
      if (id === 'ts-node') {
        return {
          register(opts) {
            tsNodeRegisterOpts = opts;
          }
        };
      }
      requiredId = id;
      return (context: ScriptContext<PreDeployResult>) => {
        runContext = context;
      };
    };

    const predeploy = createScriptDelegate<PreDeployResult>({
      hookType: HookType.predeploy
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

    expect(requiredId).toBe(pathUtils.join(projectPath, 'woo.ts'));
    expect(runContext).toBeTruthy();
    expect(runContext.hook.commandId).toBe('hook:parent');
    expect(runContext.hook.hookType).toBe(HookType.predeploy);
    expect(runContext.hook.result).toBeTruthy();
    expect(runContext.hook.result.woo).toBeTruthy();
    expect(tsNodeRegisterOpts).toBeTruthy(); // in this case, the js file is found, so no need to load ts

    expect(readFilePaths.length).toBe(0);
  });
});
