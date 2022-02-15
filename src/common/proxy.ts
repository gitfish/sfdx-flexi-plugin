import { SfdxError } from '@salesforce/core';

// eslint-disable-next-line
export const createErrorProxy = <T extends object>(errorMessage: string): T => {
    return new Proxy<T>(<T>{}, {
        apply: function() {
            throw new SfdxError(errorMessage);
        },
        get: function() {
            throw new SfdxError(errorMessage);
        },
        set: function() {
            throw new SfdxError(errorMessage)
        }
    });
};