import {
  flags,
  SfdxCommand,
  SfdxResult,
  TableOptions
} from '@salesforce/command';
import { Messages, SfdxError, SfdxProject } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as colors from 'colors';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import bourneImport from '../../bourne/import';
import {
  defaultConfig,
  defaultImportHandlerRef,
  getDataConfig,
  getObjectsToProcess
} from '../../common/dataHelper';
import { FileService, fileServiceRef } from '../../common/FileService';
import requireFunctionRef, { RequireFunc } from '../../common/Require';
import { getModuleFunction } from '../../common/scriptHelper';
import {
  DataConfig,
  DataService,
  ObjectConfig,
  ObjectSaveResult,
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
    { key: 'success', label: 'Success' },
    { key: 'message', label: 'Message' }
  ]
};

export default class ImportCommand extends SfdxCommand implements DataService {
  /**
   * The require function to use for hooks
   */
  public get requireFunc(): RequireFunc {
    if (!this.requireFuncInternal) {
      return requireFunctionRef.current;
    }
    return this.requireFuncInternal;
  }
  public set requireFunc(value: RequireFunc) {
    this.requireFuncInternal = value;
  }

  /**
   * The file service to use
   */
  public get fileService(): FileService {
    if (!this.fileServiceInternal) {
      return fileServiceRef.current;
    }
    return this.fileServiceInternal;
  }
  public set fileService(value: FileService) {
    this.fileServiceInternal = value;
  }

  /**
   * Get the data configuration
   */
  protected get dataConfig(): DataConfig {
    if (!this.dataConfigInternal) {
      this.dataConfigInternal = getDataConfig(
        this.basePath,
        this.flags,
        this.fileService
      );
    }
    return this.dataConfigInternal;
  }

  /**
   * Get objects (i.e. sobjects) to process
   */
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

  /**
   * Get the data directory - i.e. the directory containing the json files representing records
   */
  protected get dataDir(): string {
    const r = this.flags.datadir || defaultConfig.dataDir;
    return pathUtils.isAbsolute(r) ? r : pathUtils.join(this.basePath, r);
  }

  /**
   * Get the import handler key used as a default for the import operation
   */
  get importHandlerKey(): string {
    return (
      this.flags.importhandler || this.dataConfig.importHandler || 'default'
    );
  }

  /**
   * Get a base path based on whether we're in a project or not
   */
  get basePath(): string {
    return this.project ? this.project.getPath() : process.cwd();
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx flexi:import -o Product2 -u myOrg -c config/cpq-cli-def.json
    Deploying data, please wait.... Deployment completed!
    `
  ];

  public static requiresUsername = true;

  public static supportsDevhubUsername = false;

  // NOTE: whilst we require project here, we've overridden the assignProject so that the project will be null if we're not inside a project
  public static requiresProject = true;

  public static varargs = true;

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
      description: messages.getMessage('configFileFlagDescription'),
      required: true
    }),
    datadir: flags.string({
      char: 'd',
      description: messages.getMessage('dataDirFlagDescription'),
      default: defaultConfig.dataDir
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
  private requireFuncInternal: RequireFunc;
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

  /**
   * Get records to process for the object
   * @param objectNameOrConfig
   * @returns
   */
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

  /**
   * Save records for the object
   * @param objectNameOrConfig
   * @param records
   * @returns
   */
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
      `${this.flags.remove ? 'Deleting' : 'Importing'} records from ${this.dataDir
      } to org ${this.org.getOrgId()} as user ${this.org.getUsername()}`
    );

    const objectConfigs = this.objectsToProcess;

    await this.preImport();

    const results: ObjectSaveResult[] = [];

    for (const objectConfig of objectConfigs) {
      const objectResult = await this.importRecordsForObject(objectConfig);
      if (objectResult) {
        results.push(objectResult);
      }
    }

    //await this.postImport(results); disabled - encountering an inexplicable issue at

    return <AnyJson>(<unknown>results);
  }

  protected async saveRecordsInternal(
    objectConfig: ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    this.ux.startSpinner(
      `${this.flags.remove ? 'Deleting' : 'Importing'} ${colors.green(
        objectConfig.sObjectType
      )} records using the ${colors.yellow(this.getImportHandlerKey(objectConfig))} handler`
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
      `${importResult.total} record${importResult.total > 1 ? 's' : ''} ${this.flags.remove ? 'deleted' : 'saved'
      }`
    );

    if (importResult.failure > 0) {
      this.ux.table(importResult.results, objectImportResultTableOptions);
    }

    if (
      importResult.failure > 0 &&
      !this.dataConfig.allowPartial &&
      !this.flags.allowpartial
    ) {
      // TODO: support import error hook

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
        ? await this.saveImpl({
          org: this.org,
          ux: this.ux,
          config: this.dataConfig,
          objectConfig,
          isDelete: this.flags.remove,
          records
        })
        : [];

    const failureResults = results.filter(result => !result.success);
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

  protected getImportHandlerKey(objectConfig: ObjectConfig): string {
    return objectConfig.importHandler || this.importHandlerKey;
  }

  protected resolveImportHandler(importHandlerKey: string): SaveOperation {
    let importHandler = this.importHandlers[importHandlerKey];
    if (!importHandler) {
      let modulePath = importHandlerKey;
      if (!pathUtils.isAbsolute(modulePath)) {
        modulePath = pathUtils.join(this.basePath, modulePath);
      }
      if (this.fileService.existsSync(modulePath)) {
        importHandler = getModuleFunction(modulePath, {
          resolvePath: this.basePath,
          requireFunc: this.requireFunc
        });
      }
    }

    if (!importHandler) {
      throw new SfdxError(
        `Unable to resolve ${importHandlerKey} import handler.`
      );
    }

    return importHandler;
  }

  protected async saveImpl(context: SaveContext): Promise<RecordSaveResult[]> {
    return this.resolveImportHandler(
      this.getImportHandlerKey(context.objectConfig)
    )(context);
  }

  protected async assignProject(): Promise<void> {
    // Throw an error if the command requires to be run from within an SFDX project but we
    // don't have a local config.
    try {
      this.project = await SfdxProject.resolve();
    } catch (err) {
      if (err.name === 'InvalidProjectWorkspace') {
        this.ux.warn('The command is not running within a project context');
      } else {
        throw err;
      }
    }
  }

  protected async runHook(name: string, opts?: { [key: string]: unknown }): Promise<void> {
    await this.config.runHook(name, {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: {
        config: this.dataConfig,
        scope: this.objectsToProcess,
        isDelete: this.flags.remove,
        service: this,
        state: this.hookState,
        ...opts
      }
    });
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
    await this.runHook('preimportobject', {
      objectConfig,
      records
    });
  }

  private async postImportObject(
    objectConfig: ObjectConfig,
    records: Record[],
    importResult: ObjectSaveResult
  ) {
    await this.runHook('postimportobject', {
      objectConfig,
      records,
      importResult
    });
  }

  private async importRecordsForObject(
    objectConfig: ObjectConfig
  ): Promise<ObjectSaveResult> {
    const records = await this.getRecords(objectConfig);

    if (!records || records.length === 0) {
      return;
    }

    await this.preImportObject(objectConfig, records);

    const result = await this.saveRecordsInternal(objectConfig, records);

    await this.postImportObject(objectConfig, records, result);

    return result;
  }

  private async preImport(): Promise<void> {
    await this.runHook('preimport');
  }

  /* Disabled for now
  private async postImport(results: ObjectSaveResult[]): Promise<void> {
    await this.runHook('postimport', {
      results
    });
  }
  */
}
