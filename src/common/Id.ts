export interface Sequence {
    next(): string;
}

export class SimpleSequence implements Sequence {
    private _prefix: string;
    private _id: number;
    constructor(prefix: string = '') {
        this._prefix = prefix;
    }
    public next(): string {
        if (this._id === undefined) {
            this._id = 0;
        } else {
            this._id ++;
        }
        return this._prefix + this._id;
    }
}

const instances: { [key: string]: Sequence } = {};
const defaultInstance = new SimpleSequence();

const getSequence = (name?: string): Sequence => {
    if (name) {
        let instance = instances[name];
        if (!instance) {
            instance = new SimpleSequence(name);
            instances[name] = instance;
        }
        return instance;
    }
    return defaultInstance;
};

export const next = (name?: string): string => {
    return getSequence(name).next();
};
