import { createErrorProxy } from './proxy';
import { Org } from '@salesforce/core';

describe('Proxy Test', () => {

    test('create error proxy', () => {
        const errorMessage = 'Test Error Message';
        const pxy = createErrorProxy<Org>(errorMessage);
        let pxyError;
        try {
            pxy.getConnection();
        } catch(err) {
            pxyError = err;
        }
        expect(pxyError.message).toBe(errorMessage);
    });
});