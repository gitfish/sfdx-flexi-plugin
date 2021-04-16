import * as fs from 'fs';
import Ref from './Ref';

/**
 * File service interface used by commands - this is abstracted for testing as mocking the fs module's a bit messy
 */
export interface FileService {
    existsSync(path: string): boolean;
    readFileSync(path: string): string;
    readdirSync(path: string): string[];
    readdir(path: string): Promise<string[]>;
    mkdirSync(path: string): void;
    unlink(path: string): Promise<void>;
    writeFile(path: string, content: string): Promise<void>;
}

/**
 * Default file service implementation making use of fs module
 */
export class DefaultFileService implements FileService {
    public existsSync(path: string): boolean {
        return fs.existsSync(path);
    }
    public readFileSync(path: string): string {
        return fs.readFileSync(path, { encoding: 'utf8' });
    }
    public readdirSync(path: string): string[] {
        return fs.readdirSync(path);
    }
    public readdir(path: string): Promise<string[]> {
        return fs.promises.readdir(path);
    }
    public mkdirSync(path: string): void {
        fs.mkdirSync(path);
    }
    public unlink(path: string): Promise<void> {
        return fs.promises.unlink(path);
    }
    public writeFile(path: string, content: string): Promise<void> {
        return fs.promises.writeFile(path, content);
    }
}

/**
 * Reference to the file service - typically overridden from default during testing.
 */
export const fileServiceRef = new Ref<FileService>({
    defaultSupplier: () => {
        return new DefaultFileService();
    }
});
