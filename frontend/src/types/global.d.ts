declare namespace NodeJS {
    interface Timeout {
        _destroyed?: boolean;
        _idleNext?: Timeout;
        _idlePrev?: Timeout;
        _idleStart?: number;
        _idleTimeout?: number;
        _onTimeout?: () => void;
        _repeat?: number | null;
    }
} 
