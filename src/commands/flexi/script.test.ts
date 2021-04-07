import { Org, SfdxProject } from '@salesforce/core';
import { ScriptContext } from '../../types';
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

        ScriptCommand.fileExistsCheck = (path: string) => true;

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

        ScriptCommand.fileExistsCheck = (path: string) => true;

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
    });
});
