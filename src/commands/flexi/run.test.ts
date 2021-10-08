import { Org, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { FileServiceRef } from '../../common/fs';
import { next } from '../../common/id';
import { RequireFunctionRef } from '../../common/Require';
import { HookType, PreDeployResult, SfdxContext, SfdxHookContext } from '../../types';
import ScriptCommand from './run';

jest.mock('resolve', () => {
    return {
        sync(id: string) {
            return id;
        }
    };
});

describe('flexi:script', () => {

    test('js script', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
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

        FileServiceRef.current = {
            existsSync() {
                return true;
            },
            readFileSync() {
                throw new Error('Illegal Call');
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
        let runContext: SfdxContext;
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
            return (context: SfdxContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.js', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.js'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.js');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('ts script', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
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

        FileServiceRef.current = {
            existsSync() {
                return true;
            },
            readFileSync() {
                throw new Error('Illegal Call');
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
        let runContext: SfdxContext;
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
            return (context: SfdxContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeFalsy();
    });

    test('hook context', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
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

        FileServiceRef.current = {
            existsSync() {
                return true;
            },
            readFileSync() {
                throw new Error('Illegal Call');
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
        let runContext: SfdxContext;
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
            return (context: SfdxContext) => {
                runContext = context;
            };
        };

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

        /*
        const hookContext: SfdxHookContext = {
            commandId: 'test:run',
            hookType: HookType.predeploy,
            result: preDeployResult
        };

        const hookContextId = next('hook');
        hookContextStore[hookContextId] = hookContext;

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com', '--hookcontext', hookContextId]);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeTruthy();
        expect(runContext.hook.commandId).toBe('test:run');
        */
    });

    test('hook context from path', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
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

        const hookContext: SfdxHookContext = {
            commandId: 'test:run',
            hookType: HookType.predeploy,
            result: preDeployResult
        };

        let hookContextPathRead: string;

        FileServiceRef.current = {
            existsSync() {
                return true;
            },
            readFileSync(path: string) {
                hookContextPathRead = path;
                // shouldn't be called
                return JSON.stringify(hookContext);
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
        let runContext: SfdxContext;
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
            return (context: SfdxContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com', '--hookcontext', 'testhookcontext.json']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeTruthy();
        expect(runContext.hook.commandId).toBe('test:run');
        expect(hookContextPathRead).toBe(pathUtils.join(projectPath, 'testhookcontext.json'));
    });

    test('run outside project', async () => {
        // we reject the resolve project with an `InvalidProjectWorkspace` error
        const mockResolveProject = jest.fn();
        mockResolveProject.mockRejectedValue({
            name: 'InvalidProjectWorkspace'
        });

        SfdxProject.resolve = mockResolveProject;

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue({
            getOrgId() {
                return 'test-org-id';
            }
        });

        Org.create = mockOrgCreate;

        FileServiceRef.current = {
            existsSync() {
                return true;
            },
            readFileSync() {
                throw new Error('Illegal Call');
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
        let runContext: SfdxContext;
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
            return (context: SfdxContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(process.cwd(), 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project).toBeFalsy();
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeFalsy();
    });
});
