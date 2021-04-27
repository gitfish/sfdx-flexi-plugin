import { Org, SfdxProject } from '@salesforce/core';
import { EventEmitter } from 'events';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import { defaultConfig } from '../../common/dataHelper';
import { fileServiceRef } from '../../common/FileService';
import { DataConfig, ObjectSaveResult } from '../../types';
import ExportCommand from './export';

class MockQueryEventEmitter extends EventEmitter {
    public runOptions: unknown;
    private records: Record[];
    constructor(records: Record[]) {
        super();
        this.records = records;
    }
    public run(options) {
        this.runOptions = options;
        this.records.forEach(record => {
            this.emit('record', record);
        });
        this.emit('end');
    }
}

jest.mock('resolve', () => {
    return {
        sync(id: string) {
            return id;
        }
    };
});

describe('export test', () => {

    test('export', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const queries: string[] = [];

        const testRecord: Record = {
            Id: 'test-id-1',
            Name: 'Test Account',
            Migration_ID__c: 'TEST'
        };

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue({
            getOrgId() {
                return 'test-org-id';
            },
            getUsername() {
                return 'test@jest.running';
            },
            getConnection() {
                return {
                    query(queryString: string) {
                        queries.push(queryString);
                        return new MockQueryEventEmitter([
                            testRecord
                        ]);
                    }
                };
            }
        });

        Org.create = mockOrgCreate;

        const unlinkPaths: string[] = [];
        const written: { [path: string]: string } = {};
        fileServiceRef.current = {
            existsSync(path: string) {
                console.log('-- Export Exists Sync: ' + path);
                return true;
            },
            readFileSync(path: string) {
                console.log('-- Export Read File: ' + path);
                if (path.endsWith('test.config.json')) {
                    const dataConfig: DataConfig = {
                        objects: [
                            {
                                sObjectType: 'Account',
                                query: 'select Id, Name, Migration_ID__c from Account',
                                directory: 'accounts',
                                externalid: 'Migration_ID__c',
                                filename: 'Migration_ID__c'
                            }
                        ]
                    };
                    return JSON.stringify(dataConfig);
                }
                return null;
            },
            mkdirSync(path: string) {
                console.log('-- Export Make Dir: ' + path);
                // does nothing
            },
            async readdir(path: string) {
                console.log('-- Export Read Dir: ' + path);
                if (path.endsWith('accounts')) {
                    return ['test-account.json'];
                }
                return [];
            },
            readdirSync(path: string) {
                console.log('-- Export Read Dir Sync: ' + path);
                if (path.endsWith('accounts')) {
                    return ['test-account.json'];
                }
                return [];
            },
            async unlink(path: string) {
                console.log('-- Export Unlink Path: ' + path);
                unlinkPaths.push(path);
            },
            async writeFile(path: string, content: string) {
                console.log('-- Export Write File: ' + path);
                written[path] = content;
            }
        };

        const result: ObjectSaveResult[] = await ExportCommand.run(['--configfile', 'test.config.json', '--targetusername', 'woo@test.com']);

        expect(queries.length).toBe(1);
        expect(queries[0]).toBe('select Id, Name, Migration_ID__c from Account');

        expect(unlinkPaths.length).toBe(1);
        expect(unlinkPaths[0]).toBe(pathUtils.join(projectPath, defaultConfig.dataDir, 'accounts', 'test-account.json'));

        expect(Object.keys(written).length).toBe(1);
        expect(written[pathUtils.join(projectPath, defaultConfig.dataDir, 'accounts', 'TEST.json')]).toBe(JSON.stringify(testRecord, undefined, 2));

        expect(result.length).toBe(1);
    });
});
