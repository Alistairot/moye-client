import { TimeInfo } from "./TimeInfo";

export class TimeHelper {
    static readonly OneDay: number = 86400000;
    static readonly Hour: number = 3600000;
    static readonly Minute: number = 60000;

    static clientNow(): number {
        return TimeInfo.get().clientNow();
    }

    static clientNowSeconds(): number {
        return Math.floor(TimeHelper.clientNow() / 1000);
    }

    static serverNow(): number {
        return TimeInfo.get().serverNow();
    }
}
