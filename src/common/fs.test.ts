import * as pathUtils from 'path';
import { fileServiceRef } from './fs';

describe('File Service', () => {

    test('default ref', () => {
        expect(fileServiceRef.current).toBeTruthy();
    });

    test('default exists', async () => {
        expect(await fileServiceRef.current.exists(pathUtils.join(__dirname, 'FileService.ts'))).toBeTruthy();
    });

    test('default read', async () => {
        const contents = await fileServiceRef.current.readFile(pathUtils.join(__dirname, 'FileService.ts'));
        expect(contents).toBeTruthy();
    });
});
