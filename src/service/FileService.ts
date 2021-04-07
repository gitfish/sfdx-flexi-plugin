export interface FileService {
    existsSync(path: string): boolean;
    readFileSync(path: string): string;
}