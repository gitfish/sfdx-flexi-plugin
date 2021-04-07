import { SfdxResult, UX } from '@salesforce/command';
import { ConfigAggregator, Logger, Org, SfdxProject } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import { DeployResult } from 'jsforce';

export enum HookType {
  prerun = 'prerun',
  postrun = 'postrun',
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

export type HookResult =
  | PreDeployResult
  | PostDeployResult
  | PreRetrieveResult
  | PostRetrieveResult
  | PostOrgCreateResult
  | PostSourceUpdateResult
  | unknown;

export interface ScriptHookContext {
  hookType: HookType;
  commandId: string;
  result: HookResult;
}

/**
 * This is the context provided to the script
 */
export interface ScriptContext {
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
  hook?: ScriptHookContext; // if we're running from a hook
}

export type ScriptModuleFunc = (context: ScriptContext) => unknown | Promise<unknown>;

export interface ScriptModule {
  run(context: ScriptContext): unknown | Promise<unknown>;
}
