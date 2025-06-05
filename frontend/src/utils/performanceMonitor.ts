interface PerformanceMetrics {
    imageLoadsInProgress: number;
    totalImageLoads: number;
    averageLoadTime: number;
    failedLoads: number;
}

class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        imageLoadsInProgress: 0,
        totalImageLoads: 0,
        averageLoadTime: 0,
        failedLoads: 0,
    };
    
    private loadStartTimes: Map<string, number> = new Map();
    private loadTimes: number[] = [];

    startImageLoad(imageUri: string): void {
        this.metrics.imageLoadsInProgress++;
        this.loadStartTimes.set(imageUri, Date.now());
        
        // Log warning if too many concurrent loads
        if (this.metrics.imageLoadsInProgress > 5) {
            console.warn(`[PerformanceMonitor] High concurrent image loads: ${this.metrics.imageLoadsInProgress}`);
        }
    }

    endImageLoad(imageUri: string, success: boolean): void {
        this.metrics.imageLoadsInProgress = Math.max(0, this.metrics.imageLoadsInProgress - 1);
        this.metrics.totalImageLoads++;
        
        if (!success) {
            this.metrics.failedLoads++;
        }
        
        const startTime = this.loadStartTimes.get(imageUri);
        if (startTime) {
            const loadTime = Date.now() - startTime;
            this.loadTimes.push(loadTime);
            
            // Keep only last 50 load times for average calculation
            if (this.loadTimes.length > 50) {
                this.loadTimes.shift();
            }
            
            this.metrics.averageLoadTime = this.loadTimes.reduce((a, b) => a + b, 0) / this.loadTimes.length;
            this.loadStartTimes.delete(imageUri);
            
            // Log slow loads
            if (loadTime > 2000) {
                console.warn(`[PerformanceMonitor] Slow image load: ${imageUri} took ${loadTime}ms`);
            }
        }
    }

    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    logMetrics(): void {
        const formattedMetrics = {
            ...this.metrics,
            averageLoadTime: `${this.metrics.averageLoadTime.toFixed(2)}ms`
        };
        console.log('[PerformanceMonitor] Current metrics:', formattedMetrics);
    }

    reset(): void {
        this.metrics = {
            imageLoadsInProgress: 0,
            totalImageLoads: 0,
            averageLoadTime: 0,
            failedLoads: 0,
        };
        this.loadStartTimes.clear();
        this.loadTimes = [];
    }
}

export const performanceMonitor = new PerformanceMonitor();

// Auto-log metrics every 30 seconds in development
if (__DEV__) {
    setInterval(() => {
        const metrics = performanceMonitor.getMetrics();
        if (metrics.totalImageLoads > 0) {
            performanceMonitor.logMetrics();
        }
    }, 30000);
} 