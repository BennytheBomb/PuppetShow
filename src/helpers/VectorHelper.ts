import {Vector3} from "three";

export function calculateCenter(points: Vector3[]): Vector3 {
    const center = new Vector3();
    for (const point of points) {
        center.add(point);
    }
    center.divideScalar(points.length);
    return center;
}