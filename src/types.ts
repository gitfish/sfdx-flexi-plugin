import { Command, Hook, IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { ConfigAggregator, Logger, Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import { DeployResult as MDApiDeployResult } from 'jsforce';
import { DeployResult, FileResponse, MetadataComponent } from '@salesforce/source-deploy-retrieve';

export enum HookType {
  prepush = 'prepush',
  postpush = 'postpush',
  predeploy = 'predeploy',
  postdeploy = 'postdeploy',
  prepull = 'prepull',
  postpull = 'postpull',
  preretrieve = 'preretrieve',
  postretrieve = 'postretrieve',
  postsourceupdate = 'postsourceupdate',
  postorgcreate = 'postorgcreate'
}

export interface WorkspaceElement {
  fullName: string;
  metadataName: string;
  sourcePath: string;
  state: string;
  deleteSupported: boolean;
}

export interface PrePushItem {
  mdapiFilePath: string;
  workspaceElements: WorkspaceElement[];
}

export interface PrePushResult {
  [itemName: string]: PrePushItem;
}

export type PreDeployHookResult = PrePushResult | MetadataComponent[];

export interface PostSourceUpdateItem {
  workspaceElements: WorkspaceElement[];
}

export interface PostSourceUpdateResult {
  [itemName: string]: PostSourceUpdateItem;
}

export interface PrePullResult {
  packageXmlPath: string;
}

export type PreRetrieveHookResult = PrePullResult | MetadataComponent[];

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

export interface PostPullItem {
  mdapiFilePath: string;
}

export interface PostPullResult {
  [itemName: string]: PostPullItem;
}

export type PostRetrieveHookResult = PostPullResult | FileResponse[]

export type PostPushResult = MDApiDeployResult;

export type PostDeployHookResult = PostPushResult | DeployResult

export interface StandardFlags {
  json?: boolean;
  loglevel?: string;
  targetusername?: string;
  targetdevhubusername?: string;
}

export interface HookOptions<HookResult = unknown> {
  Command: Command.Class;
  argv: string[];
  commandId: string;
  result?: HookResult;
}

export type HookFunction<HookResult = unknown> = (
  this: Hook.Context,
  options: HookOptions<HookResult>
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

export interface SfdxHookContext<HookResult = unknown> extends SfdxContext {
  context?: Hook.Context; // the original hook context
  type: HookType;
  commandId: string;
  result: HookResult;
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

export type SfdxAppContext = SfdxRunContext;

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
}

export interface FlexiPluginConfig {
  hooks?: FlexiHooksConfig;
}