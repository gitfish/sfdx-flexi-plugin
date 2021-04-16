import { SfdxError, SfdxProject } from '@salesforce/core';
import { ErrorResult, SuccessResult } from 'jsforce';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import { DataConfig, DataOperation, ObjectConfig, RecordSaveResult, SaveContext, SaveOperation } from '../types';
import { fileServiceRef } from './FileService';
import Ref from './Ref';

/**
 * Recursively remove a field from a record and child records
 * @param record
 * @param fieldName
 */
export const removeField = (record: Record, fieldName: string): void => {
  delete record[fieldName];
  for (const key in record) {
    if (record.hasOwnProperty(key)) {
      const value = record[key];
      if (value !== null && typeof value === 'object') {
        removeField(value, fieldName);
      }
    }
  }
};

/**
 * This just dedups based on a key generated from an item in the items being processed
 * @param items
 * @param keyGetter
 * @returns
 */
export const keyBasedDedup = <T>(
  items: T[],
  keyGetter: (item: T) => string
): T[] => {
  if (items && items.length > 0) {
    const keyDone: { [key: string]: boolean } = {};
    const r: T[] = [];
    items.forEach(item => {
      const key = keyGetter(item);
      if (!keyDone[key]) {
        keyDone[key] = true;
        r.push(item);
      }
    });
    return r;
  }
  return items;
};

const objectConfigKeyGetter = (item: ObjectConfig): string => {
  return item.sObjectType;
};

/**
 * Get the configurations of objects to process based on flags and config
 * @param flags
 * @param config
 * @returns
 */
export const getObjectsToProcess = (
  flags: { [key: string]: unknown },
  config: DataConfig
): ObjectConfig[] => {
  let sObjectTypes: string[];
  if (flags.object) {
    sObjectTypes = (flags.object as string).split(',');
  } else {
    if (Array.isArray(config.objects)) {
      return keyBasedDedup(config.objects, objectConfigKeyGetter);
    }
    sObjectTypes = config.allObjects;
  }

  if (!sObjectTypes || sObjectTypes.length === 0) {
    throw new SfdxError(
      'Please specify object types to import or configure objects correctly.'
    );
  }

  const objectConfigs = sObjectTypes.map(sObjectType => {
    const objectConfig = config.objects?.[sObjectType];
    if (!objectConfig) {
      throw new SfdxError(
        `There is no configuration specified for object: ${sObjectType}`
      );
    }
    return {
      sObjectType,
      ...config.objects[sObjectType]
    };
  });

  return keyBasedDedup(objectConfigs, objectConfigKeyGetter);
};

/**
 * Load in data configuration
 * @param flags
 * @returns
 */
export const getProjectDataConfig = (project: SfdxProject, flags: { [key: string]: unknown }, fileService = fileServiceRef.current): DataConfig => {
  let configPath = flags.configfile as string;
  if (!pathUtils.isAbsolute(configPath)) {
    configPath = pathUtils.join(project.getPath(), configPath);
  }
  if (fileService.existsSync(configPath)) {
    return JSON.parse(
      fileService.readFileSync(configPath)
    );
  }

  throw new SfdxError(`Unable to find configuration file: ${flags.configpath}`);
};

/**
 * Standard save operation - just uses salesforce 'standard' api
 * @param context
 */
export const standardImport: SaveOperation = async (context: SaveContext): Promise<RecordSaveResult[]> => {
  if (context.operation === DataOperation.upsert) {
    const upsertResults = await context.org.getConnection().sobject(context.objectConfig.sObjectType).upsert(context.records, context.objectConfig.externalid, { allOrNone: !context.config.allowPartial });
    return upsertResults ? upsertResults.map((upsertResult, index) => {
      let message;
      if (!upsertResult.success) {
        const errors = (upsertResult as ErrorResult).errors;
        if (errors) {
          message = errors.join(';');
        }
      }
      return {
        recordId: upsertResult.success ? (upsertResult as SuccessResult).id : undefined,
        externalId: context.records[index][context.objectConfig.externalid],
        message,
        result: upsertResult.success ? 'SUCCESS' : 'FAILED'
      };
    }) : [];
  }

  // TODO: implement delete
  throw new SfdxError('Delete Operation not yet implemented');
};

export const defaultImportHandlerRef = new Ref<SaveOperation>({
  current: standardImport
});
