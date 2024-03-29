import * as pathUtils from 'path';
import { FileServiceRef } from './fs';

describe('File Service', () => {

    test('default ref', () => {
        expect(FileServiceRef.current).toBeTruthy();
    });

    test('default exists', async () => {
        expect(await FileServiceRef.current.pathExists(pathUtils.join(__dirname, 'fs.ts'))).toBeTruthy();
    });

    test('default read', async () => {
        const contents = await FileServiceRef.current.readFile(pathUtils.join(__dirname, 'fs.ts'));
        expect(contents).toBeTruthy();
    });
});
