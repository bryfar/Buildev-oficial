import { createContext } from 'react';
import type { DesignEngine } from '@buildev/pen-engine';

/**
 * React context holding the DesignEngine instance.
 * Provided by <DesignProvider>, consumed by useDesignEngine().
 */
export const DesignEngineContext = createContext<DesignEngine | null>(null);
