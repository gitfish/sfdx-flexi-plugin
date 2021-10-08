import { Ref } from './ref';

export interface RequireFunc {
    (id: string): any; // eslint-disable-line
}

export const RequireFunctionRef = new Ref<RequireFunc>({
    defaultSupplier: () => {
        return require;
    }
});