/**
 * This is the bourne save implementation used for import
 */
import { Record } from 'jsforce';
import { DataOperation, RecordSaveResult, SaveContext, SaveOperation } from '../types';

export interface BourneConfig {
  useManagedPackage?: boolean;
}

interface BourneImportRequest {
  sObjectType: string;
  operation: DataOperation;
  payload: Record[];
  extIdField: string;
}

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
  const payload = JSON.stringify(context.records, null, 0);
  if (payload.length > context.config.payloadLength) {
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

export const bourneImportRequest = async (
  request: BourneImportRequest,
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const bourneConfig: BourneConfig = context.config.extra?.bourne;
  const restUrl = bourneConfig?.useManagedPackage
    ? '/JSON/bourne/v1'
    : '/bourne/v1';
  return JSON.parse(
    await context.org.getConnection().apex.post<string>(restUrl, request)
  );
};

export const bourneImport: SaveOperation = async (
  context: SaveContext
): Promise<RecordSaveResult[]> => {
  const results: RecordSaveResult[] = [];
  // for each of these requests, call
  const resultsHandler = (items: RecordSaveResult[]) => {
    if (items) {
      items.forEach(item => results.push(item));
    }
  };
  const requests: BourneImportRequest[] = [];
  buildRequests(context, requests);
  if (context.objectConfig.enableMultiThreading) {
    const promises = requests.map(request => {
      return bourneImportRequest(request, context);
    });
    const promiseResults: RecordSaveResult[][] = await Promise.all(promises);
    promiseResults.forEach(resultsHandler);
  } else {
    for (const request of requests) {
      resultsHandler(await bourneImportRequest(request, context));
    }
  }
  return results;
};

export { bourneImport as default };
