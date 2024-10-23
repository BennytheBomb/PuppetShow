import { Vector3 } from "three";

export type HandSide = "Left" | "Right";

export class HandPose {
    public score: number;
    public positions: Vector3[];
    public side: HandSide;
    public timestamp: number;

    constructor(score: number, positions: Vector3[], side: HandSide, timestamp: number) {
        this.score = score;
        this.positions = positions;
        this.side = side;
        this.timestamp = timestamp;
    }
}