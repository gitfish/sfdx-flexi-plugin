import { SfdxError } from "@salesforce/core";
import { ErrorResult, SuccessResult, Record } from "jsforce";
import * as pathUtils from "path";
import {
  DataCommandFlags,
  DataConfig,
  ObjectConfig,
  RecordSaveResult,
  SaveContext,
  SaveOperation,
} from "../types";
import { FileServiceRef } from "../common/fs";
import { Ref } from "../common/ref";

export const defaultConfig = {
  dataDir: "data",
};

/**
 * Recursively remove a field from a record and child records
 * @param record
 * @param fieldName
 */
export const removeField = (record: Record, fieldName: string): void => {
  delete record[fieldName];
  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value !== null && typeof value === "object") {
      removeField(value, fieldName);
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
    items.forEach((item) => {
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
  return item.object;
};

/**
 * Get the configurations of objects to process based on flags and config
 * @param flags
 * @param config
 * @returns
 */
export const getObjectConfigs = (flags: DataCommandFlags, config: DataConfig): ObjectConfig[] => {
  const r = keyBasedDedup(config.objects, objectConfigKeyGetter);
  let objects: string[];
  if(flags.object) {
    if (Array.isArray(flags.object)) {
      objects = flags.object;
    } else {
      objects = (<string>flags.object).split(",").map(e => e.trim());
    }
  }

  if(objects) {
    return r.filter(e => objects.some(n => e.object === n));
  }

  return r;
};

export interface GetDataConfigOptions {
  basePath: string;
  flags: DataCommandFlags;
}

/**
 * Load in data configuration
 * @param flags
 * @returns
 */
export const getDataConfig = async (basePath: string, flags: DataCommandFlags): Promise<DataConfig> => {
  let configPath = flags.configfile;
  if(!configPath) {
    throw new SfdxError("A configuration file path must be specified");
  }
  if(!pathUtils.isAbsolute(configPath)) {
    configPath = pathUtils.join(basePath, configPath);
  }

  return JSON.parse(await FileServiceRef.current.readFile(configPath));
};

const escapeSetValue = (value: string): string => {
  let escaped = '';
  for(let i = 0; i < value.length; i ++) {
    const ch = value.charAt(i);
    if(ch === "'" || ch === "\\" || ch === '"') {
      escaped += '\\';
    }
    escaped += ch;
  }
  return escaped;
};

const standardDelete = async (
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const externalIds = [];
  context.records.forEach((record) => {
    const externalId = record[context.objectConfig.externalId];
    if (externalId && externalIds.indexOf(externalId) < 0) {
      externalIds.push(externalId);
    }
  });

  if (externalIds.length === 0) {
    return [];
  }

  if (externalIds.length > 0) {
    const externalIdSetString = externalIds.map((externalId) => {
      return `'${escapeSetValue(externalId)}'`;
    });

    const sObject = context.org
      .getConnection()
      .sobject(context.objectConfig.object);
    const existing = await sObject.find(
      `${context.objectConfig.externalId} in (${externalIdSetString})`
    );
    if (existing && existing.length > 0) {
      const ids = existing.map((r) => r.Id);
      const deleteResults = await sObject.delete(ids);
      return deleteResults.map((dr) => {
        return {
          success: dr.success,
        };
      });
    }
  }
};

/**
 * Standard save operation - just uses salesforce 'standard' api
 * @param context
 */
export const standardImport: SaveOperation = async (
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  if (context.isDelete) {
    return standardDelete(context);
  }

  const records: Record<{ [key: string]: unknown }>[] = context.records;

  const upsertResults = await context.org
    .getConnection()
    .sobject(context.objectConfig.object)
    .upsert(records, context.objectConfig.externalId, {
      allOrNone: !context.config.allowPartial,
      allowRecursive: true,
    });
  return upsertResults
    ? upsertResults.map((upsertResult, index) => {
        let message;
        if (!upsertResult.success) {
          const errors = (<ErrorResult>upsertResult).errors;
          if (errors) {
            message = errors.join(";");
          }
        }
        return {
          recordId: upsertResult.success
            ? (<SuccessResult>upsertResult).id
            : undefined,
          externalId: context.records[index][context.objectConfig.externalId],
          message,
          success: upsertResult.success,
        };
      })
    : [];
};

export const defaultImportHandlerRef = new Ref<SaveOperation>({
  defaultSupplier() {
    return standardImport;
  },
});
