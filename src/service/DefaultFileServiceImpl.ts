import { FileService } from './FileService';
import * as fs from 'fs';

export class DefaultFileService implements FileService {
    public existsSync(path: string): boolean {
        return fs.existsSync(path);
    }
    public readFileSync(path: string): string {
        return fs.readFileSync(path, { encoding: 'utf8' });
    }
}