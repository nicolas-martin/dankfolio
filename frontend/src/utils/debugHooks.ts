import React, { useRef, useEffect } from 'react';
import { logger } from './logger';

/**
 * Unified debug utility for tracking dependency changes in hooks
 * @param deps Either an array of dependencies or an object with named dependencies
 * @param name Name for logging identification
 * @param depNames Optional array of names for array dependencies
 */
export const useHookDebug = (
	deps: React.DependencyList | Record<string, unknown>,
	name: string,
	depNames?: string[]
) => {
	const prevDeps = useRef(deps);

	useEffect(() => {
		const changes: string[] = [];

		if (Array.isArray(deps)) {
			// Handle array dependencies
			const prevDepsArray = prevDeps.current as React.DependencyList;
			deps.forEach((dep, index) => {
				if (prevDepsArray[index] !== dep) {
					const depName = depNames?.[index] || `dependency[${index}]`;
					changes.push(`${depName} changed`);
				}
			});
		} else {
			// Handle named dependencies (object)
			const prevDepsObject = prevDeps.current as Record<string, unknown>;
			const depsObject = deps as Record<string, unknown>;
			Object.keys(depsObject).forEach(key => {
				if (prevDepsObject[key] !== depsObject[key]) {
					changes.push(`${key} changed`);
				}
			});
		}

		if (changes.length > 0) {
			logger.info(`[${name}] Dependencies changed:`, changes);
		}

		prevDeps.current = deps;
	}, [deps, name, depNames]);
};

// Legacy functions for backward compatibility
export const useCallbackDebug = (deps: React.DependencyList, name: string, depNames?: string[]) => {
	useHookDebug(deps, name, depNames);
};

export const useMemoDebug = (deps: React.DependencyList, name: string, depNames?: string[]) => {
	useHookDebug(deps, name, depNames);
};

export const useNamedDepsDebug = (deps: Record<string, unknown>, name: string) => {
	useHookDebug(deps, name);
}; 
