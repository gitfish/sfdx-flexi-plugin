import { Command, Hook, IConfig } from '@oclif/config';
import { SfdxResult, UX } from '@salesforce/command';
import { ConfigAggregator, Logger, Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import { DeployResult, Record } from 'jsforce';

export enum HookType {
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
  postexport = 'postexport',
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
  importHandler?: string; // the import handler to use for the object - by default uses the data level config
  [key: string]: unknown; // for extra config
}

/**
 * The data configuration
 */
export interface DataConfig {
  importRetries?: number;
  importHandler?: string; // the default handler for the import - will default to standard
  allObjects?: string[]; // NOTE: to support legacy config
  objects?: { [sObjectType: string]: ObjectConfig } | ObjectConfig[]; // NOTE: map setup to support legacy config
  allowPartial?: boolean;
  [key: string]: unknown; // for extra config
}

export interface SaveContext {
  config: DataConfig;
  objectConfig: ObjectConfig;
  isDelete: boolean;
  records: Record[];
  org: Org;
  ux: UX;
}

export interface RecordSaveResult {
  recordId?: string;
  externalId?: string;
  message?: string;
  success?: boolean;
}

export type SaveOperation = (
  context: SaveContext
) => Promise<RecordSaveResult[]>;

export interface ObjectSaveResult {
  sObjectType: string;
  path: string;
  records?: Record[];
  results?: RecordSaveResult[];
  total?: number;
  failure?: number;
  success?: number;
  failureResults?: RecordSaveResult[];
}

export interface DataService {
  getRecords(objectNameOrConfig: string | ObjectConfig): Promise<Record[]>;
  saveRecords(
    objectNameOrConfig: string | ObjectConfig,
    records: Record[]
  ): Promise<ObjectSaveResult>;
}

export interface DataOpResult {
  config: DataConfig;
  scope: ObjectConfig[];
  service: DataService;
  state: {
    [key: string]: unknown;
  };
}

export interface PreImportResult extends DataOpResult {
  isDelete: boolean;
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

export type PreExportResult = DataOpResult;

export interface PreExportObjectResult extends DataOpResult {
  objectConfig: ObjectConfig;
}

export interface PostExportObjectResult extends PreExportObjectResult {
  result: ObjectSaveResult;
}

export interface PostExportResult extends DataOpResult {
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
  | PostExportResult;

export interface HookOptions<R extends HookResult> {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: R;
}

export type HookFunction<R extends HookResult> = (
  this: Hook.Context,
  options: HookOptions<R>
) => Promise<unknown>;

export interface SfdxHookContext<R extends HookResult = HookResult> {
  context?: Hook.Context; // the original hook context
  hookType: HookType;
  commandId: string;
  result: R;
  config?: IConfig; // NOTE: this is the config from the original hook context
  argv?: string[];
}

export type ScriptHookContext = SfdxHookContext;

/**
 * This is the context provided to the script
 */
export interface SfdxContext<R extends HookResult = HookResult> {
  logger: Logger;
  ux: UX;
  configAggregator: ConfigAggregator;
  org: Org;
  hubOrg?: Org;
  project?: SfdxProject;
  result: SfdxResult;
  flags: { [key: string]: unknown };
  args: { [key: string]: unknown };
  argv: string[];
  varargs: JsonMap;
  hook?: SfdxHookContext<R>;
  config: IConfig;
}

export type ScriptContext = SfdxContext;

export type SfdxFunction<R extends HookResult = HookResult> = (
  context: SfdxContext<R>
) => unknown | Promise<unknown>;

export type ScriptFunction = SfdxFunction;

export interface SfdxModule<R extends HookResult = HookResult> {
  [key: string]: SfdxFunction<R>;
}

export type ScriptModule = SfdxModule;
