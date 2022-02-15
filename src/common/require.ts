import { Ref } from './ref';

export interface RequireFunc {
    (id: string): any; // eslint-disable-line
}

export interface ResolveOptions {
    paths?: string[];
}

export interface ResolveFunc {
    (id: string, opts?: ResolveOptions): string;
}

export const RequireFunctionRef = new Ref<RequireFunc>({
    defaultSupplier: () => {
        return require;
    }
});

export const ResolveFunctionRef = new Ref<ResolveFunc>({
    defaultSupplier: () => {
        return require.resolve;
    }
});