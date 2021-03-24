import { createScriptDelegate, HookType } from "./common";

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


export const hook = createScriptDelegate<PreDeployResult>(HookType.predeploy);