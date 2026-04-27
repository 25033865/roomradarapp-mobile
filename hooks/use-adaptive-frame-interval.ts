import { useEffect, useState } from "react";

const SAMPLE_COUNT = 24;
const HIGH_REFRESH_THRESHOLD_HZ = 90;
const STANDARD_FRAME_INTERVAL_MS = 16;
const HIGH_REFRESH_FRAME_INTERVAL_MS = 8;

export const useAdaptiveFrameInterval = (): number => {
	const [frameIntervalMs, setFrameIntervalMs] = useState(
		STANDARD_FRAME_INTERVAL_MS
	);

	useEffect(() => {
		let rafId = 0;
		let lastTimestamp = 0;
		let sampleCount = 0;
		let deltaTotal = 0;

		const sampleRefreshRate = (timestamp: number) => {
			if (lastTimestamp > 0) {
				deltaTotal += timestamp - lastTimestamp;
				sampleCount += 1;
			}
			lastTimestamp = timestamp;

			if (sampleCount >= SAMPLE_COUNT) {
				const averageFrameTime = deltaTotal / sampleCount;
				const estimatedHz =
					averageFrameTime > 0
						? Math.round(1000 / averageFrameTime)
						: 60;

				setFrameIntervalMs(
					estimatedHz >= HIGH_REFRESH_THRESHOLD_HZ
						? HIGH_REFRESH_FRAME_INTERVAL_MS
						: STANDARD_FRAME_INTERVAL_MS
				);
				return;
			}

			rafId = requestAnimationFrame(sampleRefreshRate);
		};

		rafId = requestAnimationFrame(sampleRefreshRate);

		return () => {
			cancelAnimationFrame(rafId);
		};
	}, []);

	return frameIntervalMs;
};