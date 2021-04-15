import Ref from './Ref';

export const requireFunctionRef = new Ref<NodeRequireFunction>({
    defaultSupplier: () => {
        return require;
    }
});

export { requireFunctionRef as default };
