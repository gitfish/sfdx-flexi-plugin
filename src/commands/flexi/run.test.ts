import { Org, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { FileServiceRef } from '../../common/fs';
import { tsConfigDefault } from '../../common/module';
import { RequireFunctionRef, ResolveFunctionRef, ResolveOptions } from '../../common/require';
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

    test('js module func', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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

        let resolveId: string;
        let resolveOpts: ResolveOptions;
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

        ResolveFunctionRef.current = (id: string, opts?: ResolveOptions): string => {
            resolveId = id;
            resolveOpts = opts;
            return id;
        };

        await RunCommand.run(['--path', 'test.js', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(resolveId).toBe('test.js');
        expect(resolveOpts).toBeTruthy();
        expect(resolveOpts.paths.length).toBe(1);
        expect(resolveOpts.paths[0]).toBe(runContext.project.getPath());
        expect(requiredId).toBe('test.js');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.js');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('js module func org error proxy', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue(null);

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

        let resolveId: string;
        let resolveOpts: ResolveOptions;
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

        ResolveFunctionRef.current = (id: string, opts?: ResolveOptions): string => {
            resolveId = id;
            resolveOpts = opts;
            return id;
        };

        await RunCommand.run(['--path', 'test.js', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(resolveId).toBe('test.js');
        expect(resolveOpts).toBeTruthy();
        expect(resolveOpts.paths.length).toBe(1);
        expect(resolveOpts.paths[0]).toBe(runContext.project.getPath());
        expect(requiredId).toBe('test.js');
        expect(runContext).toBeTruthy();
        expect(runContext.org).toBeTruthy();

        // invoking anything on the org proxy should throw an error
        let orgError;
        try {
            runContext.org.getOrgId();
        } catch(err) {
            orgError = err;
        }
        expect(orgError).toBeTruthy();
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.js');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('js module func from node', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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

        let resolveId: string;
        let resolveOpts: ResolveOptions;
        let requiredId: string;
        let runContext: SfdxRunContext;
        let tsNodeRegisterOpts;

        RequireFunctionRef.current = (id: string) => {
            if (id === '/path/to/ts-node') {
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

        ResolveFunctionRef.current = (id: string, opts?: ResolveOptions): string => {
            if(id !== 'ts-node') {
                resolveId = id;
                resolveOpts = opts;
            }
            return `/path/to/${id}`;
        };

        await RunCommand.run(['--path', 'some/node/module/test', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(resolveId).toBe('some/node/module/test');
        expect(resolveOpts).toBeTruthy();
        expect(resolveOpts.paths.length).toBe(1);
        expect(resolveOpts.paths[0]).toBe(runContext.project.getPath());
        expect(requiredId).toBe('/path/to/some/node/module/test');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('some/node/module/test');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('js module func with export', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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

        let resolveId: string;
        let resolveOpts: ResolveOptions;
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

        ResolveFunctionRef.current = (id: string, opts?: ResolveOptions): string => {
            resolveId = id;
            resolveOpts = opts;
            return id;
        };

        await RunCommand.run(['--path', 'test.js', '--export', 'main', '--targetusername', 'woo@test.com']);

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(resolveId).toBe('test.js');
        expect(resolveOpts).toBeTruthy();
        expect(resolveOpts.paths.length).toBe(1);
        expect(resolveOpts.paths[0]).toBe(runContext.project.getPath());
        expect(requiredId).toBe('test.js');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.js');
        expect(runContext.flags.export).toBe('main');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('js module func not found', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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

        ResolveFunctionRef.current = (id: string): string => {
            return id;
        };

        RequireFunctionRef.current = () => {
            return {
                run: () => {
                    // empty - we're testing errors here
                }
            };
        };

        // should get an error in this case

        let cmdError = false;
        process.once('cmdError', () => {
            cmdError = true;
        });

        await RunCommand.run(['--path', 'test.js', '--export', 'main', '--targetusername', 'woo@test.com']);
        
        expect(cmdError).toBeTruthy();
        expect(process.exitCode).toBeGreaterThan(0);
    });

    test('ts module func', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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
        expect(requiredId).toBe('test.ts');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('ts module func with export', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {};
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
        expect(tsNodeRegisterOpts.compilerOptions).toEqual(tsConfigDefault.compilerOptions);
        expect(requiredId).toBe('test.ts');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.export).toBe('main');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });

    test('ts module func with custom ts config', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const tsConfig = {
            compilerOptions: {
                module: 'commonjs'
            }
        };

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            },
            resolveProjectConfig: async () => {
                return {
                    plugins: {
                        flexi: {
                            tsConfig
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
        // the custom config should be merged into the default config
        expect(tsNodeRegisterOpts.compilerOptions).toEqual({...tsConfigDefault.compilerOptions, ...tsConfig.compilerOptions });
        expect(requiredId).toBe('test.ts');
        expect(runContext).toBeTruthy();
        expect(runContext.org.getOrgId()).toBe('test-org-id');
        expect(runContext.project.getPath()).toBe(projectPath);
        expect(runContext.flags.path).toBe('test.ts');
        expect(runContext.flags.targetusername).toBe('woo@test.com');
    });
});
