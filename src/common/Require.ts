import Ref from './Ref';

export interface RequireFunc {
    (id: string): any; // eslint-disable-line
}

export const requireFunctionRef = new Ref<RequireFunc>({
    defaultSupplier: () => {
        return require;
    }
});

export { requireFunctionRef as default };
