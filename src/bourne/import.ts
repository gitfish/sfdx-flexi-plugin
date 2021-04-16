/**
 * This is the bourne save implementation used for import
 */
import { Record } from 'jsforce';
import { DataOperation, RecordSaveResult, SaveContext, SaveOperation } from '../types';

export interface BourneConfig {
  restPath?: string;
  payloadLength?: number;
}

export interface BourneObjectConfig {
  enableMultiThreading?: boolean;
}

export interface BourneImportRequest {
  sObjectType: string;
  operation: DataOperation;
  payload: Record[];
  extIdField: string;
}

export const bourneDefaults = {
  restPath: '/JSON/bourne/v1'
};

const splitInHalf = (records: Record[]): Record[][] => {
  const halfSize = Math.floor(records.length / 2);
  const splitRecords = [];
  splitRecords.push(records.slice(0, halfSize));
  splitRecords.push(records.slice(halfSize));
  return splitRecords;
};

const buildRequests = (
  context: SaveContext,
  requests: BourneImportRequest[]
) => {
  const bourneConfig = context.config.bourne as BourneConfig;
  const payload = JSON.stringify(context.records, null, 0);
  if (bourneConfig?.payloadLength && payload.length > bourneConfig?.payloadLength) {
    const splitRecords = splitInHalf(context.records);
    buildRequests({ ...context, records: splitRecords[0] }, requests);
    buildRequests({ ...context, records: splitRecords[1] }, requests);
  } else {
    requests.push({
      extIdField: context.objectConfig.externalid,
      operation: context.operation,
      payload: context.records,
      sObjectType: context.objectConfig.sObjectType
    });
  }
};

const doImport = async (
  request: BourneImportRequest,
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const bourneConfig = context.config.bourne as BourneConfig;
  return JSON.parse(
    await context.org.getConnection().apex.post<string>(bourneConfig?.restPath || bourneDefaults.restPath, request)
  );
};

export const bourneImport: SaveOperation = async (
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const bourneObjectConfig = context.objectConfig.bourne as BourneObjectConfig;
  const results: RecordSaveResult[] = [];
  // for each of these requests, call
  const resultsHandler = (items: RecordSaveResult[]) => {
    if (items) {
      items.forEach(item => results.push(item));
    }
  };
  const requests: BourneImportRequest[] = [];
  buildRequests(context, requests);
  if (bourneObjectConfig?.enableMultiThreading) {
    const promises = requests.map(request => {
      return doImport(request, context);
    });
    const promiseResults: RecordSaveResult[][] = await Promise.all(promises);
    promiseResults.forEach(resultsHandler);
  } else {
    for (const request of requests) {
      resultsHandler(await doImport(request, context));
    }
  }
  return results;
};

export { bourneImport as default };
