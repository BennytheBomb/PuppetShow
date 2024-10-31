import {Vector3} from "three";

export type HandSide = "Left" | "Right";

export interface IHandPose {
    score: number;
    positions: Vector3[];
    side: HandSide;
    timestamp: number;
}