
import { coreError } from "../Logger/CoreLogHelper";
import { Type } from "../Type/Type";

export class Task<T = any> extends Promise<T> {
    private _resolve: (value: T | PromiseLike<T>) => void;

    /**
     * 创建一个新的task
     * @param type
     * @returns
     */
    static create<T = any>(type?: Type<T>): Task<T> {
        let resolveVar;
        let task = new Task<T>((resolve, reject) => {
            resolveVar = resolve;
        });

        task._resolve = resolveVar;

        return task;
    }

    setResult(result?: T) {
        if (!this._resolve) {
            coreError(`setResult task has been disposed`);
            return;
        }

        this._resolve(result);
        this.dispose();
    }

    /**
     * 不允许直接new
     * @param executor
     */
    private constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
        super(executor);
    }

    private dispose() {
        this._resolve = null;
    }
}