import { TimeInfo } from "../Time/TimeInfo";
import { coreError, coreWarn } from '../Logger/CoreLogHelper';

/**
 * 可用时间 s
 */
const timeBit = 32n;

/**
 * 每秒可以产生的数量
 */
const valueBit = 32n;

const powTimeBit = 2n ** timeBit - 1n;
const powValueBit = 2n ** valueBit - 1n;

const epoch = new Date(2023, 4, 1).getTime();

export class InstanceIdStruct {
    private static lastTime = 0;
    private static idCount: number = 0;

    private static _inst: InstanceIdStruct;
    private static get inst() {
        if (InstanceIdStruct._inst == null) {
            InstanceIdStruct._inst = new InstanceIdStruct();
        }

        return InstanceIdStruct._inst;
    }

    time: bigint;
    value: bigint;
    result: bigint;

    static generate(): bigint {
        if (this.lastTime == 0) {
            this.lastTime = this.timeSinceEpoch();

            if (this.lastTime <= 0) {
                coreWarn(`${(new this).constructor.name}: lastTime less than 0: ${this.lastTime}`);
                this.lastTime = 1;
            }
        }

        let time = this.timeSinceEpoch();

        if (time > this.lastTime) {
            this.lastTime = time;
            this.idCount = 0;
        }
        else {
            ++this.idCount;

            if (this.idCount > powValueBit) {
                ++this.lastTime; // 借用下一秒
                this.idCount = 0;

                coreError(`${(new this).constructor.name}: idCount per sec overflow: ${time} ${this.lastTime}`);
            }
        }


        let struct = InstanceIdStruct.inst;
        struct.init(this.lastTime, this.idCount);

        return struct.result;
    }

    static convertToId(time: number, value: number): bigint {
        let id = InstanceIdStruct.inst.init(time, value).result;

        return id;
    }

    /**
     * convert id to 2 args
     * not reference return value
     * @param id bigint
     * @returns 
     */
    static parseId(id: bigint): InstanceIdStruct {
        return InstanceIdStruct.inst.initById(id);
    }

    private static timeSinceEpoch(): number {
        let a = (TimeInfo.getInst().clientNow() - epoch) / 1000;
        return Math.floor(a);
    }

    /**
     * convert id to 3 args
     * @param id bigint
     * @returns 
     */
    initById(id: bigint) {
        this.result = id;

        this.time = id & powTimeBit;
        id >>= timeBit;

        this.value = id & powValueBit;

        return this;
    }

    init(time: number, value: number) {
        this.time = BigInt(time);
        this.value = BigInt(value);

        this.updateResult();

        return this;
    }

    private updateResult() {
        this.result = this.value;

        this.result <<= timeBit;
        this.result |= this.time;
    }
}