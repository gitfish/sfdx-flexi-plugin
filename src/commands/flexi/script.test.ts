import { Org, SfdxProject } from '@salesforce/core';
import FileServiceRef from '../../service/FileServiceRef';
import { HookType, PreDeployResult, ScriptContext, ScriptHookContext } from '../../types';
import { ScriptCommand } from './script';

jest.mock('resolve', () => {
    return {
        sync(id: string) {
            return id;
        }
    };
});

describe('flexi:script', () => {

    test('js script', async () => {
        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return 'test-project';
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
            existsSync(path: string) {
                return true;
            },
            readFileSync(path: string) {
                // shouldn't be called
                return null;
            }
        };

        let requiredId: string;
        let runContext: ScriptContext;
        let tsNodeRegisterOpts;
        ScriptCommand.requireFunc = (id: string) => {
            if (id === 'ts-node') {
                return {
                    register(opts) {
                        tsNodeRegisterOpts = opts;
                    }
                };
            }
            requiredId = id;
            return (context: ScriptContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.js', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(requiredId).toBe('test-project/test.js');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe('test-project');
        expect(runContext.flags.path).toBe('test.js');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('ts script', async () => {
        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return 'test-project';
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
                // shouldn't be called
                return null;
            }
        };

        let requiredId: string;
        let runContext: ScriptContext;
        let tsNodeRegisterOpts;
        ScriptCommand.requireFunc = (id: string) => {
            if (id === 'ts-node') {
                return {
                    register(opts) {
                        tsNodeRegisterOpts = opts;
                    }
                };
            }
            requiredId = id;
            return (context: ScriptContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe('test-project/test.ts');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe('test-project');
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeFalsy();
    });

    test("hook context", async () => {
        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return 'test-project';
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
                // shouldn't be called
                return null;
            }
        };

        let requiredId: string;
        let runContext: ScriptContext;
        let tsNodeRegisterOpts;
        ScriptCommand.requireFunc = (id: string) => {
            if (id === 'ts-node') {
                return {
                    register(opts) {
                        tsNodeRegisterOpts = opts;
                    }
                };
            }
            requiredId = id;
            return (context: ScriptContext) => {
                runContext = context;
            };
        };

        const preDeployResult: PreDeployResult = {
            'woo': {
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

        const hookContext: ScriptHookContext = {
            commandId: 'test:run',
            hookType: HookType.predeploy,
            result: preDeployResult
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com', '--hookcontext', JSON.stringify(hookContext)]);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe('test-project/test.ts');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe('test-project');
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
        expect(runContext.hook).toBeTruthy();
        expect(runContext.hook.commandId).toBe('test:run');
    });
});
