import * as fs from 'fs';
import Ref from './Ref';

export interface FileService {
    existsSync(path: string): boolean;
    readFileSync(path: string): string;
}

export class DefaultFileService implements FileService {
    public existsSync(path: string): boolean {
        return fs.existsSync(path);
    }
    public readFileSync(path: string): string {
        return fs.readFileSync(path, { encoding: 'utf8' });
    }
}

export const fileServiceRef = new Ref<FileService>({
    defaultSupplier: () => {
        return new DefaultFileService();
    }
});
