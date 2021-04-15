import requireFunctionRef from './Require';

describe('Require Test', () => {
    test('default', () => {
        expect(requireFunctionRef.current).toBeTruthy();
    });
});
