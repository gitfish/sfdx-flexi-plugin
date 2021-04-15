import { SfdxResult, UX } from '@salesforce/command';
import { ConfigAggregator, Logger, Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import { DeployResult, Record } from 'jsforce';

export enum HookType {
  prerun = 'prerun',
  postrun = 'postrun',
  predeploy = 'predeploy',
  postdeploy = 'postdeploy',
  preretrieve = 'preretrieve',
  postretrieve = 'postretrieve',
  postsourceupdate = 'postsourceupdate',
  postorgcreate = 'postorgcreate',
  preimport = 'preimport',
  preimportobject = 'preimportobject',
  postimportobject = 'postimportobject',
  postimport = 'postimport',
  preexport = 'preexport',
  preexportobject = 'preexportobject',
  postexportobject = 'postexportobject',
  postexport = 'postexport'
}

export interface WorkspaceElement {
  fullName: string;
  metadataName: string;
  sourcePath: string;
  state: string;
  deleteSupported: boolean;
}

export interface PreDeployItem {
  mdapiFilePath: string;
  workspaceElements: WorkspaceElement[];
}

export interface PreDeployResult {
  [itemName: string]: PreDeployItem;
}

export interface PostSourceUpdateItem {
  workspaceElements: WorkspaceElement[];
}

export interface PostSourceUpdateResult {
  [itemName: string]: PostSourceUpdateItem;
}

export interface PreRetrieveResult {
  packageXmlPath: string;
}

export interface PostOrgCreateResult {
  accessToken: string;
  clientId: string;
  created: string;
  createdOrgInstance: string;
  devHubUsername: string;
  expirationDate: string;
  instanceUrl: string;
  loginUrl: string;
  orgId: string;
  username: string;
}

export interface PostRetrieveItem {
  mdapiFilePath: string;
}

export interface PostRetrieveResult {
  [itemName: string]: PostRetrieveItem;
}

export type PostDeployResult = DeployResult;

export interface ObjectConfig {
  sObjectType?: string;
  query?: string;
  externalid?: string;
  directory?: string;
  filename?: string;
  cleanupFields?: string[];
  hasRecordTypes?: boolean;
  enableMultiThreading?: boolean;
}

/**
 * The data configuration
 */
export interface Config {
  pollTimeout?: number;
  pollBatchSize?: number;
  maxPollCount?: number;
  payloadLength?: number;
  importRetries?: number;
  importHandler?: string; // defaults to standard, but can be 'bourne' to use the bourne importer
  useManagedPackage?: boolean;
  allObjects?: string[]; // NOTE: to support legacy config
  objects?: { [sObjectType: string]: ObjectConfig } | ObjectConfig[]; // NOTE: map setup to support legacy config
  allowPartial?: boolean;
  extra?: { // this is for any extra configuration required
    [key: string]: unknown
  };
}

export enum DataOperation {
  delete = 'delete',
  upsert = 'upsert'
}

export interface SaveContext {
  config: Config;
  objectConfig: ObjectConfig;
  operation: DataOperation;
  records: Array<Record<object>>;
  org: Org;
}

export interface RecordSaveResult {
  recordId?: string;
  externalId?: string;
  message?: string;
  result?: 'SUCCESS' | 'FAILED';
}

export type SaveOperation = (context: SaveContext) => Promise<RecordSaveResult[]>;

export interface ObjectSaveResult {
  sObjectType: string;
  path: string;
  records?: Record[];
  results?: RecordSaveResult[];
  total?: number;
  failure?: number;
  success?: number;
  failureResults?: RecordSaveResult[];
  [key: string]: unknown;
}

export interface DataService {
  getRecords(objectNameOrConfig: string | ObjectConfig): Promise<Record[]>;
  saveRecords(
    objectNameOrConfig: string | ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult>;
}

export interface PreImportResult {
  config: Config;
  scope: ObjectConfig[];
  service: DataService;
  state: {
    [key: string]: unknown;
  };
}

export interface PreImportObjectResult extends PreImportResult {
  objectConfig: ObjectConfig;
  records: Record[];
}

export interface PostImportObjectResult extends PreImportResult {
  objectConfig: ObjectConfig;
  importResult: ObjectSaveResult;
}

export interface PostImportResult extends PreImportResult {
  results: ObjectSaveResult[];
}

export type PreExportResult = PreImportResult;

export interface PreExportObjectResult extends PreExportResult {
  objectConfig: ObjectConfig;
}

export interface PostExportObjectResult extends PreExportObjectResult {
  result: ObjectSaveResult;
}

export interface PostExportResult extends PreExportResult {
  results: ObjectSaveResult[];
}

export type HookResult =
  | PreDeployResult
  | PostDeployResult
  | PreRetrieveResult
  | PostRetrieveResult
  | PostOrgCreateResult
  | PostSourceUpdateResult
  | PreImportResult
  | PreImportObjectResult
  | PostImportObjectResult
  | PostImportResult
  | PreExportResult
  | PreExportObjectResult
  | PostExportObjectResult
  | PostExportResult
  | unknown;

export interface ScriptHookContext<R extends HookResult = HookResult> {
  hookType: HookType;
  commandId: string;
  result: R;
}

/**
 * This is the context provided to the script
 */
export interface ScriptContext<R extends HookResult = HookResult> {
  logger: Logger;
  ux: UX;
  configAggregator: ConfigAggregator;
  org?: Org;
  hubOrg?: Org;
  project?: SfdxProject;
  result: SfdxResult;
  flags: { [key: string]: unknown };
  args: { [key: string]: unknown };
  varargs?: JsonMap;
  hook?: ScriptHookContext<R>;
}

export type ScriptFunction<R extends HookResult = HookResult> = (context: ScriptContext<R>)  => unknown | Promise<unknown>;

export interface ScriptModule<R extends HookResult = HookResult> {
  [key: string]: ScriptFunction<R>;
}
