import { createScriptDelegate, HookType } from "./common";

export interface WorkspaceElement {
  fullName: string;
  metadataName: string;
  sourcePath: string;
  state: string;
  deleteSupported: boolean;
}

export interface PostSourceUpdateItem {
  workspaceElements: WorkspaceElement[];
}

export interface PostSourceUpdateResult {
  [itemName: string]: PostSourceUpdateItem;
}


export const hook = createScriptDelegate<PostSourceUpdateResult>(HookType.postsourceupdate);