import {
  flags,
  SfdxCommand,
  SfdxResult,
  TableOptions
} from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as colors from 'colors';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import bourneImport from '../../bourne/import';
import {
  defaultImportHandlerRef,
  getObjectsToProcess,
  getProjectDataConfig
} from '../../common/dataHelper';
import { FileService, fileServiceRef } from '../../common/FileService';
import requireFunctionRef from '../../common/Require';
import { loadProjectFunction } from '../../common/scriptHelper';
import {
  DataConfig,
  DataService,
  ObjectConfig,
  ObjectSaveResult,
  PostImportObjectResult,
  PostImportResult,
  PreImportObjectResult,
  PreImportResult,
  RecordSaveResult,
  SaveContext,
  SaveOperation
} from '../../types';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-flexi-plugin', 'import');

const objectImportResultTableOptions: TableOptions = {
  columns: [
    { key: 'externalId', label: 'External ID' },
    { key: 'recordId', label: 'ID' },
    { key: 'result', label: 'Status' },
    { key: 'message', label: 'Message' }
  ]
};

export default class ImportCommand extends SfdxCommand implements DataService {
  public get requireFunc(): NodeRequireFunction {
    if (!this.requireFuncInternal) {
      return requireFunctionRef.current;
    }
    return this.requireFuncInternal;
  }
  public set requireFunc(value: NodeRequireFunction) {
    this.requireFuncInternal = value;
  }

  public get fileService(): FileService {
    if (!this.fileServiceInternal) {
      return fileServiceRef.current;
    }
    return this.fileServiceInternal;
  }
  public set fileService(value: FileService) {
    this.fileServiceInternal = value;
  }

  protected get dataConfig(): DataConfig {
    if (!this.dataConfigInternal) {
      this.dataConfigInternal = getProjectDataConfig(
        this.project,
        this.flags,
        this.fileService
      );
    }
    return this.dataConfigInternal;
  }
  protected get objectsToProcess(): ObjectConfig[] {
    if (!this.objectsToProcessInternal) {
      const items = getObjectsToProcess(this.flags, this.dataConfig);
      if (this.flags.remove) {
        items.reverse();
      }
      this.objectsToProcessInternal = items;
    }
    return this.objectsToProcessInternal;
  }

  protected get dataDir(): string {
    const r = this.flags.datadir || 'data';
    return pathUtils.isAbsolute(r)
      ? r
      : pathUtils.join(this.project.getPath(), r);
  }

  get importHandlerKey(): string {
    return (
      this.flags.importhandler || this.dataConfig.importHandler || 'default'
    );
  }
  get importHandler(): SaveOperation {
    if (!this.importHandlerInternal) {
      this.importHandlerInternal = this.resolveImportHandler();
    }
    return this.importHandlerInternal;
  }
  set importHandler(value: SaveOperation) {
    this.importHandlerInternal = value;
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx bourne:import -o Product2 -u myOrg -c config/cpq-cli-def.json
    Deploying data, please wait.... Deployment completed!
    `
  ];

  public static requiresUsername = true;

  public static requiresDevhubUsername = true;

  public static requiresProject = true;

  public static result: SfdxResult = {
    tableColumnData: {
      columns: [
        {
          key: 'sObjectType',
          label: 'SObject Type'
        },
        {
          key: 'path',
          label: 'Path'
        },
        {
          key: 'total',
          label: 'Total'
        },
        {
          key: 'success',
          label: 'Success'
        },
        {
          key: 'failure',
          label: 'Failure'
        }
      ]
    }
  };

  protected static flagsConfig = {
    object: flags.array({
      char: 'o',
      description: messages.getMessage('objectFlagDescription')
    }),
    configfile: flags.string({
      char: 'c',
      description: messages.getMessage('configFileFlagDescription')
    }),
    datadir: flags.string({
      char: 'd',
      description: messages.getMessage('dataDirFlagDescription'),
      default: 'data'
    }),
    remove: flags.boolean({
      char: 'r',
      description: messages.getMessage('removeFlagDescription')
    }),
    allowpartial: flags.boolean({
      char: 'p',
      description: messages.getMessage('allowPartialFlagDescription')
    }),
    importhandler: flags.string({
      char: 'h',
      description: messages.getMessage('importHandlerFlagDescription')
    })
  };
  private requireFuncInternal: NodeRequireFunction;
  private fileServiceInternal: FileService;

  private importHandlers: { [key: string]: SaveOperation } = {
    bourne: bourneImport,
    default(context: SaveContext): Promise<RecordSaveResult[]> {
      return defaultImportHandlerRef.current(context);
    }
  };

  private hookState: { [key: string]: unknown } = {};

  private objectsToProcessInternal: ObjectConfig[];

  private dataConfigInternal: DataConfig;

  private importHandlerInternal: SaveOperation;

  public async getRecords(
    objectNameOrConfig: string | ObjectConfig
  ): Promise<Record[]> {
    const objectConfig: ObjectConfig =
      typeof objectNameOrConfig === 'string'
        ? this.dataConfig.objects[objectNameOrConfig]
        : objectNameOrConfig;
    const records: Record[] = [];
    if (objectConfig) {
      const objectDirPath = this.getObjectPath(objectConfig);
      if (this.fileService.existsSync(objectDirPath)) {
        const files = this.fileService.readdirSync(objectDirPath);
        if (files.length > 0) {
          let recordTypes;
          if (objectConfig.hasRecordTypes) {
            recordTypes = await this.getRecordTypesByDeveloperName(
              objectConfig.sObjectType
            );
          }
          files.forEach(file => {
            const record = this.readRecord(
              pathUtils.join(objectDirPath, file),
              recordTypes
            );
            if (record) {
              records.push(record);
            }
          });
        }
      }
    }
    return records;
  }

  public async saveRecords(
    objectNameOrConfig: string | ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    const objectConfig: ObjectConfig =
      typeof objectNameOrConfig === 'string'
        ? this.dataConfig.objects[objectNameOrConfig]
        : objectNameOrConfig;
    if (!records || records.length === 0) {
      return {
        sObjectType: objectConfig.sObjectType,
        path: this.getObjectPath(objectConfig),
        failure: 0,
        success: 0,
        records: [],
        results: [],
        total: 0
      };
    }

    return this.saveRecordsInternal(objectConfig, records);
  }

  public async run(): Promise<AnyJson> {
    this.ux.log(
      `Importing records from ${
        this.dataDir
      } to org ${this.org.getOrgId()} (${this.org.getUsername()}) using ${colors.green(
        this.importHandlerKey
      )} as the import handler.`
    );

    const objectConfigs = this.objectsToProcess;

    await this.preImport();

    const results: ObjectSaveResult[] = [];

    for (const objectConfig of objectConfigs) {
      results.push(await this.importRecordsForObject(objectConfig));
    }

    await this.postImport(results);

    return results as AnyJson;
  }

  protected async saveRecordsInternal(
    objectConfig: ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
      this.ux.startSpinner(
        `Importing ${colors.green(objectConfig.sObjectType)} records`
      );

      let importResult: ObjectSaveResult;

      if (!this.dataConfig.importRetries || this.dataConfig.importRetries < 0) {
        importResult = await this.saveRecordsAttempt(objectConfig, records);
      } else {
        let retries = 0;
        while (retries < this.dataConfig.importRetries) {
          if (retries > 0) {
            this.ux.log(
              `Retrying ${colors.green(objectConfig.sObjectType)} import...`
            );
          }

          importResult = await this.saveRecordsAttempt(objectConfig, records);

          if (importResult.failure === 0) {
            break;
          }

          retries++;
        }
      }

      this.ux.stopSpinner(
        `${importResult.total} record${
          importResult.total > 1 ? 's' : ''
        } processed`
      );

      if (importResult.failure > 0) {
        this.ux.table(importResult.results, objectImportResultTableOptions);
      }

      if (
        importResult.failure > 0 &&
        !this.dataConfig.allowPartial &&
        !this.flags.allowpartial
      ) {
        throw new SfdxError(
          `Import was unsuccessful after ${this.dataConfig.importRetries} attempts`
        );
      }

      return importResult;
  }

  protected async saveRecordsAttempt(
    objectConfig: ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    const results: RecordSaveResult[] =
      records.length > 0
        ? await this._saveImpl({
            org: this.org,
            ux: this.ux,
            config: this.dataConfig,
            objectConfig,
            operation: this.flags.remove
              ? 'delete'
              : 'upsert',
            records
          })
        : [];

    const failureResults = results.filter(result => result.result === 'FAILED'
    );
    return {
      sObjectType: objectConfig.sObjectType,
      path: this.getObjectPath(objectConfig),
      records,
      results,
      total: results.length,
      failureResults: failureResults.length > 0 ? failureResults : undefined,
      failure: failureResults.length,
      success: results.length - failureResults.length
    };
  }

  protected resolveImportHandler(): SaveOperation {
    const importHandlerKey = this.importHandlerKey;

    let importHandler = this.importHandlers[importHandlerKey];
    if (!importHandler) {
      let modulePath = importHandlerKey;
      if (!pathUtils.isAbsolute(modulePath)) {
        modulePath = pathUtils.join(this.project.getPath(), modulePath);
      }
      if (this.fileService.existsSync(modulePath)) {
        importHandler = loadProjectFunction(
          this.project,
          modulePath,
          this.requireFunc
        );
      }
    }

    if (!importHandler) {
      throw new SfdxError(
        `Unable to resolve ${importHandlerKey} import handler.`
      );
    }

    return importHandler;
  }

  protected async _saveImpl(context: SaveContext): Promise<RecordSaveResult[]> {
    return this.importHandler(context);
  }

  private getObjectPath(objectConfig: ObjectConfig): string {
    return pathUtils.join(
      this.dataDir,
      objectConfig.directory || objectConfig.sObjectType
    );
  }

  private async getRecordTypesByDeveloperName(
    sObject: string
  ): Promise<{ [developerName: string]: Record }> {
    const r = {};
    this.ux.startSpinner('Retrieving Record Type Information');
    const queryResult = await this.org
      .getConnection()
      .query<Record>(
        `SELECT Id, Name, DeveloperName FROM RecordType WHERE sObjectType = '${sObject}'`
      );
    if (queryResult?.records && queryResult.records.length > 0) {
      queryResult.records.forEach(recordType => {
        r[recordType.DeveloperName] = recordType;
      });
    }

    this.ux.stopSpinner('RecordType information retrieved');
    return r;
  }

  private readRecord(
    recordPath: string,
    recordTypes: { [developerName: string]: Record }
  ): Record {
    let record: Record;
    try {
      record = JSON.parse(this.fileService.readFileSync(recordPath));
    } catch (e) {
      this.ux.error(`Cound not load record from file: ${recordPath}`);
    }

    if (record && recordTypes) {
      const recordTypeId = recordTypes?.[record.RecordType?.DeveloperName]?.Id;
      if (recordTypeId) {
        record.RecordTypeId = recordTypeId;
        delete record.RecordType;
      } else if (record.RecordType) {
        this.ux.log(
          'This record does not contain a value for Record Type, skipping transformation.'
        );
      } else {
        throw new SfdxError(
          'Record Type not found for ' + record.RecordType?.DeveloperName
        );
      }
    }

    return record;
  }

  private async preImportObject(objectConfig: ObjectConfig, records: Record[]) {
    const hookResult: PreImportObjectResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      objectConfig,
      records,
      service: this,
      state: this.hookState
    };
    await this.config.runHook('preimportobject', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private async postImportObject(
    objectConfig: ObjectConfig,
    importResult: ObjectSaveResult
  ) {
    const hookResult: PostImportObjectResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      objectConfig,
      importResult,
      service: this,
      state: this.hookState
    };
    await this.config.runHook('postimportobject', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private async importRecordsForObject(
    objectConfig: ObjectConfig
  ): Promise<ObjectSaveResult> {
    const records = await this.getRecords(objectConfig);

    if (!records || records.length === 0) {
      return {
        sObjectType: objectConfig.sObjectType,
        path: this.getObjectPath(objectConfig),
        failure: 0,
        success: 0,
        records: [],
        results: [],
        total: 0
      };
    }

    await this.preImportObject(objectConfig, records);

    const result = await this.saveRecordsInternal(objectConfig, records);

    await this.postImportObject(objectConfig, result);

    return result;
  }

  private async preImport(): Promise<void> {
    const hookResult: PreImportResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      service: this,
      state: this.hookState
    };
    await this.config.runHook('preimport', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private async postImport(results: ObjectSaveResult[]): Promise<void> {
    const hookResult: PostImportResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      service: this,
      state: this.hookState,
      results
    };
    await this.config.runHook('postimport', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }
}
