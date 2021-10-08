import { SfdxError } from "@salesforce/core";
import { ErrorResult, SuccessResult, Record } from "jsforce";
import * as pathUtils from "path";
import {
  DataConfig,
  ObjectConfig,
  RecordSaveResult,
  SaveContext,
  SaveOperation,
} from "../types";
import { fileServiceRef } from "./fs";
import { Ref } from "./ref";

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
    if (Array.isArray(flags.object)) {
      sObjectTypes = flags.object;
    } else {
      sObjectTypes = (<string>flags.object).split(",");
    }
  } else {
    if (Array.isArray(config.objects)) {
      return keyBasedDedup(config.objects, objectConfigKeyGetter);
    }
    sObjectTypes = config.allObjects;
  }

  if (!sObjectTypes || sObjectTypes.length === 0) {
    throw new SfdxError(
      "Please specify object types to import or configure objects correctly."
    );
  }

  const objectConfigs = sObjectTypes.map((sObjectType) => {
    const objectConfig = config.objects?.[sObjectType];
    if (!objectConfig) {
      throw new SfdxError(
        `There is no configuration specified for object: ${sObjectType}`
      );
    }
    return {
      sObjectType,
      ...config.objects[sObjectType],
    };
  });

  return keyBasedDedup(objectConfigs, objectConfigKeyGetter);
};

/**
 * Load in data configuration
 * @param flags
 * @returns
 */
export const getDataConfig = async (
  basePath: string,
  flags: { [key: string]: unknown },
  fileService = fileServiceRef.current
): Promise<DataConfig> => {
  let configPath = <string>flags.configfile;
  if (!configPath) {
    throw new SfdxError("A configuration file path must be specified");
  }
  if (!pathUtils.isAbsolute(configPath)) {
    configPath = pathUtils.join(basePath, configPath);
  }
  if (await fileService.exists(configPath)) {
    return JSON.parse(await fileService.readFile(configPath));
  }

  throw new SfdxError(`Unable to find configuration file: ${flags.configpath}`);
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
    const externalId = record[context.objectConfig.externalid];
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
      .sobject(context.objectConfig.sObjectType);
    const existing = await sObject.find(
      `${context.objectConfig.externalid} in (${externalIdSetString})`
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
    .sobject(context.objectConfig.sObjectType)
    .upsert(records, context.objectConfig.externalid, {
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
          externalId: context.records[index][context.objectConfig.externalid],
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
