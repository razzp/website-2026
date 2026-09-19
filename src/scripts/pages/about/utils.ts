function getActiveTimelineLabel(timeline: gsap.core.Timeline): string {
    const currentTime = timeline.time();
    const labels = Object.entries(timeline.labels);

    let activeLabel = labels[0][0];

    for (const [name, labelTime] of labels) {
        if (labelTime > currentTime) break;

        activeLabel = name;
    }

    return activeLabel;
}

function gradientAngleForRotate3d(
    x: number,
    y: number,
    z: number,
    degrees: number,
): number {
    const length = Math.hypot(x, y, z);

    x /= length;
    y /= length;
    z /= length;

    const angle = (degrees * Math.PI) / 180;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;

    const rotatedX = t * x * x + c;
    const rotatedY = t * x * y + s * z;

    const vectorAngle = (Math.atan2(rotatedY, rotatedX) * 180) / Math.PI;

    return 90 + vectorAngle;
}

export { getActiveTimelineLabel, gradientAngleForRotate3d };
