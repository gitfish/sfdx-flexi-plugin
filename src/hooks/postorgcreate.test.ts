import * as pathUtils from 'path';
import { JsonMap } from '@salesforce/ts-types';
import { ConfigAggregator, Org, SfdxProject } from '@salesforce/core';
import { FileServiceRef } from '../common/fs';
import { HookType, PostOrgCreateResult, SfdxHookContext } from '../types';
import { RequireFunctionRef } from '../common/require';
import { JS_HOOKS_MODULE } from './common';

const throwInvalidCall = async () => {
    throw new Error('Invalid Call');
};

describe('post org create hook', () => {


    test('post org create', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const readFilePaths: string[] = [];

        let requiredId: string;
        let runContext: SfdxHookContext<{ [key: string]: string }>;
        let tsNodeRegisterOpts;

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
                    ]
                };
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const mockAggCreate = jest.fn();
        mockAggCreate.mockResolvedValue({});
        ConfigAggregator.create = mockAggCreate;

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue({
            getOrgId() {
                return 'test-org-id';
            }
        });

        Org.create = mockOrgCreate;

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

        RequireFunctionRef.current = (id: string) => {
            if (id === 'ts-node') {
                return {
                    register(opts) {
                        tsNodeRegisterOpts = opts;
                    }
                };
            }
            requiredId = id;
            return (context: SfdxHookContext<{ [key: string]: string }>) => {
                runContext = context;
            };
        };

        // dynamically import our hook - has to be done this way so we can setup the fs stuff etc above
        const hook = (await import('./postorgcreate')).hook;

        const preDeployResult: Partial<PostOrgCreateResult> = {
            devHubUsername: 'test-hub-user',
            username: 'test-user'
        };

        await Promise.resolve(
            hook.call(
                {},
                {
                    Command: null,
                    commandId: 'force:org:create',
                    argv: [],
                    result: preDeployResult
                }
            )
        );

        expect(requiredId).toBe(
            pathUtils.join(
                projectPath,
                JS_HOOKS_MODULE
            )
        );

        expect(tsNodeRegisterOpts).toBeFalsy();
        expect(runContext).toBeTruthy();
        expect(runContext.commandId).toBe('force:org:create');
        expect(runContext.type).toBe(HookType.postorgcreate);
        expect(runContext.result).toBeTruthy();
        expect(runContext.result.devHubUsername).toBe('test-hub-user');
        expect(runContext.result.username).toBe('test-user');
                
        // check that org create has been called a couple of times for the org and dev hub org
        expect(mockOrgCreate.mock.calls.length).toBe(2);
    });
});