import * as pathUtils from 'path';
import { fileServiceRef } from './FileService';

describe('File Service', () => {

    test('default ref', () => {
        expect(fileServiceRef.current).toBeTruthy();
    });

    test('default exists', () => {
        expect(fileServiceRef.current.existsSync(pathUtils.join(__dirname, 'FileService.ts'))).toBeTruthy();
    });

    test('default read', () => {
        const contents = fileServiceRef.current.readFileSync(pathUtils.join(__dirname, 'FileService.ts'));
        expect(contents).toBeTruthy();
    });
});
