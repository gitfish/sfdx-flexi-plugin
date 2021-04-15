import { flags, SfdxCommand, SfdxResult } from '@salesforce/command';
import { Messages, SfdxError } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as colors from 'colors';
import * as fs from 'fs';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import {
  getDataConfig,
  getObjectsToProcess,
  removeField
} from '../../common/dataHelper';
import {
  Config,
  DataService,
  ObjectConfig,
  ObjectSaveResult,
  PostExportObjectResult,
  PostExportResult,
  PreExportObjectResult,
  PreExportResult
} from '../../types';

const fsp = fs.promises;

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-flexi-plugin', 'export');

export default class Export extends SfdxCommand implements DataService {
  protected get dataConfig(): Config {
    if (!this._dataConfig) {
      this._dataConfig = getDataConfig(this.flags);
    }
    return this._dataConfig;
  }
  protected get objectsToProcess(): ObjectConfig[] {
    if (!this._objectsToProcess) {
      this._objectsToProcess = getObjectsToProcess(this.flags, this.dataConfig);
    }
    return this._objectsToProcess;
  }

  protected get dataDir(): string {
    const r = this.flags.datadir || 'data';
    return pathUtils.isAbsolute(r)
      ? r
      : pathUtils.join(this.project.getPath(), r);
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx bourne:export -o Product2 -u myOrg -c config/cpq-cli-def.json
    Requesting data, please wait.... Request completed! Received X records.
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
    object: flags.string({
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
    })
  };

  private _hookState: { [key: string]: unknown } = {};

  private _objectsToProcess: ObjectConfig[];

  private _dataConfig: Config;

  public async run(): Promise<AnyJson> {
    this.ux.log(`Export records from org ${this.org.getOrgId()} (${this.org.getUsername()}) to ${this.dataDir}`);

    const objectConfigs = this.objectsToProcess;

    await this.preExport();

    const results: ObjectSaveResult[] = [];
    for (const objectConfig of objectConfigs) {
      results.push(await this.exportObject(objectConfig));
    }

    await this.postExport(results);

    return (results as unknown) as AnyJson;
  }

  public async getRecords(
    objectNameOrConfig: string | ObjectConfig
  ): Promise<Record[]> {
    const objectConfig: ObjectConfig =
      typeof objectNameOrConfig === 'string'
        ? this.dataConfig.objects[objectNameOrConfig]
        : objectNameOrConfig;
    return new Promise((resolve, reject) => {
      const records = [];
      this.org
        .getConnection()
        .query(objectConfig.query)
        .on('record', record => {
          records.push(record);
        })
        .on('end', () => {
          resolve(records);
        })
        .on('error', err => {
          reject(err);
        })
        .run({ autoFetch: true, maxFetch: 100000 });
    });
  }

  public async saveRecords(
    objectNameOrConfig: string | ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    const objectConfig: ObjectConfig =
      typeof objectNameOrConfig === 'string'
        ? this.dataConfig.objects[objectNameOrConfig]
        : objectNameOrConfig;

    const path = this.getObjectPath(objectConfig);

    await this.clearDirectory(path);
    await this.exportRecordsToDir(records, objectConfig, path);

    const total = records ? records.length : 0;

    return {
      sObjectType: objectConfig.sObjectType,
      total,
      path,
      records,
      failure: 0,
      failureResults: [],
      success: total
    };
  }

  private async exportRecordsToDir(
    records: Record[],
    objectConfig: ObjectConfig,
    dirPath: string
  ): Promise<void> {
    if (!records || records.length === 0) {
      return;
    }

    const externalIdField = objectConfig.externalid;
    if (records.length > 0 && !records[0][externalIdField]) {
      throw new SfdxError(
        "The External Id provided on the configuration file does not exist on the extracted record(s). Please ensure it is included in the object's query."
      );
    }

    const promises = records.map(async record => {
      removeField(record, 'attributes');
      this.removeNullFields(record, objectConfig);
      let fileName = record[externalIdField];
      if (!fileName) {
        throw new SfdxError(
          'There are records without External Ids. Ensure all records that are extracted have a value for the field specified as the External Id.'
        );
      }
      fileName = pathUtils.join(
        dirPath,
        `${fileName.replace(/\s+/g, '-')}.json`
      );
      await fsp.writeFile(fileName, JSON.stringify(record, undefined, 2));
    });

    await Promise.all(promises);
  }

  private removeNullFields(record: Record, objectConfig: ObjectConfig) {
    const cleanupFields = objectConfig.cleanupFields;
    if (cleanupFields) {
      cleanupFields.forEach(field => {
        if (null === record[field]) {
          delete record[field];
          let lookupField: string;
          if (field.endsWith('__r')) {
            lookupField = field.substr(0, field.length - 1) + 'c';
          } else {
            lookupField = field + 'Id';
          }
          record[lookupField] = null;
        }
      });
    }
  }

  private async clearDirectory(dirPath: string): Promise<void> {
    if (fs.existsSync(dirPath)) {
      const items = await fsp.readdir(dirPath);
      const promises = items.map(async item => {
        await fsp.unlink(pathUtils.join(dirPath, item));
      });
      await Promise.all(promises);
    } else {
      fs.mkdirSync(dirPath);
    }
  }

  private async preExportObject(objectConfig: ObjectConfig) {
    const hookResult: PreExportObjectResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      objectConfig,
      service: this,
      state: this._hookState
    };
    await this.config.runHook('preexportobject', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private async postExportObject(
    objectConfig: ObjectConfig,
    result: ObjectSaveResult
  ) {
    const hookResult: PostExportObjectResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      objectConfig,
      result,
      service: this,
      state: this._hookState
    };
    await this.config.runHook('postexportobject', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private getObjectPath(objectConfig: ObjectConfig): string {
    return pathUtils.join(
      this.dataDir,
      objectConfig.directory || objectConfig.sObjectType
    );
  }

  private async exportObject(
    objectConfig: ObjectConfig
  ): Promise<ObjectSaveResult> {
    await this.preExportObject(objectConfig);

    this.ux.stopSpinner();

    this.ux.startSpinner(
      `Exporting ${colors.green(objectConfig.sObjectType)} records`
    );

    const records = await this.getRecords(objectConfig);

    this.ux.stopSpinner();

    const result = await this.saveRecords(objectConfig, records);

    await this.postExportObject(objectConfig, result);

    this.ux.stopSpinner(`Saved ${result.total} records to ${result.path}`);

    return result;
  }

  private async preExport(): Promise<void> {
    const hookResult: PreExportResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      service: this,
      state: this._hookState
    };
    await this.config.runHook('preexport', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }

  private async postExport(results: ObjectSaveResult[]): Promise<void> {
    const hookResult: PostExportResult = {
      config: this.dataConfig,
      scope: this.objectsToProcess,
      results,
      service: this,
      state: this._hookState
    };
    await this.config.runHook('postexport', {
      Command: this.ctor,
      argv: this.argv,
      commandId: this.id,
      result: hookResult
    });
  }
}
