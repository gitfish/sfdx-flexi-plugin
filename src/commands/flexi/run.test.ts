import { Org, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { FileServiceRef } from '../../common/fs';
import { RequireFunctionRef } from '../../common/Require';
import { SfdxRunContext } from '../../types';
import RunCommand from './run';

jest.mock('resolve', () => {
    return {
        sync(id: string) {
            return id;
        }
    };
});

const throwInvalidCall = async () => {
    throw new Error('Invalid Call');
};

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
            async pathExists() {
                return true;
            },
            async readFile() {
                throw new Error('Illegal Call');
            },
            async mkdir() {
                throw new Error('Illegal Call');
            },
            async readdir() {
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
        let runContext: SfdxRunContext;
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
            return (context: SfdxRunContext) => {
                runContext = context;
            };
        };

        await RunCommand.run(['--path', 'test.js', '--targetusername', 'woo@test.com']);

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
            async pathExists() {
                return true;
            },
            readFile: throwInvalidCall,
            mkdir: throwInvalidCall,
            readdir: throwInvalidCall,
            unlink: throwInvalidCall,
            writeFile: throwInvalidCall
        };

        let requiredId: string;
        let runContext: SfdxRunContext;
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
            return (context: SfdxRunContext) => {
                runContext = context;
            };
        };

        await RunCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('ts script with export', async () => {
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
            async pathExists() {
                return true;
            },
            readFile: throwInvalidCall,
            mkdir: throwInvalidCall,
            readdir: throwInvalidCall,
            unlink: throwInvalidCall,
            writeFile: throwInvalidCall
        };

        let requiredId: string;
        let runContext: SfdxRunContext;
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
            return {
                main: (context: SfdxRunContext) => {
                    runContext = context;
                }
            };
        };

        await RunCommand.run(['--path', 'test.ts', '--export', 'main', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeTruthy();
        expect(requiredId).toBe(pathUtils.join(projectPath, 'test.ts'));
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.export).toBe('main');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });
});
