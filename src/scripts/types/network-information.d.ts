interface NetworkInformation extends EventTarget {
    readonly effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
    readonly saveData: boolean;
    readonly downlink: number;
    readonly rtt: number;
}

declare global {
    interface Navigator {
        readonly connection?: NetworkInformation;
    }
}

export {};
