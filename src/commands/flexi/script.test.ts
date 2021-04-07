import { Org, SfdxProject } from '@salesforce/core';
import { ScriptContext } from '../../types';
import { ScriptCommand } from './script';

describe('flexi:script', () => {

    test('basic', async () => {
        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return 'test-project';
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue({});

        Org.create = mockOrgCreate;

        ScriptCommand.fileExistsCheck = (path: string) => true;

        let calledModulePath: string;
        let calledResolveBaseDir: string;
        let runContext: ScriptContext;
        ScriptCommand.loadModule = (modulePath: string, resolveBaseDir: string) => {
            calledModulePath = modulePath;
            calledResolveBaseDir = resolveBaseDir;
            return (context: ScriptContext) => {
                runContext = context;
            };
        };

        await ScriptCommand.run(['--path', 'test.ts', '--targetusername', 'woo@test.com']);

        expect(calledModulePath).toBeTruthy();
        expect(calledResolveBaseDir).toBeTruthy();
        expect(runContext).toBeTruthy();
    });
});
