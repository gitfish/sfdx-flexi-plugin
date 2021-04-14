import {
  flags,
  SfdxCommand,
  SfdxResult,
  TableOptions
} from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as colors from 'colors';
import * as fs from 'fs';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import { getDataConfig, getObjectsToProcess } from '../../common/dataHelper';
import {
  Config,
  DataService,
  ImportRequest,
  ObjectConfig,
  ObjectSaveResult,
  RecordSaveResult
} from '../../types';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-flexi-plugin', 'import');

const objectImportResultTableOptions: TableOptions = {
  columns: [
    { key: 'recordId', label: 'ID' },
    { key: 'externalId', label: 'External ID' },
    { key: 'result', label: 'Status' },
    { key: 'message', label: 'Message' }
  ]
};

export default class Import extends SfdxCommand implements DataService {
  protected get dataConfig(): Config {
    if (!this._dataConfig) {
      this._dataConfig = getDataConfig(this.flags);
    }
    return this._dataConfig;
  }

  protected get objectsToProcess(): ObjectConfig[] {
    const sObjects = getObjectsToProcess(this.flags, this.dataConfig);
    return this.flags.remove ? sObjects.reverse() : sObjects;
  }

  protected get dataDir(): string {
    const r = this.flags.datadir || 'data';
    return pathUtils.isAbsolute(r)
      ? r
      : pathUtils.join(this.project.getPath(), r);
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
    })
  };

  private static splitInHalf(records: Record[]): Record[][] {
    const halfSize = Math.floor(records.length / 2);
    const splitRecords = [];
    splitRecords.push(records.slice(0, halfSize));
    splitRecords.push(records.slice(halfSize));
    return splitRecords;
  }

  private _dataConfig: Config;

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
      if (fs.existsSync(objectDirPath)) {
        const files = fs.readdirSync(objectDirPath);
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

    this.ux.startSpinner(
      `Importing ${colors.blue(objectConfig.sObjectType)} records`
    );

    let retries = 0;
    let importResult: ObjectSaveResult;

    while (retries < this.dataConfig.importRetries) {
      if (retries > 0) {
        this.ux.log(
          `Retrying ${colors.blue(objectConfig.sObjectType)} import...`
        );
      }

      importResult = await this.saveRecords(objectConfig, records);

      if (importResult.failure === 0) {
        break;
      }

      retries++;
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

    this.ux.stopSpinner(`${importResult.total} records processed`);

    this.ux.table(importResult.results, objectImportResultTableOptions);

    return importResult;
  }

  public async run(): Promise<AnyJson> {
    const objectConfigs = this.objectsToProcess;
    /*
    this.context = {
      command: {
        args: this.args,
        configAggregator: this.configAggregator,
        flags: this.flags,
        logger: this.logger,
        ux: this.ux,
        hubOrg: this.hubOrg,
        org: this.org,
        project: this.project,
        varargs: this.varargs,
        result: this.result,
      },
      config: this.dataConfig,
      objectConfigs,
      service: this,
      state: {},
    };
    */

    await this.preImport();

    const results: ObjectSaveResult[] = [];

    for (const objectConfig of objectConfigs) {
      results.push(await this.importRecordsForObject(objectConfig));
    }

    await this.postImport(results);

    return results as AnyJson;
  }

  protected async saveRecordsAttempt(
    objectConfig: ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    const results: RecordSaveResult[] = [];
    if (records.length > 0) {
      const resultsHandler = (items: RecordSaveResult[]) => {
        if (items) {
          items.forEach(item => results.push(item));
        }
      };
      const requests: ImportRequest[] = [];
      this.buildRequests(records, objectConfig, requests);
      if (objectConfig.enableMultiThreading) {
        const promises = requests.map(this._requestHandler);
        const promiseResults: RecordSaveResult[][] = await Promise.all(
          promises
        );
        promiseResults.forEach(resultsHandler);
      } else {
        for (const request of requests) {
          resultsHandler(await this._requestHandler(request));
        }
      }
    }
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
      record = JSON.parse(fs.readFileSync(recordPath, { encoding: 'utf8' }));
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
          'Record Type not found for ' + record.RecordType.DeveloperName
        );
      }
    }

    return record;
  }

  private buildRequests(
    records: Record[],
    objectConfig: ObjectConfig,
    payloads: ImportRequest[]
  ) {
    const payload = JSON.stringify(records, null, 0);
    if (payload.length > this.dataConfig.payloadLength) {
      const splitRecords = Import.splitInHalf(records);
      this.buildRequests(splitRecords[0], objectConfig, payloads);
      this.buildRequests(splitRecords[1], objectConfig, payloads);
    } else {
      payloads.push({
        extIdField: objectConfig.externalid,
        operation: this.flags.remove ? 'delete' : 'upsert',
        payload: records,
        sObjectType: objectConfig.sObjectType
      });
    }
  }

  private _requestHandler = async (
    request: ImportRequest
  ): Promise<RecordSaveResult[]> => {
    const restUrl = this.dataConfig.useManagedPackage
      ? '/JSON/bourne/v1'
      : '/bourne/v1';
    try {
      return JSON.parse(
        await this.org.getConnection().apex.post<string>(restUrl, request)
      );
    } catch (error) {
      this.ux.log(error);
      throw error;
    }
  };

  private async preImportObject(objectConfig: ObjectConfig, records: Record[]) {
    await this.config.runHook('preimportobject', {});
  }

  private async postImportObject(
    objectConfig: ObjectConfig,
    importResult: ObjectSaveResult
  ) {
    await this.config.runHook('postimportobject', {});
    /*
    const scriptPath = this.dataConfig?.script?.postimportobject;
    if (scriptPath) {
      const context: PostImportObjectContext = {
        ...this.context,
        objectConfig,
        records,
        importResult,
      };

      await runScript<PostImportObjectContext>(scriptPath, context, {
        tsResolveBaseDir: this.dataConfig.script.tsResolveBaseDir,
      });
    }
    */
  }

  private async importRecordsForObject(
    objectConfig: ObjectConfig
  ): Promise<ObjectSaveResult> {
    const records = await this.getRecords(objectConfig);

    await this.preImportObject(objectConfig, records);

    const result = await this.saveRecords(objectConfig, await this.getRecords(objectConfig));

    await this.postImportObject(objectConfig, result);

    return result;
  }

  private async preImport(): Promise<void> {
    await this.config.runHook('preimport', {});
    /*
    const scriptPath = this.dataConfig?.script?.preimport;
    if (scriptPath) {
      await runScript<PreImportResult>(scriptPath, this.context, {
        tsResolveBaseDir: this.dataConfig.script.tsResolveBaseDir,
      });
    }
    */
  }

  private async postImport(results: ObjectSaveResult[]): Promise<void> {
    await this.config.runHook('postimport', {});
    /*
    const scriptPath = this.dataConfig?.script?.postimport;
    if (scriptPath) {
      const context: PostImportContext = { ...this.context, results };
      await runScript<PostImportContext>(scriptPath, context, {
        tsResolveBaseDir: this.dataConfig.script.tsResolveBaseDir,
      });
    }
    */
  }
}
