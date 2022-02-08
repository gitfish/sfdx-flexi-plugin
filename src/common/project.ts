import { SfdxProject } from "@salesforce/core";
import { FlexiPluginConfig } from "../types";

export const PLUGIN_KEY = 'flexi';

export const getPluginConfig = async (project: SfdxProject): Promise<FlexiPluginConfig> => {
    const pc = await project.resolveProjectConfig();
    return  <FlexiPluginConfig>pc?.plugins?.[PLUGIN_KEY];
};