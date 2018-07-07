import stabilizeDate from './stabilize/Date.js';
import stabilizeMath from './stabilize/Math.js';
import stabilizePerformance from './stabilize/Performance.js';
import stabilizePerformanceTiming from './stabilize/PerformanceTiming.js';

/**
 * Stabilize platform behavior by overriding global, non-deterministic APIs.
 * Overridden APIs are altered to produce deterministic behavior.
 */
export default function stabilize() {

    stabilizeDate();
    stabilizeMath();
    stabilizePerformance();
    stabilizePerformanceTiming();

}
