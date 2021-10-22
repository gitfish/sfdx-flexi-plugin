import * as pathUtils from 'path';
import { JsonMap } from '@salesforce/ts-types';
import { Org, SfdxProject } from '@salesforce/core';
import { FileServiceRef } from '../common/fs';
import { HookType, SfdxHookContext } from '../types';
import { RequireFunctionRef } from '../common/require';
import { SOURCE_DEPLOY_COMMAND_ID, SOURCE_PUSH_COMMAND_ID } from './constants';
import { JS_HOOKS_MODULE } from './common';

const throwInvalidCall = async () => {
    throw new Error('Invalid Call');
};

describe('post deploy hook', () => {

    const projectPath = `${pathUtils.sep}test-project`;

    const readFilePaths: string[] = [];

    let requiredId: string;
    let runContext: SfdxHookContext<{ [key: string]: string }>;
    let tsNodeRegisterOpts;
    let hook;

    beforeAll(async () => {

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
        hook = (await import('./postdeploy')).hook;
    });
    
    test('post push', async () => {

        const postDeployResult = {
            id: 'test-push-id'
        };

        await Promise.resolve(
            hook.call(
                {},
                {
                    Command: null,
                    commandId: SOURCE_PUSH_COMMAND_ID,
                    argv: [],
                    result: postDeployResult
                }
            )
        );

        expect(requiredId).toBe(
            pathUtils.join(
                projectPath,
                JS_HOOKS_MODULE
            )
        );
        expect(runContext).toBeTruthy();
        expect(runContext.commandId).toBe(SOURCE_PUSH_COMMAND_ID);
        expect(runContext.type).toBe(HookType.postpush);
        expect(runContext.result).toBeTruthy();
        expect(runContext.result.id).toBe('test-push-id')
        expect(tsNodeRegisterOpts).toBeFalsy(); // in this case, the js file is found, so no need to load ts

        expect(readFilePaths.length).toBe(0);
    });

    test('post deploy', async () => {
        const postDeployResult = {
            id: 'test-deploy-id'
        };

        await Promise.resolve(
            hook.call(
                {},
                {
                    Command: null,
                    commandId: SOURCE_DEPLOY_COMMAND_ID,
                    argv: [],
                    result: postDeployResult
                }
            )
        );

        expect(requiredId).toBe(
            pathUtils.join(
                projectPath,
                JS_HOOKS_MODULE
            )
        );
        expect(runContext).toBeTruthy();
        expect(runContext.commandId).toBe(SOURCE_DEPLOY_COMMAND_ID);
        expect(runContext.type).toBe(HookType.postdeploy);
        expect(runContext.result).toBeTruthy();
        expect(runContext.result.id).toBe('test-deploy-id')
        expect(tsNodeRegisterOpts).toBeFalsy(); // in this case, the js file is found, so no need to load ts

        expect(readFilePaths.length).toBe(0);
    });
});
