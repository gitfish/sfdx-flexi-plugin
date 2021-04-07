/*
import { ConfigContents, Org, SfdxProject, SfdxProjectJson } from "@salesforce/core";
import { ScriptCommand } from "../commands/flexi/script";
import { HookType, ScriptContext } from "../types";
import { createScriptDelegate } from "./common";
*/

describe('Hook Common', () => {

    test('hook delegate default', () => {
        /*
        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return 'test-project';
            },
            async retrieveSfdxProjectJson(): Promise<SfdxProjectJson> {
                return {
                    read(): Promise<ConfigContents> {
                        return {};
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

        const predeploy = createScriptDelegate(HookType.predeploy);
        */
    });
});
