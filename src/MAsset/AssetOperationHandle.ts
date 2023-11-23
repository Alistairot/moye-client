import { Asset, instantiate, Node, Prefab } from "cc";
import { IBundleAssetProvider } from "./IBundleAssetProvider";
import { coreError } from "../Core/Logger/CoreLogHelper";
import { Type } from "../Core/Type/Type";

export class AssetOperationHandle {
    public provider: IBundleAssetProvider;
    public isDisposed: boolean = false;

    public getAsset<T extends Asset>(assetType: Type<T>) {
        return this.provider.asset as T;
    }

    public dispose() {
        if (this.isDisposed) {
            coreError(`重复销毁AssetOperationHandle`);
            return;
        }

        this.isDisposed = true;

        this.provider.releaseHandle(this);
    }

    public instantiateSync(): Node {
        const node = instantiate(this.provider.asset as Prefab);

        return node;
    }

    public async instantiateAsync(): Promise<Node> {
        const node = instantiate(this.provider.asset as Prefab);

        return node;
    }
}