import { RequireFunctionRef } from './require';

describe('Require Test', () => {
    test('default', () => {
        expect(RequireFunctionRef.current).toBeTruthy();
    });
});
