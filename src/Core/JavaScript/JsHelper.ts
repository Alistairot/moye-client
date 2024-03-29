import { DEVELOP } from "../../Macro";

export class JsHelper {
    public static getMethodName(): string {
        const e = new Error();
        const str = e.stack.split("at ")[2];
        const endPos = str.indexOf(" ");

        return str.substring(0, endPos);
    }

    public static getRootDirName(path: string): string {
        return path.split("/")[0];
    }

    public static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public static isNullOrEmpty(str: string) {
        if (str == null) {
            return true;
        }

        if (str.length == 0) {
            return true;
        }
    }

    static getStringHashCode(str: string): number {
        let hash = 5381;
        let i = str.length;

        while (i) {
            hash = (hash * 33) ^ str.charCodeAt(--i);
        }
        return hash >>> 0;
    }

    static modeString(str: string, mode: number): number {
        const hash = this.getStringHashCode(str);
        const result = hash % mode;

        return result;
    }

    static powBigInt(base: bigint, exp: bigint): bigint {
        let result = BigInt(1);
        for (let i = 0; i < exp; i++) {
            result *= base;
        }

        return result;
    }

    /**
     * 格式化字符串
     * @param str 包含有 0 个或者多个格式符的字符串
     * @param args
     * @returns 格式化后的新字符串
     * @performance 性能是+号拼接10分之1, 也就是比较慢, 要注意性能
     * ```
     * formatStr("hello {0}", "world") => hello world
     * formatStr("hello {0} {1} {0}", "world1", "world2") => hello world1 world2 world1
     * formatStr("hello {{qaq}} {0}", "world") => hello {qaq} world
     * ```
     */
    static formatStr(str: string, ...args: any[]): string {
        if (args.length == 0) {
            return str;
        }

        // 将{0}{1}替换成对应的参数 同时允许{{}}转化为{} 
        const ret = str.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
            if (m == "{{") {
                return "{";
            }

            if (m == "}}") {
                return "}";
            }

            return args[n];
        });

        return ret;
    }
}