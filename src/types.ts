import { Command, Hook, IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
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

export interface StandardFlags {
  json?: boolean;
  loglevel?: string;
  targetusername?: string;
  targetdevhubusername?: string;
}

/**
 * Captures flags for data commands (import and export)
 */
export interface DataCommandFlags {
  configfile: string;
  object?: string | string[];
  datadir: string;
  remove?: boolean;
  allowpartial?: boolean;
  importhandler?: string;
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

export interface SfdxContext {
  logger: Logger;
  ux: UX;
  configAggregator: ConfigAggregator;
  org: Org;
  hubOrg?: Org;
  project?: SfdxProject;
  config?: IConfig;
}

export interface SfdxHookContext<R extends HookResult = HookResult> extends SfdxContext {
  context?: Hook.Context; // the original hook context
  type: HookType;
  commandId: string;
  result: R;
  argv?: string[]; // these were the args provided to the original command
}

export interface RunFlags extends StandardFlags {
  path: string;
  export?: string;
}

/**
 * The context provided to an exported function for the run command
 */
export interface SfdxRunContext<ArgsType = JsonMap> extends SfdxContext {
  flags: RunFlags;
  args: ArgsType; // NOTE: args here comes from the varargs property of the command
}

export type SfdxRunFunction = (
  context: SfdxRunContext
) => unknown | Promise<unknown>;

export type SfdxHookFunction = (
  context: SfdxHookContext
) => unknown | Promise<unknown>;

export interface SfdxModule {
  [key: string]: unknown;
}

export interface FlexiHooksConfig {
  predeploy?: string;
  postdeploy?: string;
  preretrieve?: string;
  postretrieve?: string;
  postsourceupdate?: string;
  postorgcreate?: string;
  preimport?: string;
  preimportobject?: string;
  postimportobject?: string;
  postimport?: string;
  preexport?: string;
  preexportobject?: string;
  postexportobject?: string;
  postexport?: string;
}

export interface FlexiPluginConfig {
  hooks?: FlexiHooksConfig;
}