import * as fs from 'fs/promises';
import { Ref } from './ref';

/**
 * File service interface used by commands - this is abstracted for testing as mocking the fs module's a bit messy
 */
export interface FileService {
    pathExists(path: string): Promise<boolean>;
    readFile(path: string): Promise<string>;
    readdir(path: string): Promise<string[]>;
    mkdir(path: string): Promise<string>;
    unlink(path: string): Promise<void>;
    writeFile(path: string, content: string): Promise<void>;
}

/**
 * Default file service implementation making use of fs module
 */
export class DefaultFileService implements FileService {
    public async pathExists(path: string): Promise<boolean> {
        try {
            await fs.stat(path);
            return true;
        } catch(err) {
            return false;
        }
    }
    public readFile(path: string): Promise<string> {
        return fs.readFile(path, { encoding: 'utf8' });
    }
    public readdir(path: string): Promise<string[]> {
        return fs.readdir(path);
    }
    public mkdir(path: string): Promise<string> {
        return fs.mkdir(path, { recursive: true });
    }
    public unlink(path: string): Promise<void> {
        return fs.unlink(path);
    }
    public writeFile(path: string, content: string): Promise<void> {
        return fs.writeFile(path, content);
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
