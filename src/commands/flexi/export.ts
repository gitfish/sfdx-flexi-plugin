import { flags, SfdxCommand, SfdxResult } from '@salesforce/command';
import { Messages, SfdxError, SfdxProject } from '@salesforce/core';
import { AnyJson } from '@salesforce/ts-types';
import * as colors from 'colors';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import {
  defaultConfig,
  getDataConfig,
  getObjectsToProcess,
  removeField
} from '../../common/data';
import { FileService, FileServiceRef } from '../../common/fs';
import {
  DataConfig,
  DataService,
  ObjectConfig,
  ObjectSaveResult
} from '../../types';

Messages.importMessagesDirectory(__dirname);

const messages = Messages.loadMessages('sfdx-flexi-plugin', 'export');

export default class ExportCommand extends SfdxCommand implements DataService {
  public get fileService(): FileService {
    if (!this.fileServiceInternal) {
      return FileServiceRef.current;
    }
    return this.fileServiceInternal;
  }
  public set fileService(value: FileService) {
    this.fileServiceInternal = value;
  }

  protected get dataConfig(): DataConfig {
    if (!this.dataConfigInternal) {
      this.dataConfigInternal = getDataConfig(this.basePath, this.flags, this.fileService);
    }
    return this.dataConfigInternal;
  }
  protected get objectsToProcess(): ObjectConfig[] {
    if (!this.objectsToProcessInternal) {
      this.objectsToProcessInternal = getObjectsToProcess(this.flags, this.dataConfig);
    }
    return this.objectsToProcessInternal;
  }

  get basePath(): string {
    return this.project ? this.project.getPath() : process.cwd();
  }

  protected get dataDir(): string {
    const r = this.flags.datadir || defaultConfig.dataDir;
    return pathUtils.isAbsolute(r)
      ? r
      : pathUtils.join(this.basePath, r);
  }

  public static description = messages.getMessage('commandDescription');

  public static examples = [
    `$ sfdx flexi:export -o Product2 -u myOrg -c config/cpq-cli-def.json`,
    `$ sfdx flexi:export -u myOrg -c config/cpq-cli-def.json`,
    `$ sfdx flexi:export -u myOrg -c config/cpq-cli-def.json -d woo`
  ];

  public static requiresUsername = true;

  public static supportsDevhubUsername = true;

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
    })
  };
  private fileServiceInternal: FileService;

  private hookState: { [key: string]: unknown } = {};

  private objectsToProcessInternal: ObjectConfig[];

  private dataConfigInternal: DataConfig;

  public async run(): Promise<AnyJson> {
    this.ux.log(`Export records from org ${this.org.getOrgId()} (${this.org.getUsername()}) to ${this.dataDir}`);

    await this.preExport();

    const objectConfigs = this.objectsToProcess;

    const results: ObjectSaveResult[] = [];
    for (const objectConfig of objectConfigs) {
      results.push(await this.exportObject(objectConfig));
    }

    await this.postExport(results);

    return <AnyJson>(<unknown>results);
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
      this.org.getConnection().query(objectConfig.query)
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

    return this.saveRecordsInternal(objectConfig, records);
  }

  protected async saveRecordsInternal(
    objectConfig: ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult> {
    const path = this.getObjectPath(objectConfig);

    await this.clearDirectory(path);
    await this.exportRecordsToDir(records, objectConfig, path);

    const total = records ? records.length : 0;

    return {
      sObjectType: objectConfig.sObjectType,
      total,
      path,
      records,
      results: records.map(record => {
        return {
          externalId: record[objectConfig.externalid],
          success: true
        };
      }),
      failure: 0,
      failureResults: [],
      success: total
    };
  }

  protected async assignProject(): Promise<void> {
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
      await this.fileService.writeFile(fileName, JSON.stringify(record, undefined, 2));
    });

    await Promise.all(promises);
  }

  private removeNullFields(record: Record, objectConfig: ObjectConfig) {
    const cleanupFields = objectConfig.cleanupFields;
    if (cleanupFields) {
      cleanupFields.forEach(field => {
        if (record[field] === null) {
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
    if (this.fileService.existsSync(dirPath)) {
      const items = await this.fileService.readdir(dirPath);
      const promises = items.map(item => {
        return this.fileService.unlink(pathUtils.join(dirPath, item));
      });
      await Promise.all(promises);
    } else {
      this.fileService.mkdirSync(dirPath);
    }
  }

  private async preExportObject(objectConfig: ObjectConfig) {
    await this.runHook('preexportobject', {
      objectConfig
    });
  }

  private async postExportObject(
    objectConfig: ObjectConfig,
    result: ObjectSaveResult
  ) {
    await this.runHook('postexportobject', {
      objectConfig,
      result
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

    this.ux.startSpinner(
      `Exporting ${colors.green(objectConfig.sObjectType)} records`
    );

    await this.preExportObject(objectConfig);

    const result = await this.saveRecordsInternal(objectConfig, records);

    await this.postExportObject(objectConfig, result);

    this.ux.stopSpinner(`Saved ${result.total} records to ${result.path}`);

    return result;
  }

  private async preExport(): Promise<void> {
    await this.runHook('preexport');
  }

  private async postExport(results: ObjectSaveResult[]): Promise<void> {
    await this.runHook('postexport', {
      results
    });
  }
}
