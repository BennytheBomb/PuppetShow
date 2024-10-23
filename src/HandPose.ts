import { Vector3 } from "three";

export class HandPose {
    public score: number;
    public positions: Vector3[];
    public side: string;

    constructor(score: number, positions: Vector3[], side: string) {
        this.score = score;
        this.positions = positions;
        this.side = side;
    }
}