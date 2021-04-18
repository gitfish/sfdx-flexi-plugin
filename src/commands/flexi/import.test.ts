import { Org, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'path';
import { bourneDefaults, BourneImportRequest } from '../../bourne/import';
import { defaultImportHandlerRef } from '../../common/dataHelper';
import { fileServiceRef } from '../../common/FileService';
import { DataConfig, ObjectSaveResult, RecordSaveResult, SaveContext } from '../../types';
import ImportCommand from './import';

jest.mock('resolve', () => {
    return {
        sync(id: string) {
            return id;
        }
    };
});

describe('import test', () => {

    test('import', async () => {
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
            },
            getUsername() {
                return 'test@jest.running';
            }
        });

        Org.create = mockOrgCreate;

        fileServiceRef.current = {
            existsSync(path: string) {
                console.log('-- Import Exists Sync: ' + path);
                return true;
            },
            readFileSync(path: string) {
                console.log('-- Import Read File: ' + path);
                if (path.endsWith('test.config.json')) {
                    const dataConfig: DataConfig = {
                        objects: [
                            {
                                sObjectType: 'Account',
                                query: 'select Id, Migration_ID__c from Account',
                                directory: 'accounts',
                                externalid: 'Migration_ID__c',
                                filename: 'Migration_ID__c'
                            }
                        ]
                    };
                    return JSON.stringify(dataConfig);
                }
                if (path.endsWith('test-account.json')) {
                    return JSON.stringify({
                        Name: 'Test Account',
                        Migration_ID__c: 'TEST'
                    });
                }

                return null;
            },
            mkdirSync() {
                throw new Error('Illegal Call');
            },
            async readdir() {
                throw new Error('Illegal Call');
            },
            readdirSync(path: string) {
                console.log('-- Import Read Dir: ' + path);
                if (path.endsWith('accounts')) {
                    return [
                        'test-account.json'
                    ];
                }
                return [];
            },
            async unlink() {
                throw new Error('Illegal Call');
            },
            async writeFile() {
                throw new Error('Illegal Call');
            }
        };

        defaultImportHandlerRef.current = async (context: SaveContext): Promise<RecordSaveResult[]> => {
            return [
                {
                    externalId: 'TEST',
                    recordId: 'test-id-1',
                    result: 'SUCCESS'
                }
            ];
        };

        const result: ObjectSaveResult[] = await ImportCommand.run(['--configfile', 'test.config.json', '--targetusername', 'woo@test.com']);

        expect(result.length).toBe(1);

        expect(result[0].records.length).toBe(1);
        expect(result[0].results.length).toBe(1);
        expect(result[0].results[0].recordId).toBe('test-id-1');
        expect(result[0].total).toBe(1);
        expect(result[0].sObjectType).toBe('Account');
    });

    test('bourne import', async () => {
        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const bourneRequests: { [path: string]: BourneImportRequest } = {};

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
                    apex: {
                        async post(path: string, request: BourneImportRequest) {
                            bourneRequests[path] = request;
                            const results: RecordSaveResult[] = [{
                                externalId: 'TEST',
                                result: 'SUCCESS',
                                recordId: 'test-id-1'
                            }];
                            return JSON.stringify(results);
                        }
                    }
                };
            }
        });

        Org.create = mockOrgCreate;

        fileServiceRef.current = {
            existsSync(path: string) {
                console.log('-- Import Exists Sync: ' + path);
                return true;
            },
            readFileSync(path: string) {
                console.log('-- Import Read File: ' + path);
                if (path.endsWith('test.config.json')) {
                    const dataConfig: DataConfig = {
                        objects: [
                            {
                                sObjectType: 'Account',
                                query: 'select Id, Migration_ID__c from Account',
                                directory: 'accounts',
                                externalid: 'Migration_ID__c',
                                filename: 'Migration_ID__c'
                            }
                        ]
                    };
                    return JSON.stringify(dataConfig);
                }
                if (path.endsWith('test-account.json')) {
                    return JSON.stringify({
                        Name: 'Test Account',
                        Migration_ID__c: 'TEST'
                    });
                }

                return null;
            },
            mkdirSync() {
                throw new Error('Illegal Call');
            },
            async readdir() {
                throw new Error('Illegal Call');
            },
            readdirSync(path: string) {
                console.log('-- Import Read Dir: ' + path);
                if (path.endsWith('accounts')) {
                    return [
                        'test-account.json'
                    ];
                }
                return [];
            },
            async unlink() {
                throw new Error('Illegal Call');
            },
            async writeFile() {
                throw new Error('Illegal Call');
            }
        };

        const result: ObjectSaveResult[] = await ImportCommand.run(['--configfile', 'test.config.json', '--targetusername', 'woo@test.com', '--importhandler', 'bourne']);

        expect(result.length).toBe(1);

        expect(result[0].records.length).toBe(1);
        expect(result[0].results.length).toBe(1);
        expect(result[0].results[0].recordId).toBe('test-id-1');
        expect(result[0].total).toBe(1);
        expect(result[0].sObjectType).toBe('Account');

        expect(Object.keys(bourneRequests).length).toBe(1);
        expect(Object.keys(bourneRequests)[0]).toBe(bourneDefaults.restPath);
    });

    test('standard import', async () => {
        defaultImportHandlerRef.current = null;

        const projectPath = `${pathUtils.sep}test-project`;

        const mockResolveProject = jest.fn();
        mockResolveProject.mockResolvedValue({
            getPath() {
                return projectPath;
            }
        });

        SfdxProject.resolve = mockResolveProject;

        const types: string[] = [];

        const mockOrgCreate = jest.fn();
        mockOrgCreate.mockResolvedValue({
            getOrgId() {
                return 'test-org-id';
            },
            getUsername() {
                return 'test@jest.running';
            },
            getConnection() {
                console.log('-- Standard Import get connection');
                return {
                    sobject(type: string) {
                        console.log('-- Standard Import: ' + type);
                        types.push(type);
                        return {
                            async upsert(records, externalId, opts) {
                                return [{
                                    id: 'test-id-1',
                                    success: true
                                }];
                            }
                        };
                    }
                };
            }
        });

        Org.create = mockOrgCreate;

        fileServiceRef.current = {
            existsSync(path: string) {
                console.log('-- Import Exists Sync: ' + path);
                return true;
            },
            readFileSync(path: string) {
                console.log('-- Import Read File: ' + path);
                if (path.endsWith('test.config.json')) {
                    const dataConfig: DataConfig = {
                        objects: [
                            {
                                sObjectType: 'Account',
                                query: 'select Id, Migration_ID__c from Account',
                                directory: 'accounts',
                                externalid: 'Migration_ID__c',
                                filename: 'Migration_ID__c'
                            }
                        ]
                    };
                    return JSON.stringify(dataConfig);
                }
                if (path.endsWith('test-account.json')) {
                    return JSON.stringify({
                        Name: 'Test Account',
                        Migration_ID__c: 'TEST'
                    });
                }

                return null;
            },
            mkdirSync() {
                throw new Error('Illegal Call');
            },
            async readdir() {
                throw new Error('Illegal Call');
            },
            readdirSync(path: string) {
                console.log('-- Import Read Dir: ' + path);
                if (path.endsWith('accounts')) {
                    return [
                        'test-account.json'
                    ];
                }
                return [];
            },
            async unlink() {
                throw new Error('Illegal Call');
            },
            async writeFile() {
                throw new Error('Illegal Call');
            }
        };

        const result: ObjectSaveResult[] = await ImportCommand.run(['--configfile', 'test.config.json', '--targetusername', 'woo@test.com']);

        expect(result.length).toBe(1);

        expect(result[0].records.length).toBe(1);
        expect(result[0].results.length).toBe(1);
        expect(result[0].results[0].recordId).toBe('test-id-1');
        expect(result[0].total).toBe(1);
        expect(result[0].sObjectType).toBe('Account');
    });

    test('empty import', async () => {
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
            },
            getUsername() {
                return 'test@jest.running';
            }
        });

        Org.create = mockOrgCreate;

        fileServiceRef.current = {
            existsSync(path: string) {
                console.log('-- Import Exists Sync: ' + path);
                return true;
            },
            readFileSync(path: string) {
                console.log('-- Import Read File: ' + path);
                if (path.endsWith('test.config.json')) {
                    const dataConfig: DataConfig = {
                        objects: [
                            {
                                sObjectType: 'Account',
                                query: 'select Id, Migration_ID__c from Account',
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
            mkdirSync() {
                throw new Error('Illegal Call');
            },
            async readdir() {
                throw new Error('Illegal Call');
            },
            readdirSync(path: string) {
                console.log('-- Import Read Dir: ' + path);
                if (path.endsWith('accounts')) {
                    return [];
                }
                return [];
            },
            async unlink() {
                throw new Error('Illegal Call');
            },
            async writeFile() {
                throw new Error('Illegal Call');
            }
        };

        const result: ObjectSaveResult[] = await ImportCommand.run(['--configfile', 'test.config.json', '--targetusername', 'woo@test.com']);

        expect(result.length).toBe(1);

        expect(result[0].records.length).toBe(0);
        expect(result[0].results.length).toBe(0);
    });
});
