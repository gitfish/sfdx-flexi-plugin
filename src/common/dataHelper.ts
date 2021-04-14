import { SfdxError } from '@salesforce/core';
import * as fs from 'fs';
import { Record } from 'jsforce';
import * as pathUtils from 'path';
import { Config, ObjectConfig } from '../types';

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
  config: Config
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
export const getDataConfig = (flags: { [key: string]: unknown }): Config => {
  if (fs.existsSync(flags.configfile as string)) {
    return JSON.parse(
      fs.readFileSync(
        pathUtils.join(process.cwd(), flags.configfile as string),
        {
          encoding: 'utf8'
        }
      )
    );
  }

  throw new SfdxError(`Unable to find configuration file: ${flags.configfile}`);
};
