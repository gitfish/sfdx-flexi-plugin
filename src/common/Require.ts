import Ref from './Ref';

export interface RequireFunc {
    (id: string): any;
}

export const requireFunctionRef = new Ref<RequireFunc>({
    defaultSupplier: () => {
        return require;
    }
});

export { requireFunctionRef as default };
