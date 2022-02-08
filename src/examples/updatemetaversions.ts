import { promises as fsp } from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import { NamedPackageDir, SfdxProject } from '@salesforce/core';
import * as pathUtils from 'node:path';
import { SfdxRunContext } from '../types';
import * as glob from 'glob';

interface TypeConfig {
    type: string;
    pattern: string;
}

// this is not exhaustive - I've definitely missed something
const typeConfigs: TypeConfig[] = [
    {
        type: 'ApexClass',
        pattern: '**/classes/**/*-meta.xml'
    },
    {
        type: 'ApexTrigger',
        pattern: '**/triggers/**/*-meta.xml'
    },
    {
        type: 'ApexComponent',
        pattern: '**/components/**/*-meta.xml'
    },
    {
        type: 'ApexPage',
        pattern: '**/pages/**/*-meta.xml'
    },
    {
        type: 'LightningComponentBundle',
        pattern: '**/lwc/**/*-meta.xml'
    },
    {
        type: 'AuraDefinitionBundle',
        pattern: '**/aura/**/*-meta.xml'
    }
];

const globPromise = async (pattern: string, options: glob.IOptions): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        glob(pattern, options, (err, matches) => {
            if(err) {
                reject(err);
            } else {
                resolve(matches);
            }
        });
    });
};

const updateVersion = async (path: string, rootElement: string, version: string): Promise<void> => {
    const source = await fsp.readFile(path, { encoding: "utf8" });
    const wrapper = await parseStringPromise(source);
    const root = wrapper[rootElement];
    if (root && root.apiVersion && root.apiVersion.length > 0) {
        const currentVersion = root.apiVersion[0];
        if (currentVersion !== version) {
            root.apiVersion[0] = version;
            const xml = new Builder({
                xmldec: {
                    version: "1.0",
                    encoding: "UTF-8",
                    standalone: null
                },
                renderOpts: {
                    pretty: true,
                    indent: '    ',
                    newline: '\n'
                }
            }).buildObject(wrapper);
            await fsp.writeFile(path, xml);
        }
    }
};

const updateTypeMetaVersions = async (packageDir: NamedPackageDir, pattern: string, type: string, version: string): Promise<void> => {
    const items = await globPromise(pattern, { cwd: packageDir.fullPath });
    if (items) {
        await Promise.all(items.map(item => {
            return updateVersion(pathUtils.join(packageDir.fullPath, item), type, version);
        }));
    }
};

const updatePackageDirMetaVersions = async (packageDir: NamedPackageDir, version: string): Promise<void> => {
    await Promise.all(typeConfigs.map(typeConfig => {
        return updateTypeMetaVersions(packageDir, typeConfig.pattern, typeConfig.type, version);
    }));
};

/**
 * Update project metadata versions. This will update the api versions on metadata files in
 * the project to the specified version. If no version is specified, the version is taken from the
 * project source api version.
 */
const updateProjectMetaVersions = async (project: SfdxProject, version?: string): Promise<void> => {
    const updateVersion = version || project.getSfdxProjectJson().getContents().sourceApiVersion;
    await Promise.all(project.getPackageDirectories().map(packageDir => {
        return updatePackageDirMetaVersions(packageDir, updateVersion);
    }));
};

export default async (ctx: SfdxRunContext): Promise<void> => {
    const { project, args: varargs } = ctx;
    await updateProjectMetaVersions(project, varargs.version as string);
};