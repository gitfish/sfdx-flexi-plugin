export interface RefOptions<T> {
    current?: T;
    defaultSupplier?: () => T;
}

export class Ref<T = any> {
    private _current : T;
    private _defaultSupplier : () => T;
    constructor(opts?: RefOptions<T>) {
        this._current = opts?.current;
        this._defaultSupplier = opts?.defaultSupplier;
    }
    get current() : T {
        if(!this._current && this._defaultSupplier) {
            this._current = this._defaultSupplier();
        }
        return this._current;
    }
    set current(value : T) {
        this._current = value;
    }
}

export { Ref as default }