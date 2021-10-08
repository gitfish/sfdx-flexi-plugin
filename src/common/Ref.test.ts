import { Ref } from './ref';

describe('Ref Test', () => {

    test('supplier default', () => {

        const r: Ref<string> = new Ref<string>({
            defaultSupplier: () => {
                return 'woo';
            }
        });

        expect(r.current).toBe('woo');

        r.current = null;

        expect(r.current).toBe('woo');

    });
});
