/**
 * This is the bourne save implementation used for import
 */
import { Record } from 'jsforce';
import { RecordSaveResult, SaveContext, SaveOperation } from '../types';

export interface BourneConfig {
  restPath?: string;
  payloadLength?: number;
}

export interface BourneObjectConfig {
  enableMultiThreading?: boolean;
}

export interface BourneImportRequest {
  sObjectType: string;
  operation: 'upsert' | 'delete';
  payload: Record[];
  extIdField: string;
}

export interface BourneSaveResult {
  recordId?: string;
  externalId?: string;
  message?: string;
  result?: 'SUCCESS' | 'FAILED';
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
  const bourneConfig = <BourneConfig>context.config.bourne;
  const payload = JSON.stringify(context.records, null, 0);
  if (bourneConfig?.payloadLength && payload.length > bourneConfig?.payloadLength) {
    const splitRecords = splitInHalf(context.records);
    buildRequests({ ...context, records: splitRecords[0] }, requests);
    buildRequests({ ...context, records: splitRecords[1] }, requests);
  } else {
    requests.push({
      extIdField: context.objectConfig.externalId,
      operation: context.isDelete ? 'delete' : 'upsert',
      payload: context.records,
      sObjectType: context.objectConfig.object
    });
  }
};

const doImport = async (
  request: BourneImportRequest,
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const bourneConfig = <BourneConfig>context.config.bourne;
  return JSON.parse(
    await context.org.getConnection().apex.post<string>(bourneConfig?.restPath || bourneDefaults.restPath, request)
  );
};

export const bourneImport: SaveOperation = async (
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const bourneObjectConfig = <BourneObjectConfig>context.objectConfig.bourne;
  const results: RecordSaveResult[] = [];
  // for each of these requests, call
  const resultsHandler = (items: BourneSaveResult[]) => {
    if (items) {
      items.forEach(item => {
        results.push({
          recordId: item.recordId,
          externalId: item.externalId,
          message: item.message,
          success: item.result === 'SUCCESS'
        });
      });
    }
  };
  const requests: BourneImportRequest[] = [];
  buildRequests(context, requests);
  if (bourneObjectConfig?.enableMultiThreading) {
    const promises = requests.map(request => {
      return doImport(request, context);
    });
    const promiseResults: BourneSaveResult[][] = await Promise.all(promises);
    promiseResults.forEach(resultsHandler);
  } else {
    for (const request of requests) {
      resultsHandler(await doImport(request, context));
    }
  }
  return results;
};

export { bourneImport as default };
