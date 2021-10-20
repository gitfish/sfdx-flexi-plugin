import * as fs from 'fs';
import { Ref } from './ref';
import { tmpdir } from 'os';
import * as pathUtils from 'path';

/**
 * File service interface used by commands - this is abstracted for testing as mocking the fs module's a bit messy
 */
export interface FileService {
    pathExists(path: string): Promise<boolean>;
    readFile(path: string): Promise<string>;
    readdir(path: string): Promise<string[]>;
    mkdir(path: string): Promise<string>;
    mkdtemp(path: string): Promise<string>;
    unlink(path: string): Promise<void>;
    writeFile(path: string, content: string): Promise<void>;
    copyFile(src: string, dest: string): Promise<void>;
}

/**
 * Default file service implementation making use of fs module
 */
export class DefaultFileService implements FileService {
    public async pathExists(path: string): Promise<boolean> {
        try {
            await fs.promises.stat(path);
            return true;
        } catch(err) {
            return false;
        }
    }
    public readFile(path: string): Promise<string> {
        return fs.promises.readFile(path, { encoding: 'utf8' });
    }
    public readdir(path: string): Promise<string[]> {
        return fs.promises.readdir(path);
    }
    public mkdir(path: string): Promise<string> {
        return fs.promises.mkdir(path, { recursive: true });
    }
    public mkdtemp(path: string): Promise<string> {
        return fs.promises.mkdtemp(pathUtils.join(tmpdir(), path));
    }
    public unlink(path: string): Promise<void> {
        return fs.promises.unlink(path);
    }
    public writeFile(path: string, content: string): Promise<void> {
        return fs.promises.writeFile(path, content);
    }
    public copyFile(src: string, dest: string): Promise<void> {
        return fs.promises.copyFile(src, dest);
    }
}

/**
 * Reference to the file service - typically overridden from default during testing.
 */
export const FileServiceRef = new Ref<FileService>({
    defaultSupplier: () => {
        return new DefaultFileService();
    }
});
