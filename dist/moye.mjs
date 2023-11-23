import { _decorator, Component, director, SpriteFrame, Texture2D, instantiate, native, assetManager, UITransform, CCFloat, Size, NodeEventType, Enum, Vec3, Label, v3, dynamicAtlasManager, Sprite, SpriteAtlas, CCInteger, UIRenderer, cclegacy, InstanceMaterialType, RenderTexture, Material } from 'cc';
import { NATIVE, EDITOR, BUILD } from 'cc/env';

/**
 * 单例基类
 */
class Singleton {
    constructor() {
        this._isDisposed = false;
    }
    static get() {
        const self = this;
        if (self._inst == null) {
            throw new Error(`Singleton is not initialized or destroyed, name is ${self.name}`);
        }
        return self._inst;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    dispose() {
        this._onPreDestroy();
    }
    _onPreDestroy() {
        if (this._isDisposed) {
            return;
        }
        if (this.destroy) {
            this.destroy();
        }
        Singleton._inst = null;
        this._isDisposed = true;
    }
}

class TimeInfo extends Singleton {
    awake() {
        this.serverMinusClientTime = 0;
    }
    clientNow() {
        return Date.now();
    }
    serverNow() {
        return this.clientNow() + this.serverMinusClientTime;
    }
}

class JsHelper {
    static getMethodName() {
        const e = new Error();
        const str = e.stack.split("at ")[2];
        const endPos = str.indexOf(" ");
        return str.substring(0, endPos);
    }
    static getRootDirName(path) {
        return path.split("/")[0];
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    static isNullOrEmpty(str) {
        if (str == null) {
            return true;
        }
        if (str.length == 0) {
            return true;
        }
    }
    static getStringHashCode(str) {
        let hash = 5381;
        let i = str.length;
        while (i) {
            hash = (hash * 33) ^ str.charCodeAt(--i);
        }
        return hash >>> 0;
    }
    static modeString(str, mode) {
        const hash = this.getStringHashCode(str);
        const result = hash % mode;
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
    static formatStr(str, ...args) {
        // 开发阶段打印出错误
        if (typeof str != "string") {
            {
                const err = new Error('formatStr args[0] is not string');
                return err.name + err.stack;
            }
        }
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

class Options extends Singleton {
    constructor() {
        super(...arguments);
        /**
         * 是否是服务端
         */
        this.isServer = false;
        /**
         * log等级 越低输出信息越多
         * 不能控制框架层的输出
         */
        this.logLevel = 1;
        /**
         * 是否开发阶段
         */
        this.develop = true;
    }
}

class LoggerDefault {
    log(str) {
        console.log(str);
    }
    warn(str) {
        console.warn(str);
    }
    error(str) {
        console.error(str);
    }
}

/**
 * Logger
 */
class Logger extends Singleton {
    set iLog(value) {
        this._logInst = value;
    }
    get _iLog() {
        if (!this._logInst) {
            this._logInst = new LoggerDefault();
            this._logInst.warn('not set iLog, use default logger');
        }
        return this._logInst;
    }
    log(str, ...args) {
        if (this.checkLogLevel(Logger.LOG_LEVEL)) {
            const formatStr = JsHelper.formatStr(str, ...args);
            this._iLog.log(formatStr);
        }
    }
    warn(str, ...args) {
        if (this.checkLogLevel(Logger.WARN_LEVEL)) {
            const formatStr = JsHelper.formatStr(str, ...args);
            this._iLog.warn(formatStr);
        }
    }
    /**
     * 错误打印会带上堆栈 用于定位错误
     * 错误打印不会受到logLevel的影响 一定会打印
     * 非必要不要调用这个 特别是不要在在循环里面调用 否则日志文件两下就爆炸了
     * @param str
     * @param args
     */
    error(str, ...args) {
        const formatStr = JsHelper.formatStr(str, ...args);
        this._iLog.error(formatStr);
    }
    checkLogLevel(level) {
        return Options.get().logLevel <= level;
    }
    /**
     * 不受logLevel影响的log
     * @param str
     * @param args
     */
    coreLog(str) {
        this._iLog.log(str);
    }
    /**
     * 不受logLevel影响的log
     * @param str
     * @param args
     */
    coreWarn(str) {
        this._iLog.warn(str);
    }
    /**
     * 错误打印会带上堆栈 用于定位错误
     * 错误打印不会受到logLevel的影响 一定会打印
     * 非必要不要调用这个 特别是不要在在循环里面调用 否则日志文件两下就爆炸了
     * @param str
     * @param args
     */
    coreError(str) {
        this._iLog.error(str);
    }
}
Logger.LOG_LEVEL = 1;
Logger.WARN_LEVEL = 2;
/**
 * ```
 * log("hello {0}", "world") => hello world
 * log("hello {0} {1} {0}", "world1", "world2") => hello world1 world2 world1
 * log("hello {{qaq}} {0}", "world") => hello {qaq} world
 * ```
 * @param str
 * @param args
 */
function log(str, ...args) {
    Logger.get().log(str, ...args);
}
/**
 * ```
 * log("hello {0}", "world") => hello world
 * log("hello {0} {1} {0}", "world1", "world2") => hello world1 world2 world1
 * log("hello {{qaq}} {0}", "world") => hello {qaq} world
 * ```
 * @param str
 * @param args
 */
function warn(str, ...args) {
    Logger.get().warn(str, ...args);
}
/**
 * ```
 * log("hello {0}", "world") => hello world
 * log("hello {0} {1} {0}", "world1", "world2") => hello world1 world2 world1
 * log("hello {{qaq}} {0}", "world") => hello {qaq} world
 * ```
 * @param str
 * @param args
 */
function error(str, ...args) {
    Logger.get().error(str, ...args);
}

// 框架内部用这个log 区分外部的log 不进行导出
function coreLog(tag, str, ...args) {
    const formatStr = JsHelper.formatStr(str, ...args);
    const output = `[${tag}]: ${formatStr}`;
    try {
        const inst = Logger.get();
        inst.coreLog(output);
    }
    catch (e) {
        console.log(output);
    }
}
function coreWarn(tag, str, ...args) {
    const formatStr = JsHelper.formatStr(str, ...args);
    const output = `[${tag}]: ${formatStr}`;
    try {
        const inst = Logger.get();
        inst.coreWarn(output);
    }
    catch (e) {
        console.warn(output);
    }
}
function coreError(tag, str, ...args) {
    const formatStr = JsHelper.formatStr(str, ...args);
    const output = `[${tag}]: ${formatStr}`;
    try {
        const inst = Logger.get();
        inst.coreError(output);
    }
    catch (e) {
        console.error(output);
    }
}

const IdGeneratorTag = "IdGenerator";

/**
 * 可用时间 s
 * 34年
 */
const timeBit$1 = 30n;
/**
 * 最大进程数量
 * 16384
 */
const processBit = 14n;
/**
 * 每秒可以产生的数量
 * 100w/s
 */
const valueBit$1 = 20n;
const powTimeBit$1 = 2n ** timeBit$1 - 1n;
const powProcessBit = 2n ** processBit - 1n;
const powValueBit$1 = 2n ** valueBit$1 - 1n;
const epoch$1 = new Date(2023, 4, 1).getTime();
class IdStruct {
    static get inst() {
        if (IdStruct._inst == null) {
            IdStruct._inst = new IdStruct();
        }
        return IdStruct._inst;
    }
    static generate() {
        if (this._lastTime == 0) {
            this._lastTime = this.timeSinceEpoch();
            if (this._lastTime <= 0) {
                coreWarn(IdGeneratorTag, '{0}: lastTime less than 0: {1}', (new this).constructor.name, this._lastTime);
                this._lastTime = 1;
            }
        }
        const time = this.timeSinceEpoch();
        if (time > this._lastTime) {
            this._lastTime = time;
            this._idCount = 0;
        }
        else {
            ++this._idCount;
            if (this._idCount > powValueBit$1) {
                ++this._lastTime; // 借用下一秒
                this._idCount = 0;
                coreError(IdGeneratorTag, '{0}: idCount per sec overflow: {1} {2}', (new this).constructor.name, time, this._lastTime);
            }
        }
        const struct = IdStruct.inst;
        struct.init(this._lastTime, 1, this._idCount);
        return struct.result;
    }
    static convertToId(time, process, value) {
        const id = IdStruct.inst.init(time, process, value).result;
        return id;
    }
    /**
     * convert id to 3 args
     * not reference return value
     * @param id bigint
     * @returns
     */
    static parseId(id) {
        return IdStruct.inst.initById(id);
    }
    static timeSinceEpoch() {
        const a = (TimeInfo.get().clientNow() - epoch$1) / 1000;
        return Math.floor(a);
    }
    /**
     * convert id to 3 args
     * @param id bigint
     * @returns
     */
    initById(id) {
        this.result = id;
        this.time = id & powTimeBit$1;
        id >>= timeBit$1;
        this.process = id & powProcessBit;
        id >>= processBit;
        this.value = id & powValueBit$1;
        return this;
    }
    init(time, process, value) {
        this.time = BigInt(time);
        this.process = BigInt(process);
        this.value = BigInt(value);
        this.updateResult();
        return this;
    }
    updateResult() {
        this.result = this.value;
        this.result <<= processBit;
        this.result |= this.process;
        this.result <<= timeBit$1;
        this.result |= this.time;
    }
}
IdStruct._lastTime = 0;
IdStruct._idCount = 0;

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
class InstanceIdStruct {
    static get inst() {
        if (InstanceIdStruct._inst == null) {
            InstanceIdStruct._inst = new InstanceIdStruct();
        }
        return InstanceIdStruct._inst;
    }
    static generate() {
        if (this._lastTime == 0) {
            this._lastTime = this.timeSinceEpoch();
            if (this._lastTime <= 0) {
                coreWarn(IdGeneratorTag, '{0}: lastTime less than 0: {1}', (new this).constructor.name, this._lastTime);
                this._lastTime = 1;
            }
        }
        const time = this.timeSinceEpoch();
        if (time > this._lastTime) {
            this._lastTime = time;
            this._idCount = 0;
        }
        else {
            ++this._idCount;
            if (this._idCount > powValueBit) {
                ++this._lastTime; // 借用下一秒
                this._idCount = 0;
                coreError(IdGeneratorTag, '{0}: idCount per sec overflow: {1} {2}', (new this).constructor.name, time, this._lastTime);
            }
        }
        const struct = InstanceIdStruct.inst;
        struct.init(this._lastTime, this._idCount);
        return struct.result;
    }
    static convertToId(time, value) {
        const id = InstanceIdStruct.inst.init(time, value).result;
        return id;
    }
    /**
     * convert id to 2 args
     * not reference return value
     * @param id bigint
     * @returns
     */
    static parseId(id) {
        return InstanceIdStruct.inst.initById(id);
    }
    static timeSinceEpoch() {
        const a = (TimeInfo.get().clientNow() - epoch) / 1000;
        return Math.floor(a);
    }
    /**
     * convert id to 3 args
     * @param id bigint
     * @returns
     */
    initById(id) {
        this.result = id;
        this.time = id & powTimeBit;
        id >>= timeBit;
        this.value = id & powValueBit;
        return this;
    }
    init(time, value) {
        this.time = BigInt(time);
        this.value = BigInt(value);
        this.updateResult();
        return this;
    }
    updateResult() {
        this.result = this.value;
        this.result <<= timeBit;
        this.result |= this.time;
    }
}
InstanceIdStruct._lastTime = 0;
InstanceIdStruct._idCount = 0;

class IdGenerator extends Singleton {
    generateInstanceId() {
        return InstanceIdStruct.generate();
    }
    generateId() {
        return IdStruct.generate();
    }
}

class ObjectPool extends Singleton {
    constructor() {
        super(...arguments);
        this._pool = new Map;
    }
    fetch(type) {
        const queue = this._pool.get(type);
        if (!queue) {
            return new type();
        }
        if (queue.length === 0) {
            return new type();
        }
        return queue.shift();
    }
    recycle(obj) {
        const type = obj.constructor;
        let queue = this._pool.get(type);
        if (!queue) {
            queue = [];
            this._pool.set(type, queue);
        }
        if (queue.length > 1000) {
            // 报个警告 不进行缓存了
            console.warn(`pool ${type.name} is too large`);
            return;
        }
        queue.push(obj);
    }
}

class EntityCenter extends Singleton {
    constructor() {
        super(...arguments);
        this._allEntities = new Map;
    }
    add(entity) {
        this._allEntities.set(entity.instanceId, entity);
    }
    remove(instanceId) {
        this._allEntities.delete(instanceId);
    }
    get(instanceId) {
        const component = this._allEntities.get(instanceId);
        return component;
    }
}

var InstanceQueueIndex;
(function (InstanceQueueIndex) {
    InstanceQueueIndex[InstanceQueueIndex["NONE"] = -1] = "NONE";
    InstanceQueueIndex[InstanceQueueIndex["UPDATE"] = 0] = "UPDATE";
    InstanceQueueIndex[InstanceQueueIndex["LATE_UPDATE"] = 1] = "LATE_UPDATE";
    InstanceQueueIndex[InstanceQueueIndex["MAX"] = 2] = "MAX";
})(InstanceQueueIndex || (InstanceQueueIndex = {}));

/**
 * 管理实体组件的生命周期
 */
class EntityLifiCycleMgr extends Singleton {
    constructor() {
        super(...arguments);
        this._queues = new Array(InstanceQueueIndex.MAX);
    }
    awake() {
        for (let i = 0; i < this._queues.length; i++) {
            this._queues[i] = [];
        }
    }
    registerSystem(entity) {
        if (entity.update) {
            this._queues[InstanceQueueIndex.UPDATE].push(entity.instanceId);
        }
        if (entity.lateUpdate) {
            this._queues[InstanceQueueIndex.LATE_UPDATE].push(entity.instanceId);
        }
    }
    awakeComEvent(entity) {
        entity.awake();
    }
    destroyComEvent(entity) {
        entity.destroy();
    }
    update() {
        const queue = this._queues[InstanceQueueIndex.UPDATE];
        const entityCenter = EntityCenter.get();
        for (let i = queue.length - 1; i >= 0; i--) {
            const instanceId = queue[i];
            const entity = entityCenter.get(instanceId);
            if (!entity) {
                queue.splice(i, 1);
                continue;
            }
            if (entity.isDisposed) {
                queue.splice(i, 1);
                continue;
            }
            entity.update();
        }
    }
    lateUpdate() {
        const queue = this._queues[InstanceQueueIndex.LATE_UPDATE];
        const entityCenter = EntityCenter.get();
        for (let i = queue.length - 1; i >= 0; i--) {
            const instanceId = queue[i];
            const entity = entityCenter.get(instanceId);
            if (!entity) {
                queue.splice(i, 1);
                continue;
            }
            if (entity.isDisposed) {
                queue.splice(i, 1);
                continue;
            }
            entity.lateUpdate();
        }
    }
}

var EntityStatus;
(function (EntityStatus) {
    EntityStatus[EntityStatus["NONE"] = 0] = "NONE";
    EntityStatus[EntityStatus["IS_FROM_POOL"] = 1] = "IS_FROM_POOL";
    EntityStatus[EntityStatus["IS_REGISTER"] = 2] = "IS_REGISTER";
    EntityStatus[EntityStatus["IS_COMPONENT"] = 4] = "IS_COMPONENT";
    EntityStatus[EntityStatus["IS_CREATED"] = 8] = "IS_CREATED";
    EntityStatus[EntityStatus["IS_NEW"] = 16] = "IS_NEW";
})(EntityStatus || (EntityStatus = {}));
class Entity {
    constructor() {
        this._status = EntityStatus.NONE;
    }
    get parent() {
        return this._parent;
    }
    set parent(value) {
        if (value == null) {
            throw new Error(`cant set parent null: ${this.constructor.name}`);
        }
        if (value == this) {
            throw new Error(`cant set parent self: ${this.constructor.name}`);
        }
        if (value.domain == null) {
            throw new Error(`cant set parent because parent domain is null: ${this.constructor.name} ${value.constructor.name}`);
        }
        if (this._parent != null) // 之前有parent
         {
            // parent相同，不设置
            if (this._parent == value) {
                throw new Error(`重复设置了Parent: ${this.constructor.name} parent: ${this._parent.constructor.name}`);
            }
            this._parent.removeFromChildren(this);
        }
        this._parent = value;
        this.isComponent = false;
        this._parent.addToChildren(this);
        this.domain = this.parent.domain;
    }
    get domain() {
        return this._domain;
    }
    set domain(value) {
        if (value == null) {
            throw new Error(`domain cant set null: ${this.constructor.name}`);
        }
        if (this._domain == value) {
            return;
        }
        const preDomain = this._domain;
        this._domain = value;
        if (preDomain == null) {
            this.instanceId = IdGenerator.get().generateInstanceId();
            this.isRegister = true;
        }
        // 递归设置孩子的Domain
        if (this._children != null) {
            for (const [id, entity] of this._children.entries()) {
                entity.domain = this._domain;
            }
        }
        if (this._components != null) {
            for (const [type, component] of this._components.entries()) {
                component.domain = this._domain;
            }
        }
        if (!this.isCreated) {
            this.isCreated = true;
        }
    }
    get isDisposed() {
        return this.instanceId == 0n;
    }
    get children() {
        return this._children ?? (this._children = ObjectPool.get().fetch((Map)));
    }
    get components() {
        return this._components ?? (this._components = ObjectPool.get().fetch((Map)));
    }
    get isFromPool() {
        return (this._status & EntityStatus.IS_FROM_POOL) == EntityStatus.IS_FROM_POOL;
    }
    set isFromPool(value) {
        if (value) {
            this._status |= EntityStatus.IS_FROM_POOL;
        }
        else {
            this._status &= ~EntityStatus.IS_FROM_POOL;
        }
    }
    get isComponent() {
        return (this._status & EntityStatus.IS_COMPONENT) == EntityStatus.IS_COMPONENT;
    }
    set isComponent(value) {
        if (value) {
            this._status |= EntityStatus.IS_COMPONENT;
        }
        else {
            this._status &= ~EntityStatus.IS_COMPONENT;
        }
    }
    get isCreated() {
        return (this._status & EntityStatus.IS_CREATED) == EntityStatus.IS_CREATED;
    }
    set isCreated(value) {
        if (value) {
            this._status |= EntityStatus.IS_CREATED;
        }
        else {
            this._status &= ~EntityStatus.IS_CREATED;
        }
    }
    get isNew() {
        return (this._status & EntityStatus.IS_NEW) == EntityStatus.IS_NEW;
    }
    set isNew(value) {
        if (value) {
            this._status |= EntityStatus.IS_NEW;
        }
        else {
            this._status &= ~EntityStatus.IS_NEW;
        }
    }
    get isRegister() {
        return (this._status & EntityStatus.IS_REGISTER) == EntityStatus.IS_REGISTER;
    }
    set isRegister(value) {
        if (this.isRegister == value) {
            return;
        }
        if (value) {
            this._status |= EntityStatus.IS_REGISTER;
        }
        else {
            this._status &= ~EntityStatus.IS_REGISTER;
        }
        if (!value) {
            EntityCenter.get().remove(this.instanceId);
        }
        else {
            const self = this;
            EntityCenter.get().add(self);
            EntityLifiCycleMgr.get().registerSystem(self);
        }
    }
    set componentParent(value) {
        if (value == null) {
            throw new Error(`cant set parent null: ${this.constructor.name}`);
        }
        if (value == this) {
            throw new Error(`cant set parent self: ${this.constructor.name}`);
        }
        // 严格限制parent必须要有domain,也就是说parent必须在数据树上面
        if (value.domain == null) {
            throw new Error(`cant set parent because parent domain is null: ${this.constructor.name} ${value.constructor.name}`);
        }
        if (this.parent != null) // 之前有parent
         {
            // parent相同，不设置
            if (this.parent == value) {
                throw new Error(`重复设置了Parent: ${this.constructor.name} parent: ${this.parent.constructor.name}`);
            }
            this.parent.removeFromComponents(this);
        }
        this._parent = value;
        this.isComponent = true;
        this._parent.addToComponents(this);
        this.domain = this.parent.domain;
    }
    addCom(componentOrType, isFromPool) {
        if (componentOrType instanceof Entity) {
            return this.addComByEntity(componentOrType);
        }
        else {
            return this.addComByType(componentOrType, isFromPool);
        }
    }
    /**
     * if not exist com will add new
     * @param type
     * @returns
     */
    tryAddCom(type) {
        let com = this.getCom(type);
        if (com == null) {
            com = this.addCom(type);
        }
        return com;
    }
    addComByEntity(com) {
        const type = com.constructor;
        if (this._components != null && this._components.has(type)) {
            throw new Error(`entity already has component: ${type.name}`);
        }
        com.componentParent = this;
        return com;
    }
    addComByType(type, isFromPool = false) {
        if (this._components != null && this._components.has(type)) {
            throw new Error(`entity already has component: ${type.name}`);
        }
        const com = this.create(type, isFromPool);
        com.id = this.id;
        com.componentParent = this;
        if (com.awake) {
            EntityLifiCycleMgr.get().awakeComEvent(com);
        }
        return com;
    }
    addChild(entityOrType, isFromPool) {
        if (entityOrType instanceof Entity) {
            return this.addChildByEntity(entityOrType);
        }
        else {
            return this.addChildByType(entityOrType, isFromPool);
        }
    }
    addChildWithId(type, id, isFromPool = false) {
        const entity = this.create(type, isFromPool);
        entity.id = id;
        entity.parent = this;
        if (entity.awake) {
            EntityLifiCycleMgr.get().awakeComEvent(entity);
        }
        return entity;
    }
    addChildByEntity(entity) {
        entity.parent = this;
        return entity;
    }
    addChildByType(type, isFromPool = false) {
        const entity = this.create(type, isFromPool);
        entity.id = IdGenerator.get().generateId();
        entity.parent = this;
        if (entity.awake) {
            EntityLifiCycleMgr.get().awakeComEvent(entity);
        }
        return entity;
    }
    create(type, isFromPool) {
        let inst;
        if (isFromPool) {
            inst = ObjectPool.get().fetch(type);
        }
        else {
            inst = new type();
        }
        inst.isFromPool = isFromPool;
        inst.isCreated = true;
        inst.isNew = true;
        inst.id = 0n;
        return inst;
    }
    removeFromChildren(entity) {
        if (this._children == null) {
            return;
        }
        this._children.delete(entity.id);
        if (this._children.size == 0) {
            ObjectPool.get().recycle(this._children);
            this._children = null;
        }
    }
    removeFromComponents(component) {
        if (this._components == null) {
            return;
        }
        this._components.delete(component.constructor);
        if (this._components.size == 0) {
            ObjectPool.get().recycle(this._components);
            this._components = null;
        }
    }
    addToComponents(component) {
        this.components.set(component.constructor, component);
    }
    addToChildren(entity) {
        if (this.children.has(entity.id)) {
            throw new Error(`entity already has child: ${entity.id}`);
        }
        this.children.set(entity.id, entity);
    }
    getCom(type) {
        if (this._components == null) {
            return null;
        }
        const component = this._components.get(type);
        if (!component) {
            return null;
        }
        return component;
    }
    removeCom(type) {
        if (this.isDisposed) {
            return;
        }
        if (this._components == null) {
            return;
        }
        const com = this.getCom(type);
        if (com == null) {
            return;
        }
        this.removeFromComponents(com);
        com.dispose();
    }
    getParent(type) {
        return this.parent;
    }
    getChild(type, id) {
        if (this._children == null) {
            return null;
        }
        const child = this._children.get(id);
        return child;
    }
    removeChild(id) {
        if (this._children == null) {
            return;
        }
        const child = this._children.get(id);
        if (!child) {
            return;
        }
        this._children.delete(id);
        child.dispose();
    }
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.isRegister = false;
        this.instanceId = 0n;
        // 清理Children
        if (this._children != null) {
            for (const [id, entity] of this._children.entries()) {
                entity.dispose();
            }
            this._children.clear();
            ObjectPool.get().recycle(this._children);
            this._children = null;
        }
        // 清理Component
        if (this._components != null) {
            for (const [entityCtor, entity] of this._components.entries()) {
                entity.dispose();
            }
            this._components.clear();
            ObjectPool.get().recycle(this._components);
            this._components = null;
        }
        // 触发Destroy事件
        if (this.destroy) {
            EntityLifiCycleMgr.get().destroyComEvent(this);
        }
        this._domain = null;
        if (this._parent != null && !this._parent.isDisposed) {
            if (this.isComponent) {
                this._parent.removeCom(this.getType());
            }
            else {
                this._parent.removeFromChildren(this);
            }
        }
        this._parent = null;
        if (this.isFromPool) {
            ObjectPool.get().recycle(this);
        }
        this._status = EntityStatus.NONE;
    }
    domainScene() {
        return this.domain;
    }
    getType() {
        return this.constructor;
    }
}

class Scene extends Entity {
    set domain(value) {
        this._domain = value;
    }
    get domain() {
        return this._domain;
    }
    set parent(value) {
        if (value == null) {
            return;
        }
        this._parent = value;
        this._parent.children.set(this.id, this);
    }
    init(args) {
        this.id = args.id;
        this.instanceId = args.instanceId;
        this.sceneType = args.sceneType;
        this.name = args.name;
        this.parent = args.parent;
        this.isCreated = true;
        this.isNew = true;
        this.domain = this;
        this.isRegister = true;
        coreLog('scene', 'scene create sceneType = {0}, name = {1}, id = {2}', this.sceneType, this.name, this.id);
    }
}

var SceneType;
(function (SceneType) {
    SceneType["NONE"] = "NONE";
    SceneType["PROCESS"] = "PROCESS";
    SceneType["CLIENT"] = "CLIENT";
    SceneType["CURRENT"] = "CURRENT";
})(SceneType || (SceneType = {}));

/**
 * 可回收对象
 */
class RecycleObj {
    constructor() {
        this._isRecycle = false;
    }
    /**
     * 通过对象池创建
     * @param this
     * @param values
     * @returns
     */
    static create(values) {
        const event = ObjectPool.get().fetch(this);
        if (values) {
            Object.assign(event, values);
        }
        event._isRecycle = true;
        return event;
    }
    /**
     * 如果是通过create方法创建的
     * 那么dispose会回收到对象池
     */
    dispose() {
        if (this._isRecycle) {
            ObjectPool.get().recycle(this);
        }
    }
}

/**
 * 事件基类
 */
class AEvent extends RecycleObj {
}

/**
 * before singleton add
 *
 * NOTE: scene is null
 */
class BeforeSingletonAdd extends AEvent {
}
/**
 * after singleton add
 *
 * NOTE: scene is null
 */
class AfterSingletonAdd extends AEvent {
}
/**
 * before program init
 *
 * NOTE: scene is null
 */
class BeforeProgramInit extends AEvent {
}
/**
 * after program init
 *
 * NOTE: scene is null
 */
class AfterProgramInit extends AEvent {
}
/**
 * before program start
 *
 * NOTE: scene is null
 */
class BeforeProgramStart extends AEvent {
}
/**
 * after program start,
 * you can listen this event and start your game logic
 *
 * NOTE: scene is null
 */
class AfterProgramStart extends AEvent {
}
/**
 * 创建ClientScene后
 */
class AfterCreateClientScene extends AEvent {
}
/**
 * 创建CurrentScene后
 */
class AfterCreateCurrentScene extends AEvent {
}

class DecoratorCollector {
    constructor() {
        this._decorators = new Map;
    }
    static get inst() {
        if (DecoratorCollector._inst == null) {
            DecoratorCollector._inst = new DecoratorCollector;
        }
        return DecoratorCollector._inst;
    }
    add(decoratorType, ...args) {
        let array = this._decorators.get(decoratorType);
        if (!array) {
            array = [];
            this._decorators.set(decoratorType, array);
        }
        array.push(args);
    }
    get(decoratorType) {
        const array = this._decorators.get(decoratorType);
        return array || [];
    }
}

const EventDecoratorType = "EventDecoratorType";
/**
 * 事件装饰器
 * @param event
 * @param sceneType
 * @returns
 */
function EventDecorator(event, sceneType) {
    return function (target) {
        {
            if (sceneType == null) {
                console.error(`EventDecorator必须要传 sceneType`);
            }
        }
        DecoratorCollector.inst.add(EventDecoratorType, event, target, sceneType);
    };
}

class EventInfo {
    constructor(handler, sceneType) {
        this.eventHandler = handler;
        this.sceneType = sceneType;
    }
}

/**
 * cache all event
 */
class MoyeEventCenter {
    constructor() {
        this.allEvents = new Map;
    }
    static get inst() {
        if (this._inst == null) {
            this._inst = new MoyeEventCenter();
            this._inst.reloadEvent();
        }
        return this._inst;
    }
    reloadEvent() {
        const argsList = DecoratorCollector.inst.get(EventDecoratorType);
        this.allEvents.clear();
        for (const args of argsList) {
            const eventType = args[0];
            const handlerType = args[1];
            const sceneType = args[2];
            let list = this.allEvents.get(eventType);
            if (!list) {
                list = [];
                this.allEvents.set(eventType, list);
            }
            list.push(new EventInfo(new handlerType(), sceneType));
        }
    }
    publish(event) {
        const list = this.allEvents.get(event.constructor);
        if (!list) {
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const eventInfo = list[i];
            const handler = eventInfo.eventHandler;
            handler.handle(null, event);
        }
        event.dispose();
    }
}

class Task extends Promise {
    /**
     * 创建一个新的task
     * @param type
     * @returns
     */
    static create(type) {
        let resolveVar;
        const task = new Task((resolve) => {
            resolveVar = resolve;
        });
        task._resolve = resolveVar;
        return task;
    }
    setResult(result) {
        if (!this._resolve) {
            throw new Error(`setResult but task has been disposed`);
        }
        this._resolve(result);
        this.dispose();
    }
    /**
     * 不允许直接new
     * @param executor
     */
    constructor(executor) {
        super(executor);
    }
    dispose() {
        this._resolve = null;
    }
}

class Game {
    static addSingleton(singletonType, isNotify = true) {
        if (Game._singletonMap.has(singletonType)) {
            throw new Error(`already exist singleton: ${singletonType.name}`);
        }
        if (isNotify) {
            MoyeEventCenter.inst.publish(BeforeSingletonAdd.create({ singletonType: singletonType }));
        }
        const singleton = new singletonType();
        singletonType['_inst'] = singleton;
        Game._singletonMap.set(singletonType, singleton);
        Game._singletons.push(singleton);
        const inst = singleton;
        if (inst.awake) {
            inst.awake();
        }
        Game._destroys.push(inst);
        if (inst.update) {
            Game._updates.push(inst);
        }
        if (inst.lateUpdate) {
            Game._lateUpdates.push(inst);
        }
        if (isNotify) {
            MoyeEventCenter.inst.publish(AfterSingletonAdd.create({ singletonType: singletonType }));
        }
        return singleton;
    }
    static async waitFrameFinish() {
        const task = Task.create();
        Game._frameFinishTaskQueue.push(task);
        await task;
    }
    static update() {
        for (let index = 0; index < Game._updates.length; index++) {
            const update = Game._updates[index];
            const singleton = update;
            if (singleton.isDisposed) {
                continue;
            }
            update.update();
        }
    }
    static lateUpdate() {
        for (let index = 0; index < Game._lateUpdates.length; index++) {
            const lateUpdate = Game._lateUpdates[index];
            const singleton = lateUpdate;
            if (singleton.isDisposed) {
                continue;
            }
            lateUpdate.lateUpdate();
        }
    }
    static frameFinishUpdate() {
        const len = Game._frameFinishTaskQueue.length;
        if (len == 0) {
            return;
        }
        for (let index = 0; index < len; index++) {
            const task = Game._frameFinishTaskQueue[index];
            task.setResult();
        }
        Game._frameFinishTaskQueue = [];
    }
    static dispose() {
        for (let index = Game._singletons.length - 1; index >= 0; index--) {
            const inst = Game._singletons[index];
            if (inst.isDisposed) {
                continue;
            }
            inst._onPreDestroy();
        }
    }
}
Game._singletonMap = new Map;
Game._singletons = [];
Game._destroys = [];
Game._updates = [];
Game._lateUpdates = [];
Game._frameFinishTaskQueue = [];

class EventSystem extends Singleton {
    async publishAsync(scene, eventType) {
        const list = MoyeEventCenter.inst.allEvents.get(eventType.constructor);
        if (!list) {
            return;
        }
        const tasks = [];
        for (let i = 0; i < list.length; i++) {
            const eventInfo = list[i];
            if (eventInfo.sceneType != scene.sceneType && eventInfo.sceneType != "None") {
                continue;
            }
            tasks.push(eventInfo.eventHandler.handleAsync(scene, eventType));
        }
        await Promise.all(tasks);
        eventType.dispose();
    }
    /**
     * 一定要确保事件处理函数不是异步方法
     * 否则会导致事件处理顺序不一致和错误无法捕获
     * @param scene
     * @param eventType
     * @returns
     */
    publish(scene, eventType) {
        const list = MoyeEventCenter.inst.allEvents.get(eventType.constructor);
        if (!list) {
            return;
        }
        for (let i = 0; i < list.length; i++) {
            const eventInfo = list[i];
            if (eventInfo.sceneType != scene.sceneType && eventInfo.sceneType != "None") {
                continue;
            }
            eventInfo.eventHandler.handle(scene, eventType);
        }
        eventType.dispose();
    }
}

var __decorate$4 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const { ccclass: ccclass$3, property: property$3 } = _decorator;
let MoyeRuntime = class MoyeRuntime extends Component {
    start() {
        director.addPersistRootNode(this.node);
    }
    update(dt) {
        Game.update();
    }
    lateUpdate(dt) {
        Game.lateUpdate();
        Game.frameFinishUpdate();
    }
    onDestroy() {
        Game.dispose();
    }
};
MoyeRuntime = __decorate$4([
    ccclass$3('MoyeRuntime')
], MoyeRuntime);

/**
 * 保存根节点
 */
class Root extends Singleton {
    get scene() {
        return this._scene;
    }
    awake() {
        const scene = new Scene();
        scene.init({
            id: 0n,
            sceneType: SceneType.PROCESS,
            name: "Process",
            instanceId: IdGenerator.get().generateInstanceId(),
        });
        this._scene = scene;
    }
}

class TimeHelper {
    static clientNow() {
        return TimeInfo.get().clientNow();
    }
    static clientNowSeconds() {
        return Math.floor(TimeHelper.clientNow() / 1000);
    }
    static serverNow() {
        return TimeInfo.get().serverNow();
    }
}
TimeHelper.OneDay = 86400000;
TimeHelper.Hour = 3600000;
TimeHelper.Minute = 60000;

var TimerType;
(function (TimerType) {
    TimerType[TimerType["ONCE"] = 0] = "ONCE";
    TimerType[TimerType["REPEAT"] = 1] = "REPEAT";
})(TimerType || (TimerType = {}));
class Timer {
    static create() {
        const timer = ObjectPool.get().fetch(Timer);
        timer.reset();
        timer.id = Timer.getId();
        return timer;
    }
    static getId() {
        return ++this._idGenerator;
    }
    reset() {
        this.cb = null;
        this.tcs = null;
        this.id = 0;
        this.expireTime = 0;
        this.interval = 0;
    }
    dispose() {
        this.reset();
        ObjectPool.get().recycle(this);
    }
}
Timer._idGenerator = 1000;

class TimerMgr extends Singleton {
    constructor() {
        super(...arguments);
        this._timerMap = new Map;
        this._timers = [];
    }
    /**
     * 不断重复的定时器
     * @param interval ms
     * @param callback
     * @param immediately 是否立即执行
     * @returns
     */
    newRepeatedTimer(interval, callback, immediately = false) {
        const timer = Timer.create();
        timer.type = TimerType.REPEAT;
        timer.cb = callback;
        timer.interval = interval;
        timer.expireTime = interval + TimeHelper.clientNow();
        this._timerMap.set(timer.id, timer);
        this._timers.push(timer);
        return timer.id;
    }
    /**
     *
     * @param timeout ms
     * @param callback
     * @returns
     */
    newOnceTimer(timeout, callback) {
        const timer = Timer.create();
        timer.type = TimerType.ONCE;
        timer.cb = callback;
        timer.expireTime = timeout + TimeHelper.clientNow();
        this._timerMap.set(timer.id, timer);
        this._timers.push(timer);
        return timer.id;
    }
    newFrameTimer(callback) {
        const timer = Timer.create();
        timer.type = TimerType.REPEAT;
        timer.cb = callback;
        timer.interval = 1;
        timer.expireTime = timer.interval + TimeHelper.clientNow();
        this._timerMap.set(timer.id, timer);
        this._timers.push(timer);
        return timer.id;
    }
    remove(id) {
        const timer = this._timerMap.get(id);
        if (!timer) {
            return false;
        }
        timer.id = 0;
        this._timerMap.delete(id);
        return true;
    }
    /**
     * 浏览器上会有一个问题
     * 就是cocos的update后台不执行,但是js脚本依然执行，导致大量的timer没回收
     * 暂时不处理这个问题 应该没什么影响
     */
    update() {
        const nowTime = TimeHelper.clientNow();
        for (let i = this._timers.length - 1; i >= 0; i--) {
            const timer = this._timers[i];
            if (timer.id == 0) {
                this._timers.splice(i, 1);
                timer.dispose();
                continue;
            }
            if (timer.expireTime > nowTime) {
                continue;
            }
            if (timer.cb != null) {
                timer.cb();
            }
            if (timer.tcs != null) {
                timer.tcs.setResult();
            }
            if (timer.type == TimerType.REPEAT) {
                timer.expireTime += timer.interval;
            }
            else {
                this.remove(timer.id);
                continue;
            }
        }
    }
    /**
     *
     * @param time ms
     * @param cancellationToken
     * @returns
     */
    async waitAsync(time, cancellationToken) {
        if (time <= 0) {
            return;
        }
        const tcs = Task.create();
        const timer = Timer.create();
        timer.type = TimerType.ONCE;
        timer.tcs = tcs;
        timer.expireTime = time + TimeHelper.clientNow();
        this._timerMap.set(timer.id, timer);
        this._timers.push(timer);
        let cancelAction;
        if (cancellationToken) {
            cancelAction = () => {
                if (this.remove(timer.id)) {
                    tcs.setResult();
                }
            };
            cancellationToken.add(cancelAction);
        }
        try {
            await tcs;
        }
        finally {
            cancellationToken?.remove(cancelAction);
            cancelAction = null;
        }
    }
}

const CoroutineLockTag = 'CoroutineLock';
class CoroutineLockItem {
    init(key) {
        this.key = key;
        this.task = Task.create();
        // 开发阶段进行检查 60s还没解锁一般都是bug了
        if (Options.get().develop) {
            this.setTimeout(60 * 1000, 'CoroutineLock timeout');
        }
    }
    /**
     * timeout tips
     * @param timeout ms
     * @param info
     * @returns
     */
    setTimeout(timeout, info) {
        this.deleteTimeout();
        this._timerId = TimerMgr.get().newOnceTimer(timeout, this.timeout.bind(this));
        this._timeoutInfo = info;
    }
    deleteTimeout() {
        if (this._timerId == null) {
            return;
        }
        TimerMgr.get().remove(this._timerId);
        this._timerId = null;
    }
    async timeout() {
        coreWarn(CoroutineLockTag, 'CoroutineLock timeout key: {0}, info: {1}', this.key, this._timeoutInfo);
    }
    dispose() {
        if (this.key == null) {
            coreWarn(CoroutineLockTag, 'repeat dispose CoroutineLockItem');
            return;
        }
        this.deleteTimeout();
        CoroutineLock.get().runNextLock(this);
        this.key = null;
        this.task = null;
    }
}
class CoroutineLock extends Singleton {
    constructor() {
        super(...arguments);
        this._lockMap = new Map;
    }
    async wait(lockType, key) {
        const newKey = `${lockType}_${key}`;
        let lockSet = this._lockMap.get(newKey);
        if (!lockSet) {
            lockSet = new Set;
            this._lockMap.set(newKey, lockSet);
        }
        const lock = ObjectPool.get().fetch(CoroutineLockItem);
        lock.init(newKey);
        lockSet.add(lock);
        if (lockSet.size > 1) {
            await lock.task;
        }
        else {
            lock.task.setResult();
        }
        return lock;
    }
    runNextLock(lock) {
        const lockSet = this._lockMap.get(lock.key);
        lockSet.delete(lock);
        ObjectPool.get().recycle(lock);
        for (const nextLock of Array.from(lockSet.values())) {
            nextLock.task.setResult();
            break;
        }
    }
}

/**
 * manage client scene
 */
class SceneRefCom extends Entity {
}

class SceneFactory {
    static createClientScene() {
        const parent = Root.get().scene.getCom(SceneRefCom);
        parent.scene?.dispose();
        const scene = new Scene();
        scene.init({
            id: 1n,
            sceneType: SceneType.CLIENT,
            name: "Game",
            instanceId: IdGenerator.get().generateInstanceId(),
            parent: parent
        });
        scene.addCom(SceneRefCom);
        parent.scene = scene;
        EventSystem.get().publish(scene, AfterCreateClientScene.create());
        return scene;
    }
    static createCurrentScene(id, name) {
        const clientSceneRef = Root.get().scene.getCom(SceneRefCom);
        const clientScene = clientSceneRef.scene;
        const parent = clientScene.getCom(SceneRefCom);
        parent.scene?.dispose();
        const scene = new Scene();
        scene.init({
            id: id,
            sceneType: SceneType.CURRENT,
            name: name,
            instanceId: IdGenerator.get().generateInstanceId(),
            parent: parent
        });
        parent.scene = scene;
        EventSystem.get().publish(scene, AfterCreateCurrentScene.create());
        return scene;
    }
}

class Program {
    static init(rootNode) {
        MoyeEventCenter.inst.publish(new BeforeProgramInit());
        Game.addSingleton(ObjectPool, false);
        Game.addSingleton(Options);
        Game.addSingleton(Logger);
        Game.addSingleton(EventSystem);
        Game.addSingleton(TimeInfo);
        Game.addSingleton(TimerMgr);
        Game.addSingleton(CoroutineLock);
        Game.addSingleton(IdGenerator);
        Game.addSingleton(EntityCenter);
        Game.addSingleton(EntityLifiCycleMgr);
        Game.addSingleton(Root);
        // add client runtime
        rootNode.addComponent(MoyeRuntime);
        MoyeEventCenter.inst.publish(new AfterProgramInit());
    }
    /**
     * 确保所有脚本已经加载之后调用start
     */
    static start() {
        // when loaded new scripts, need reload event
        MoyeEventCenter.inst.reloadEvent();
        MoyeEventCenter.inst.publish(new BeforeProgramStart());
        MoyeEventCenter.inst.publish(new AfterProgramStart());
        // create client scene
        Root.get().scene.addCom(SceneRefCom);
        SceneFactory.createClientScene();
    }
}

/**
 * 这个方法执行一个promise，如果promise出现异常，会打印异常信息
 * @param promise
 * @returns
 */
async function safeCall(promise) {
    try {
        return await promise;
    }
    catch (e) {
        coreError('safeCall', e);
    }
}

const EventHandlerTag = 'EventHandler';
class AEventHandler {
    async handleAsync(scene, a) {
        try {
            await this.run(scene, a);
        }
        catch (e) {
            coreError(EventHandlerTag, e);
        }
    }
    handle(scene, a) {
        try {
            const ret = this.run(scene, a);
            if (ret instanceof Promise) {
                coreWarn(EventHandlerTag, '{0}的run方法是异步的, 请尽量不要用publish来通知', this.constructor.name);
                safeCall(ret);
            }
        }
        catch (e) {
            coreError(EventHandlerTag, e);
        }
    }
}

const CancellationTokenTag = "CancellationToken";
/**
 * cancel token
 */
class CancellationToken {
    constructor() {
        this._actions = new Set();
    }
    /**
     * add one cancel action
     * @param callback 添加取消动作
     * @returns
     */
    add(callback) {
        if (callback == null) {
            coreError(CancellationTokenTag, 'CancellationToken add error, callback is null');
            return;
        }
        this._actions.add(callback);
    }
    remove(callback) {
        this._actions.delete(callback);
    }
    /**
     * 执行取消动作
     * @returns
     */
    cancel() {
        if (this._actions == null) {
            coreError(CancellationTokenTag, 'CancellationToken cancel error, repeat cancel');
            return;
        }
        this.invoke();
    }
    isCancel() {
        return this._actions == null;
    }
    invoke() {
        const runActions = this._actions;
        this._actions = null;
        try {
            for (const action of runActions) {
                action();
            }
            runActions.clear();
        }
        catch (e) {
            coreError(CancellationTokenTag, e);
        }
    }
}

class AssetInfo {
    init(assetType, location) {
        location = this.parseLocation(assetType, location);
        const strs = location.split("/");
        let assetPath = '';
        for (let i = 1; i < strs.length; i++) {
            assetPath += strs[i];
            if (i != strs.length - 1) {
                assetPath += "/";
            }
        }
        this.bundleName = strs[0];
        this.assetPath = assetPath;
        this.assetType = assetType;
        this.uuid = `${location}.${assetType.name}`;
    }
    parseLocation(assetType, location) {
        if (assetType.name == SpriteFrame.name) {
            if (!location.endsWith("spriteFrame")) {
                location += '/spriteFrame';
            }
        }
        else if (assetType.name == Texture2D.name) {
            if (!location.endsWith("texture")) {
                location += '/texture';
            }
        }
        return location;
    }
}

class AssetSystem {
    constructor() {
        this._waitLoads = [];
        this._loadingSet = new Set;
        this._frameAddCount = 0;
    }
    update() {
        this._frameAddCount = 0;
        this.updateLoadingSet();
    }
    addProvider(provider) {
        this._waitLoads.push(provider);
        this.updateLoadingSet();
    }
    updateLoadingSet() {
        // 这一帧添加的到达上限
        if (this._frameAddCount >= AssetSystem._frameMaxAddQueueProvider) {
            return;
        }
        // 同时加载的到达上限
        if (this._loadingSet.size >= AssetSystem._maxLoadingProvider) {
            return;
        }
        // 没有需要加载的
        if (this._waitLoads.length == 0) {
            return;
        }
        const provider = this._waitLoads.shift();
        this._loadingSet.add(provider);
        provider.internalLoad();
    }
    removeProvider(provider) {
        this._loadingSet.delete(provider);
        this.updateLoadingSet();
    }
}
/**
 * 同时加载的最大数量
 */
AssetSystem._maxLoadingProvider = 1;
/**
 * 每一帧最多添加几个到加载列表
 */
AssetSystem._frameMaxAddQueueProvider = 1;

const MoyeAssetTag = "MoyeAsset";

class AssetOperationHandle {
    constructor() {
        this.isDisposed = false;
    }
    getAsset(assetType) {
        return this.provider.asset;
    }
    dispose() {
        if (this.isDisposed) {
            coreError(MoyeAssetTag, '重复销毁AssetOperationHandle');
            return;
        }
        this.isDisposed = true;
        this.provider.releaseHandle(this);
    }
    instantiateSync() {
        const node = instantiate(this.provider.asset);
        return node;
    }
    async instantiateAsync() {
        const node = instantiate(this.provider.asset);
        return node;
    }
}

class BundleAssetProvider {
    constructor() {
        this.refCount = 0;
        this._handleSet = new Set;
    }
    async internalLoad() {
        const assetPath = this.assetInfo.assetPath;
        const assetType = this.assetInfo.assetType;
        this.bundleAsset.bundle.load(assetPath, assetType, (err, asset) => {
            if (err) {
                coreError(MoyeAssetTag, '加载资源错误:{0},{1}', this.assetInfo.uuid, err);
            }
            else {
                this.asset = asset;
            }
            this._task.setResult();
            this.assetSystem.removeProvider(this);
        });
    }
    async load() {
        this._task = Task.create();
        this.assetSystem.addProvider(this);
        await this._task;
    }
    createHandle() {
        // 引用计数增加
        this.refCount++;
        const handle = new AssetOperationHandle;
        handle.provider = this;
        this._handleSet.add(handle);
        return handle;
    }
    releaseHandle(handle) {
        if (this.refCount <= 0) {
            coreWarn(MoyeAssetTag, "Asset provider reference count is already zero. There may be resource leaks !");
        }
        if (this._handleSet.delete(handle) == false) {
            coreError(MoyeAssetTag, "Should never get here !");
        }
        // 引用计数减少
        this.refCount--;
    }
}

var AssetLockType;
(function (AssetLockType) {
    AssetLockType["BUNDLE_ASSET_LOAD"] = "bundle_asset_load";
    AssetLockType["BUNDLE_LOAD"] = "bundle_load";
})(AssetLockType || (AssetLockType = {}));

class BundleAsset {
    constructor() {
        this.refCount = 0;
        this.isAutoRelease = true;
        this._providerMap = new Map;
    }
    async loadAssetAsync(assetInfo) {
        let provider = this._providerMap.get(assetInfo.uuid);
        if (!provider) {
            provider = await this.createProvider(assetInfo);
        }
        const handle = provider.createHandle();
        return handle;
    }
    async createProvider(assetInfo) {
        const lock = await CoroutineLock.get().wait(AssetLockType.BUNDLE_ASSET_LOAD, assetInfo.uuid);
        try {
            let provider = this._providerMap.get(assetInfo.uuid);
            if (provider) {
                return provider;
            }
            provider = new BundleAssetProvider;
            provider.assetInfo = assetInfo;
            provider.assetSystem = this.assetSystem;
            provider.bundleAsset = this;
            this.refCount++;
            await provider.load();
            this._providerMap.set(assetInfo.uuid, provider);
            return provider;
        }
        finally {
            lock.dispose();
        }
    }
    unloadUnusedAssets() {
        for (const [key, provider] of this._providerMap) {
            if (provider.refCount != 0) {
                continue;
            }
            this.bundle.release(provider.assetInfo.assetPath, provider.assetInfo.assetType);
            this._providerMap.delete(key);
            this.refCount--;
        }
    }
}

class MoyeAssets extends Singleton {
    awake() {
        MoyeAssets.assetSystem = new AssetSystem;
    }
    update() {
        MoyeAssets.assetSystem.update();
    }
    static async loadAssetAsync(assetType, location) {
        try {
            const assetInfo = new AssetInfo();
            assetInfo.init(assetType, location);
            const bundleName = assetInfo.bundleName;
            let bundleAsset = MoyeAssets._bundleMap.get(bundleName);
            if (!bundleAsset) {
                bundleAsset = await this.loadBundleAsync(bundleName);
            }
            const assetOperationHandle = await bundleAsset.loadAssetAsync(assetInfo);
            return assetOperationHandle;
        }
        catch (e) {
            coreError(MoyeAssetTag, e);
        }
    }
    static async loadBundleAsync(bundleName) {
        const lock = await CoroutineLock.get().wait(AssetLockType.BUNDLE_LOAD, bundleName);
        try {
            let bundleAsset = MoyeAssets._bundleMap.get(bundleName);
            if (bundleAsset) {
                return bundleAsset;
            }
            const task = Task.create();
            if (!this._bundlePathMap.has(bundleName)) {
                this._bundlePathMap.set(bundleName, bundleName);
                if (NATIVE) {
                    const writePath = native.fileUtils.getWritablePath();
                    const bundlePath = `${writePath}hot/${bundleName}`;
                    if (native.fileUtils.isDirectoryExist(bundlePath)) {
                        this._bundlePathMap.set(bundleName, bundlePath);
                    }
                }
            }
            const bundlePath = this._bundlePathMap.get(bundleName);
            coreLog(MoyeAssetTag, '加载bundle: {0}', bundlePath);
            assetManager.loadBundle(bundlePath, (err, bundle) => {
                if (err) {
                    coreLog(MoyeAssetTag, '加载Bundle错误, bundle={0}, error={1}', bundleName, err);
                }
                else {
                    coreLog(MoyeAssetTag, '加载Bundle完成, bundle={0}', bundleName);
                }
                task.setResult(bundle);
            });
            const bundle = await task;
            bundleAsset = new BundleAsset;
            bundleAsset.bundle = bundle;
            bundleAsset.bundleName = bundleName;
            bundleAsset.assetSystem = MoyeAssets.assetSystem;
            MoyeAssets._bundleMap.set(bundleName, bundleAsset);
            return bundleAsset;
        }
        finally {
            lock.dispose();
        }
    }
    static releaseBundle(bundleAsset) {
        if (bundleAsset.refCount != 0) {
            coreError(MoyeAssetTag, '释放的bundle:{0}, 引用计数不为0', bundleAsset.bundleName);
            return;
        }
        this._bundleMap.delete(bundleAsset.bundleName);
        assetManager.removeBundle(bundleAsset.bundle);
        coreLog('卸载bundle:{0}', bundleAsset.bundleName);
    }
    static unloadUnusedAssets() {
        for (const [name, bundleAsset] of this._bundleMap) {
            bundleAsset.unloadUnusedAssets();
            if (bundleAsset.refCount != 0) {
                continue;
            }
            if (!bundleAsset.isAutoRelease) {
                continue;
            }
            MoyeAssets.releaseBundle(bundleAsset);
        }
    }
}
MoyeAssets._bundleMap = new Map();
MoyeAssets._bundlePathMap = new Map();

var __decorate$3 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
let AfterProgramInitHandler = class AfterProgramInitHandler extends AEventHandler {
    run(scene, args) {
        Game.addSingleton(MoyeAssets);
    }
};
AfterProgramInitHandler = __decorate$3([
    EventDecorator(AfterProgramInit, SceneType.NONE)
], AfterProgramInitHandler);

var __decorate$2 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const { ccclass: ccclass$2, property: property$2, menu: menu$2 } = _decorator;
let SizeFollow = class SizeFollow extends Component {
    constructor() {
        super(...arguments);
        this._heightFollow = true;
        this._widthFollow = true;
        this._heightOffset = 0;
        this._widthOffset = 0;
        this._changeSize = new Size();
    }
    get target() {
        return this._target;
    }
    set target(value) {
        this._target = value;
        this.updateSizeOffset();
    }
    set heightFollow(val) {
        this._heightFollow = val;
        this.updateSizeOffset();
    }
    get heightFollow() {
        return this._heightFollow;
    }
    set widthFollow(val) {
        this._widthFollow = val;
        this.updateSizeOffset();
    }
    get widthFollow() {
        return this._widthFollow;
    }
    onLoad() {
        if (this._target == null) {
            return;
        }
        this._target.node.on(NodeEventType.SIZE_CHANGED, this.onTargetSizeChange, this);
    }
    onDestroy() {
        if (this._target == null) {
            return;
        }
        if (!this._target.isValid) {
            this._target = null;
            return;
        }
        this._target.node.off(NodeEventType.SIZE_CHANGED, this.onTargetSizeChange, this);
        this._target = null;
    }
    onTargetSizeChange() {
        const selfTrans = this.node.getComponent(UITransform);
        const targetTrans = this._target;
        // console.log('onTargetSizeChange targetTrans', targetTrans);
        // console.log('onTargetSizeChange targetTrans.height', targetTrans.height);
        // console.log('onTargetSizeChange this._heightOffset', this._heightOffset);
        // console.log('onTargetSizeChange this._heightFollow', this._heightFollow);
        this._changeSize.set(selfTrans.contentSize);
        if (this._widthFollow) {
            this._changeSize.width = Math.max(0, targetTrans.width + this._widthOffset);
        }
        if (this._heightFollow) {
            this._changeSize.height = Math.max(0, targetTrans.height + this._heightOffset);
        }
        // console.log('onTargetSizeChange this._changeSize', this._changeSize);
        // console.log('onTargetSizeChange this.node', this.node);
        selfTrans.setContentSize(this._changeSize);
        // selfTrans.setContentSize(new Size(this._changeSize));
        // selfTrans.height = 300;
    }
    updateSizeOffset() {
        if (this._target == null) {
            return;
        }
        const selfTrans = this.node.getComponent(UITransform);
        const targetTrans = this._target;
        if (this._widthFollow) {
            const selfWidth = selfTrans.width;
            const targetWidth = targetTrans.width;
            this._widthOffset = selfWidth - targetWidth;
        }
        if (this._heightFollow) {
            const selfHeight = selfTrans.height;
            const targetHeight = targetTrans.height;
            this._heightOffset = selfHeight - targetHeight;
        }
    }
};
__decorate$2([
    property$2({ type: UITransform })
], SizeFollow.prototype, "target", null);
__decorate$2([
    property$2({ type: UITransform })
], SizeFollow.prototype, "_target", void 0);
__decorate$2([
    property$2
], SizeFollow.prototype, "heightFollow", null);
__decorate$2([
    property$2
], SizeFollow.prototype, "_heightFollow", void 0);
__decorate$2([
    property$2
], SizeFollow.prototype, "widthFollow", null);
__decorate$2([
    property$2
], SizeFollow.prototype, "_widthFollow", void 0);
__decorate$2([
    property$2({ type: CCFloat })
], SizeFollow.prototype, "_heightOffset", void 0);
__decorate$2([
    property$2({ type: CCFloat })
], SizeFollow.prototype, "_widthOffset", void 0);
SizeFollow = __decorate$2([
    ccclass$2('SizeFollow'),
    menu$2('moye/SizeFollow')
], SizeFollow);

var __decorate$1 = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const { ccclass: ccclass$1, property: property$1, executeInEditMode, menu: menu$1 } = _decorator;
var WidgetBase;
(function (WidgetBase) {
    WidgetBase[WidgetBase["LEFT"] = 1] = "LEFT";
    WidgetBase[WidgetBase["RIGHT"] = 2] = "RIGHT";
    WidgetBase[WidgetBase["TOP"] = 3] = "TOP";
    WidgetBase[WidgetBase["BOTTOM"] = 4] = "BOTTOM";
})(WidgetBase || (WidgetBase = {}));
var WidgetDirection;
(function (WidgetDirection) {
    WidgetDirection[WidgetDirection["LEFT"] = 1] = "LEFT";
    WidgetDirection[WidgetDirection["RIGHT"] = 2] = "RIGHT";
    WidgetDirection[WidgetDirection["TOP"] = 3] = "TOP";
    WidgetDirection[WidgetDirection["BOTTOM"] = 4] = "BOTTOM";
    WidgetDirection[WidgetDirection["LEFT_EXTEND"] = 5] = "LEFT_EXTEND";
    WidgetDirection[WidgetDirection["RIGHT_EXTEND"] = 6] = "RIGHT_EXTEND";
    WidgetDirection[WidgetDirection["TOP_EXTEND"] = 7] = "TOP_EXTEND";
    WidgetDirection[WidgetDirection["BOTTOM_EXTEND"] = 8] = "BOTTOM_EXTEND";
})(WidgetDirection || (WidgetDirection = {}));
/**
 * 关联组件
 * 不允许直系亲属互相关联
 * 同父支持size跟pos关联
 * 异父仅支持pos关联 size关联未做测试
 */
let CTWidget = class CTWidget extends Component {
    constructor() {
        super(...arguments);
        this._targetDir = WidgetDirection.TOP;
        this._dir = WidgetDirection.TOP;
        this.visibleOffset = 0;
        this._isVertical = true;
        this._distance = 0;
        this._changePos = new Vec3(0, 0, 0);
        this._targetOldPos = new Vec3(0, 0, 0);
        this._targetOldSize = 0;
        this._selfOldPos = new Vec3(0, 0, 0);
        this._selfOldSize = 0;
    }
    get target() {
        return this._target;
    }
    set target(value) {
        this._target = value;
        this.unregisterEvt();
        this.registerEvt();
        this.updateData();
    }
    // 目标方向
    set targetDir(val) {
        if (!EDITOR) {
            return;
        }
        if (val == WidgetDirection.LEFT ||
            val == WidgetDirection.RIGHT) {
            switch (this._dir) {
                case WidgetDirection.TOP:
                case WidgetDirection.TOP_EXTEND:
                case WidgetDirection.BOTTOM:
                case WidgetDirection.BOTTOM_EXTEND:
                    this._dir = WidgetDirection.LEFT;
            }
            this._isVertical = false;
        }
        else {
            switch (this._dir) {
                case WidgetDirection.LEFT:
                case WidgetDirection.LEFT_EXTEND:
                case WidgetDirection.RIGHT:
                case WidgetDirection.RIGHT_EXTEND:
                    this._dir = WidgetDirection.TOP;
            }
            this._isVertical = true;
        }
        this._targetDir = val;
        this.updateData();
    }
    get targetDir() {
        return this._targetDir;
    }
    // 自身方向
    set dir(val) {
        if (!EDITOR) {
            return;
        }
        switch (val) {
            case WidgetDirection.LEFT:
            case WidgetDirection.LEFT_EXTEND:
            case WidgetDirection.RIGHT:
            case WidgetDirection.RIGHT_EXTEND: {
                switch (this._targetDir) {
                    case WidgetDirection.TOP:
                    case WidgetDirection.BOTTOM:
                        {
                            this._targetDir = WidgetDirection.LEFT;
                        }
                        break;
                }
                this._isVertical = false;
                break;
            }
            case WidgetDirection.TOP:
            case WidgetDirection.TOP_EXTEND:
            case WidgetDirection.BOTTOM:
            case WidgetDirection.BOTTOM_EXTEND: {
                switch (this._targetDir) {
                    case WidgetDirection.LEFT:
                    case WidgetDirection.RIGHT:
                        {
                            this._targetDir = WidgetDirection.TOP;
                        }
                        break;
                }
                this._isVertical = true;
                break;
            }
        }
        this._dir = val;
        this.updateData();
    }
    get dir() {
        return this._dir;
    }
    onEnable() {
        if (!EDITOR) {
            return;
        }
        this.registerEvt();
        this.updateData();
    }
    onDisable() {
        if (!EDITOR) {
            return;
        }
        this.unregisterEvt();
    }
    onLoad() {
        this._trans = this.node.getComponent(UITransform);
        if (EDITOR) {
            return;
        }
        this.registerEvt();
    }
    onDestroy() {
        if (EDITOR) {
            return;
        }
        this.unregisterEvt();
        this._trans = null;
        this._target = null;
        this._changePos = null;
    }
    registerEvt() {
        if (!this._target) {
            return;
        }
        if (EDITOR) {
            this._target.node.on(NodeEventType.ANCHOR_CHANGED, this.updateData, this);
            this.node.on(NodeEventType.TRANSFORM_CHANGED, this.updateData, this);
            this.node.on(NodeEventType.SIZE_CHANGED, this.updateData, this);
        }
        this._target.node.on(NodeEventType.SIZE_CHANGED, this.onTargetChange, this);
        this._target.node.on(NodeEventType.TRANSFORM_CHANGED, this.onTargetChange, this);
        this._target.node.on(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this.onTargetChange, this);
    }
    unregisterEvt() {
        if (!this._target) {
            return;
        }
        if (!this._target.isValid) {
            return;
        }
        if (EDITOR) {
            this._target.node.off(NodeEventType.ANCHOR_CHANGED, this.updateData, this);
            this.node.off(NodeEventType.TRANSFORM_CHANGED, this.updateData, this);
            this.node.off(NodeEventType.SIZE_CHANGED, this.updateData, this);
        }
        this._target.node.off(NodeEventType.SIZE_CHANGED, this.onTargetChange, this);
        this._target.node.off(NodeEventType.TRANSFORM_CHANGED, this.onTargetChange, this);
        this._target.node.off(NodeEventType.ACTIVE_IN_HIERARCHY_CHANGED, this.onTargetChange, this);
    }
    updateData() {
        if (this._target == null) {
            return;
        }
        switch (this._dir) {
            case WidgetDirection.TOP:
            case WidgetDirection.BOTTOM:
            case WidgetDirection.LEFT:
            case WidgetDirection.RIGHT:
                this.updateDistance();
                break;
            case WidgetDirection.TOP_EXTEND:
            case WidgetDirection.BOTTOM_EXTEND:
            case WidgetDirection.LEFT_EXTEND:
            case WidgetDirection.RIGHT_EXTEND:
                this.updateTargetPos();
                break;
        }
    }
    onTargetChange() {
        if (this._target == null) {
            return;
        }
        switch (this._dir) {
            case WidgetDirection.TOP:
            case WidgetDirection.BOTTOM:
            case WidgetDirection.LEFT:
            case WidgetDirection.RIGHT:
                this.updatePos();
                break;
            case WidgetDirection.TOP_EXTEND:
            case WidgetDirection.BOTTOM_EXTEND:
            case WidgetDirection.LEFT_EXTEND:
            case WidgetDirection.RIGHT_EXTEND:
                this.updateSize();
                break;
        }
    }
    updateSize() {
        if (this._isVertical) {
            const posChange = this._targetOldPos.y - this._target.node.position.y;
            let sizeChange = this._target.height - this._targetOldSize;
            const anchorY = this._trans.anchorY;
            this._changePos.set(this._selfOldPos);
            if (this._target.getComponent(Label) && !this._target.node.active) {
                sizeChange = this._targetOldSize;
            }
            const realChange = posChange + sizeChange;
            this._trans.height = this._selfOldSize + realChange;
            if (this._dir == WidgetDirection.TOP_EXTEND) {
                this.node.setPosition(this._changePos);
            }
            else if (this._dir == WidgetDirection.BOTTOM_EXTEND) {
                this._changePos.y -= (realChange * (1 - anchorY));
                this.node.setPosition(v3(this._changePos));
            }
        }
    }
    updatePos() {
        const selfTrans = this._trans;
        const targetTrans = this._target;
        const targetPos = this.getPos(targetTrans, this._targetDir);
        let pos = targetPos - this._distance;
        this._changePos.set(this.node.worldPosition);
        if (this._isVertical) {
            switch (this._dir) {
                case WidgetDirection.TOP: {
                    const height = selfTrans.height;
                    const anchorY = selfTrans.anchorY;
                    pos -= height * (1 - anchorY);
                    break;
                }
                case WidgetDirection.BOTTOM: {
                    const height = selfTrans.height;
                    const anchorY = selfTrans.anchorY;
                    pos += height * anchorY;
                    break;
                }
            }
            this._changePos.y = pos;
        }
        else {
            this._changePos.x = pos;
            // todo
        }
        this.node.worldPosition = this._changePos;
    }
    updateTargetPos() {
        if (EDITOR) {
            if (this._changePos == null) {
                console.error('编辑器数据错乱, 请重新添加本组件');
                this._changePos = v3();
            }
        }
        this.target.node.getPosition(this._targetOldPos);
        this.node.getPosition(this._selfOldPos);
        if (this._isVertical) {
            this._selfOldSize = this._trans.height;
            this._targetOldSize = this._target.height;
        }
        else {
            this._selfOldSize = this._trans.width;
            this._targetOldSize = this._target.height;
        }
    }
    updateDistance() {
        if (!EDITOR) {
            return;
        }
        if (this._target == null) {
            return;
        }
        const selfTrans = this.node.getComponent(UITransform);
        const targetTrans = this._target;
        const selfPos = this.getPos(selfTrans, this._dir);
        const targetPos = this.getPos(targetTrans, this._targetDir);
        this._distance = targetPos - selfPos;
    }
    getPos(trans, dir) {
        if (this._isVertical) {
            let y = trans.node.worldPosition.y;
            const height = trans.height;
            const anchorY = trans.anchorY;
            switch (dir) {
                case WidgetDirection.TOP:
                case WidgetDirection.TOP_EXTEND:
                    if (!trans.node.active) {
                        y = y - height - this.visibleOffset;
                    }
                    return y + height * (1 - anchorY);
                case WidgetDirection.BOTTOM:
                case WidgetDirection.BOTTOM_EXTEND:
                    if (!trans.node.active) {
                        y = y + height + this.visibleOffset;
                    }
                    return y - height * anchorY;
            }
        }
        else {
            const x = trans.node.worldPosition.x;
            const width = trans.width;
            const anchorX = trans.anchorX;
            switch (dir) {
                case WidgetDirection.LEFT:
                    return x - width * anchorX;
                case WidgetDirection.RIGHT:
                    return x + width * (1 - anchorX);
            }
        }
    }
};
__decorate$1([
    property$1({ type: UITransform })
], CTWidget.prototype, "target", null);
__decorate$1([
    property$1({ type: UITransform })
], CTWidget.prototype, "_target", void 0);
__decorate$1([
    property$1({ type: Enum(WidgetBase) })
], CTWidget.prototype, "targetDir", null);
__decorate$1([
    property$1
], CTWidget.prototype, "_targetDir", void 0);
__decorate$1([
    property$1({ type: Enum(WidgetDirection) })
], CTWidget.prototype, "dir", null);
__decorate$1([
    property$1
], CTWidget.prototype, "_dir", void 0);
__decorate$1([
    property$1({ type: CCFloat })
], CTWidget.prototype, "visibleOffset", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_isVertical", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_distance", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_changePos", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_targetOldPos", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_targetOldSize", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_selfOldPos", void 0);
__decorate$1([
    property$1
], CTWidget.prototype, "_selfOldSize", void 0);
CTWidget = __decorate$1([
    ccclass$1('CTWidget'),
    menu$1('moye/CTWidget'),
    executeInEditMode
], CTWidget);

const RoundBoxAssembler = {
    // 根据圆角segments参数，构造网格的顶点索引列表
    GetIndexBuffer(sprite) {
        const indexBuffer = [
            0, 1, 2, 2, 3, 0,
            4, 5, 6, 6, 7, 4,
            8, 9, 10, 10, 11, 8
        ];
        // 为四个角的扇形push进索引值
        let index = 12;
        const fanIndexBuild = function (center, start, end) {
            let last = start;
            for (let i = 0; i < sprite.segments - 1; i++) {
                // 左上角 p2为扇形圆心，p1/p5为两个边界
                const cur = index;
                index++;
                indexBuffer.push(center, last, cur);
                last = cur;
            }
            indexBuffer.push(center, last, end);
        };
        if (sprite.leftBottom)
            fanIndexBuild(3, 4, 0);
        if (sprite.leftTop)
            fanIndexBuild(2, 1, 5);
        if (sprite.rightTop)
            fanIndexBuild(9, 6, 10);
        if (sprite.rightBottom)
            fanIndexBuild(8, 11, 7);
        return indexBuffer;
    },
    createData(sprite) {
        const renderData = sprite.requestRenderData();
        let corner = 0;
        corner += sprite.leftBottom ? 1 : 0;
        corner += sprite.leftTop ? 1 : 0;
        corner += sprite.rightTop ? 1 : 0;
        corner += sprite.rightBottom ? 1 : 0;
        const vNum = 12 + (sprite.segments - 1) * corner;
        renderData.dataLength = vNum;
        renderData.resize(vNum, 18 + sprite.segments * 3 * corner);
        const indexBuffer = RoundBoxAssembler.GetIndexBuffer(sprite);
        renderData.chunk.setIndexBuffer(indexBuffer);
        return renderData;
    },
    // 照抄simple的
    updateRenderData(sprite) {
        const frame = sprite.spriteFrame;
        dynamicAtlasManager.packToDynamicAtlas(sprite, frame);
        this.updateUVs(sprite); // dirty need
        //this.updateColor(sprite);// dirty need
        const renderData = sprite.renderData;
        if (renderData && frame) {
            if (renderData.vertDirty) {
                this.updateVertexData(sprite);
            }
            renderData.updateRenderData(sprite, frame);
        }
    },
    // 局部坐标转世界坐标 照抄的，不用改
    updateWorldVerts(sprite, chunk) {
        const renderData = sprite.renderData;
        const vData = chunk.vb;
        const dataList = renderData.data;
        const node = sprite.node;
        const m = node.worldMatrix;
        const stride = renderData.floatStride;
        let offset = 0;
        const length = dataList.length;
        for (let i = 0; i < length; i++) {
            const curData = dataList[i];
            const x = curData.x;
            const y = curData.y;
            let rhw = m.m03 * x + m.m07 * y + m.m15;
            rhw = rhw ? 1 / rhw : 1;
            offset = i * stride;
            vData[offset + 0] = (m.m00 * x + m.m04 * y + m.m12) * rhw;
            vData[offset + 1] = (m.m01 * x + m.m05 * y + m.m13) * rhw;
            vData[offset + 2] = (m.m02 * x + m.m06 * y + m.m14) * rhw;
        }
    },
    // 每帧调用的，把数据和到一整个meshbuffer里
    fillBuffers(sprite) {
        if (sprite === null) {
            return;
        }
        const renderData = sprite.renderData;
        const chunk = renderData.chunk;
        if (sprite.node.hasChangedFlags || renderData.vertDirty) {
            // const vb = chunk.vertexAccessor.getVertexBuffer(chunk.bufferId);
            this.updateWorldVerts(sprite, chunk);
            renderData.vertDirty = false;
        }
        // quick version
        chunk.bufferId;
        const vidOrigin = chunk.vertexOffset;
        const meshBuffer = chunk.meshBuffer;
        const ib = chunk.meshBuffer.iData;
        let indexOffset = meshBuffer.indexOffset;
        const vid = vidOrigin;
        // 沿着当前这个位置往后将我们这个对象的index放进去
        const indexBuffer = RoundBoxAssembler.GetIndexBuffer(sprite);
        for (let i = 0; i < renderData.indexCount; i++) {
            ib[indexOffset++] = vid + indexBuffer[i];
        }
        meshBuffer.indexOffset += renderData.indexCount;
    },
    // 计算每个顶点相对于sprite坐标的位置
    updateVertexData(sprite) {
        const renderData = sprite.renderData;
        if (!renderData) {
            return;
        }
        const uiTrans = sprite.node._uiProps.uiTransformComp;
        const dataList = renderData.data;
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const appX = uiTrans.anchorX * cw;
        const appY = uiTrans.anchorY * ch;
        const left = 0 - appX;
        const right = cw - appX;
        const top = ch - appY;
        const bottom = 0 - appY;
        const left_r = left + sprite.radius;
        const bottom_r = bottom + sprite.radius;
        const top_r = top - sprite.radius;
        const right_r = right - sprite.radius;
        // 三个矩形的顶点
        dataList[0].x = left;
        dataList[0].y = sprite.leftBottom ? bottom_r : bottom;
        dataList[1].x = left;
        dataList[1].y = sprite.leftTop ? top_r : top;
        dataList[2].x = left_r;
        dataList[2].y = sprite.leftTop ? top_r : top;
        dataList[3].x = left_r;
        dataList[3].y = sprite.leftBottom ? bottom_r : bottom;
        dataList[4].x = left_r;
        dataList[4].y = bottom;
        dataList[5].x = left_r;
        dataList[5].y = top;
        dataList[6].x = right_r;
        dataList[6].y = top;
        dataList[7].x = right_r;
        dataList[7].y = bottom;
        dataList[8].x = right_r;
        dataList[8].y = sprite.rightBottom ? bottom_r : bottom;
        dataList[9].x = right_r;
        dataList[9].y = sprite.rightTop ? top_r : top;
        dataList[10].x = right;
        dataList[10].y = sprite.rightTop ? top_r : top;
        dataList[11].x = right;
        dataList[11].y = sprite.rightBottom ? bottom_r : bottom;
        // 扇形圆角的顶点
        let index = 12;
        const fanPosBuild = function (center, startAngle) {
            for (let i = 1; i < sprite.segments; i++) {
                // 我这里顶点都是按顺时针分配的，所以角度要从开始角度减
                // 每个扇形都是90度
                const angle = startAngle * Math.PI / 180 - i / sprite.segments * 0.5 * Math.PI;
                dataList[index].x = center.x + Math.cos(angle) * sprite.radius;
                dataList[index].y = center.y + Math.sin(angle) * sprite.radius;
                index++;
            }
        };
        if (sprite.leftBottom)
            fanPosBuild(dataList[3], 270);
        if (sprite.leftTop)
            fanPosBuild(dataList[2], 180);
        if (sprite.rightTop)
            fanPosBuild(dataList[9], 90);
        if (sprite.rightBottom)
            fanPosBuild(dataList[8], 0);
        renderData.vertDirty = true;
    },
    // 更新计算uv
    updateUVs(sprite) {
        if (!sprite.spriteFrame)
            return;
        const renderData = sprite.renderData;
        const vData = renderData.chunk.vb;
        const uv = sprite.spriteFrame.uv;
        // 这里我打印了一下uv的值，第一个看上去是左上角，但其实，opengl端的纹理存在上下颠倒问题，所以这里其实还是左下角
        // 左下，右下，左上，右上
        const uv_l = uv[0];
        const uv_b = uv[1];
        const uv_r = uv[2];
        const uv_t = uv[5];
        const uv_w = Math.abs(uv_r - uv_l);
        const uv_h = uv_t - uv_b;
        const uiTrans = sprite.node._uiProps.uiTransformComp;
        const dataList = renderData.data;
        const cw = uiTrans.width;
        const ch = uiTrans.height;
        const appX = uiTrans.anchorX * cw;
        const appY = uiTrans.anchorY * ch;
        // 用相对坐标，计算uv
        for (let i = 0; i < renderData.dataLength; i++) {
            vData[i * renderData.floatStride + 3] = uv_l + (dataList[i].x + appX) / cw * uv_w;
            vData[i * renderData.floatStride + 4] = uv_b + (dataList[i].y + appY) / ch * uv_h;
        }
    },
    // 照抄，不用改
    updateColor(sprite) {
        const renderData = sprite.renderData;
        const vData = renderData.chunk.vb;
        let colorOffset = 5;
        const color = sprite.color;
        const colorR = color.r / 255;
        const colorG = color.g / 255;
        const colorB = color.b / 255;
        const colorA = color.a / 255;
        for (let i = 0; i < renderData.dataLength; i++, colorOffset += renderData.floatStride) {
            vData[colorOffset] = colorR;
            vData[colorOffset + 1] = colorG;
            vData[colorOffset + 2] = colorB;
            vData[colorOffset + 3] = colorA;
        }
    },
};

var __decorate = (undefined && undefined.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
const { ccclass, property, type, menu } = _decorator;
var EventType;
(function (EventType) {
    EventType["SPRITE_FRAME_CHANGED"] = "spriteframe-changed";
})(EventType || (EventType = {}));
let RoundBoxSprite = class RoundBoxSprite extends UIRenderer {
    constructor() {
        super(...arguments);
        // 尺寸模式，可以看枚举原本定义的地方有注释说明
        this._sizeMode = Sprite.SizeMode.TRIMMED;
        // 图集
        this._atlas = null;
        // 圆角用三角形模拟扇形的线段数量，越大，则越圆滑
        this._segments = 10;
        // 圆角半径
        this._radius = 20;
        this._spriteFrame = null;
        this._leftTop = true;
        this._rightTop = true;
        this._leftBottom = true;
        this._rightBottom = true;
    }
    get sizeMode() {
        return this._sizeMode;
    }
    set sizeMode(value) {
        if (this._sizeMode === value) {
            return;
        }
        this._sizeMode = value;
        if (value !== Sprite.SizeMode.CUSTOM) {
            this._applySpriteSize();
        }
    }
    get spriteAtlas() {
        return this._atlas;
    }
    set spriteAtlas(value) {
        if (this._atlas === value) {
            return;
        }
        this._atlas = value;
    }
    get segments() {
        return this._segments;
    }
    set segments(segments) {
        this._segments = segments;
        this._renderData = null;
        this._flushAssembler();
    }
    get radius() {
        return this._radius;
    }
    set radius(radius) {
        this._radius = radius;
        this._updateUVs();
        this.markForUpdateRenderData(true);
    }
    get spriteFrame() {
        return this._spriteFrame;
    }
    set spriteFrame(value) {
        if (this._spriteFrame === value) {
            return;
        }
        const lastSprite = this._spriteFrame;
        this._spriteFrame = value;
        this.markForUpdateRenderData();
        this._applySpriteFrame(lastSprite);
        if (EDITOR) {
            this.node.emit(EventType.SPRITE_FRAME_CHANGED, this);
        }
    }
    get leftTop() {
        return this._leftTop;
    }
    set leftTop(value) {
        this._leftTop = value;
        this.resetAssembler();
    }
    get rightTop() {
        return this._rightTop;
    }
    set rightTop(value) {
        this._rightTop = value;
        this.resetAssembler();
    }
    get leftBottom() {
        return this._leftBottom;
    }
    set leftBottom(value) {
        this._leftBottom = value;
        this.resetAssembler();
    }
    get rightBottom() {
        return this._rightBottom;
    }
    set rightBottom(value) {
        this._rightBottom = value;
        this.resetAssembler();
    }
    onLoad() {
        this._flushAssembler();
    }
    __preload() {
        this.changeMaterialForDefine();
        super.__preload();
        if (EDITOR) {
            this._resized();
            this.node.on(NodeEventType.SIZE_CHANGED, this._resized, this);
        }
    }
    onEnable() {
        super.onEnable();
        // Force update uv, material define, active material, etc
        this._activateMaterial();
        const spriteFrame = this._spriteFrame;
        if (spriteFrame) {
            this._updateUVs();
        }
    }
    onDestroy() {
        if (EDITOR) {
            this.node.off(NodeEventType.SIZE_CHANGED, this._resized, this);
        }
        super.onDestroy();
    }
    /**
     * @en
     * Quickly switch to other sprite frame in the sprite atlas.
     * If there is no atlas, the switch fails.
     *
     * @zh
     * 选取使用精灵图集中的其他精灵。
     * @param name @en Name of the spriteFrame to switch. @zh 要切换的 spriteFrame 名字。
     */
    changeSpriteFrameFromAtlas(name) {
        if (!this._atlas) {
            console.warn('SpriteAtlas is null.');
            return;
        }
        const sprite = this._atlas.getSpriteFrame(name);
        this.spriteFrame = sprite;
    }
    /**
     * @deprecated Since v3.7.0, this is an engine private interface that will be removed in the future.
     */
    changeMaterialForDefine() {
        let texture;
        const lastInstanceMaterialType = this._instanceMaterialType;
        if (this._spriteFrame) {
            texture = this._spriteFrame.texture;
        }
        let value = false;
        if (texture instanceof cclegacy.TextureBase) {
            const format = texture.getPixelFormat();
            value = (format === cclegacy.TextureBase.PixelFormat.RGBA_ETC1 || format === cclegacy.TextureBase.PixelFormat.RGB_A_PVRTC_4BPPV1 || format === cclegacy.TextureBase.PixelFormat.RGB_A_PVRTC_2BPPV1);
        }
        if (value) {
            this._instanceMaterialType = InstanceMaterialType.USE_ALPHA_SEPARATED;
        }
        else {
            this._instanceMaterialType = InstanceMaterialType.ADD_COLOR_AND_TEXTURE;
        }
        if (lastInstanceMaterialType !== this._instanceMaterialType) {
            // this.updateMaterial();
            // d.ts里没有注上这个函数，直接调用会表红。
            this["updateMaterial"]();
        }
    }
    _updateBuiltinMaterial() {
        let mat = super._updateBuiltinMaterial();
        if (this.spriteFrame && this.spriteFrame.texture instanceof RenderTexture) {
            const defines = { SAMPLE_FROM_RT: true, ...mat.passes[0].defines };
            const renderMat = new Material();
            renderMat.initialize({
                effectAsset: mat.effectAsset,
                defines,
            });
            mat = renderMat;
        }
        return mat;
    }
    _render(render) {
        render.commitComp(this, this.renderData, this._spriteFrame, this._assembler, null);
    }
    _canRender() {
        if (!super._canRender()) {
            return false;
        }
        const spriteFrame = this._spriteFrame;
        if (!spriteFrame || !spriteFrame.texture) {
            return false;
        }
        return true;
    }
    resetAssembler() {
        this._assembler = null;
        this._flushAssembler();
    }
    _flushAssembler() {
        const assembler = RoundBoxAssembler;
        if (this._assembler !== assembler) {
            this.destroyRenderData();
            this._assembler = assembler;
        }
        if (!this._renderData) {
            if (this._assembler && this._assembler.createData) {
                this._renderData = this._assembler.createData(this);
                this._renderData.material = this.getRenderMaterial(0);
                this.markForUpdateRenderData();
                if (this.spriteFrame) {
                    this._assembler.updateRenderData(this);
                }
                this._updateColor();
            }
        }
    }
    _applySpriteSize() {
        if (this._spriteFrame) {
            if (BUILD || !this._spriteFrame) {
                if (Sprite.SizeMode.RAW === this._sizeMode) {
                    const size = this._spriteFrame.originalSize;
                    this.node._uiProps.uiTransformComp.setContentSize(size);
                }
                else if (Sprite.SizeMode.TRIMMED === this._sizeMode) {
                    const rect = this._spriteFrame.rect;
                    this.node._uiProps.uiTransformComp.setContentSize(rect.width, rect.height);
                }
            }
            this.markForUpdateRenderData(true);
            this._assembler.updateRenderData(this);
        }
    }
    _resized() {
        if (!EDITOR) {
            return;
        }
        if (this._spriteFrame) {
            const actualSize = this.node._uiProps.uiTransformComp.contentSize;
            let expectedW = actualSize.width;
            let expectedH = actualSize.height;
            if (this._sizeMode === Sprite.SizeMode.RAW) {
                const size = this._spriteFrame.originalSize;
                expectedW = size.width;
                expectedH = size.height;
            }
            else if (this._sizeMode === Sprite.SizeMode.TRIMMED) {
                const rect = this._spriteFrame.rect;
                expectedW = rect.width;
                expectedH = rect.height;
            }
            if (expectedW !== actualSize.width || expectedH !== actualSize.height) {
                this._sizeMode = Sprite.SizeMode.CUSTOM;
            }
        }
    }
    _activateMaterial() {
        const spriteFrame = this._spriteFrame;
        const material = this.getRenderMaterial(0);
        if (spriteFrame) {
            if (material) {
                this.markForUpdateRenderData();
            }
        }
        if (this.renderData) {
            this.renderData.material = material;
        }
    }
    _updateUVs() {
        if (this._assembler) {
            this._assembler.updateUVs(this);
        }
    }
    _applySpriteFrame(oldFrame) {
        const spriteFrame = this._spriteFrame;
        let textureChanged = false;
        if (spriteFrame) {
            if (!oldFrame || oldFrame.texture !== spriteFrame.texture) {
                textureChanged = true;
            }
            if (textureChanged) {
                if (this.renderData)
                    this.renderData.textureDirty = true;
                this.changeMaterialForDefine();
            }
            this._applySpriteSize();
        }
    }
};
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_sizeMode", void 0);
__decorate([
    type(Sprite.SizeMode)
], RoundBoxSprite.prototype, "sizeMode", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_atlas", void 0);
__decorate([
    type(SpriteAtlas)
], RoundBoxSprite.prototype, "spriteAtlas", null);
__decorate([
    property({ type: CCInteger, serializable: true })
], RoundBoxSprite.prototype, "_segments", void 0);
__decorate([
    property({ type: CCInteger, serializable: true, min: 1 })
], RoundBoxSprite.prototype, "segments", null);
__decorate([
    property({ type: CCFloat, serializable: true })
], RoundBoxSprite.prototype, "_radius", void 0);
__decorate([
    property({ type: CCFloat, serializable: true, min: 0 })
], RoundBoxSprite.prototype, "radius", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_spriteFrame", void 0);
__decorate([
    type(SpriteFrame)
], RoundBoxSprite.prototype, "spriteFrame", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_leftTop", void 0);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "leftTop", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_rightTop", void 0);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "rightTop", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_leftBottom", void 0);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "leftBottom", null);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "_rightBottom", void 0);
__decorate([
    property({ serializable: true })
], RoundBoxSprite.prototype, "rightBottom", null);
RoundBoxSprite = __decorate([
    ccclass('RoundBoxSprite'),
    menu('moye/RoundBoxSprite')
], RoundBoxSprite);

export { AEvent, AEventHandler, AfterCreateClientScene, AfterCreateCurrentScene, AfterProgramInit, AfterProgramStart, AfterSingletonAdd, BeforeProgramInit, BeforeProgramStart, BeforeSingletonAdd, BundleAsset, CTWidget, CancellationToken, CancellationTokenTag, CoroutineLock, CoroutineLockItem, CoroutineLockTag, DecoratorCollector, Entity, EntityCenter, EventDecorator, EventDecoratorType, EventHandlerTag, EventSystem, Game, IdGenerator, IdStruct, InstanceIdStruct, JsHelper, Logger, MoyeAssets, ObjectPool, Options, Program, RecycleObj, RoundBoxSprite, Scene, SceneFactory, SceneRefCom, SceneType, Singleton, SizeFollow, TimeInfo, TimerMgr, error, log, safeCall, warn };
