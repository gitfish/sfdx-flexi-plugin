import { Command, Hook, IConfig } from '@oclif/config';
import { UX } from '@salesforce/command';
import { ConfigAggregator, Logger, Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import { DeployResult } from 'jsforce';

export enum HookType {
  predeploy = 'predeploy',
  postdeploy = 'postdeploy',
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

export interface StandardFlags {
  json?: boolean;
  loglevel?: string;
  targetusername?: string;
  targetdevhubusername?: string;
}

export type HookResult =
  | PreDeployResult
  | PostDeployResult
  | PreRetrieveResult
  | PostRetrieveResult
  | PostOrgCreateResult
  | PostSourceUpdateResult
  | any; // eslint-disable-line

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
}

export interface FlexiPluginConfig {
  hooks?: FlexiHooksConfig;
  tsConfig?: any; // eslint-disable-line
}