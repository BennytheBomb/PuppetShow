import {HandPose, HandSide} from "./HandPose";

export class HandPoseRecording {
    private static readonly CONFIDENCE_SCORE_THRESHOLD = 0.7;
    private static readonly MOTION_SCORE_MIN_THRESHOLD = 0.01;

    private _leftHandPoses: HandPose[] = [];
    private _rightHandPoses: HandPose[] = [];
    private _startTime: number;
    private _endTime: number;

    private _previousLeftHandPose: HandPose = null;
    private _previousRightHandPose: HandPose = null;

    public startRecording(startTime: number) {
        this._startTime = startTime;
    }

    public stopRecording(endTime: number) {
        this._endTime = endTime;
        console.log("recording duration: " + (this._endTime - this._startTime) + "ms");
        console.log("left hand poses recorded: " + this._leftHandPoses.length);
        console.log("right hand poses recorded: " + this._rightHandPoses.length);
    }

    public recordHandPose(handPose: HandPose, side: HandSide) {
        if (handPose.score < HandPoseRecording.CONFIDENCE_SCORE_THRESHOLD) {
            console.log("skipping pose - confidence score too low");
            return;
        }

        const previousHandPose = side === "Left" ? this._previousLeftHandPose : this._previousRightHandPose;

        if (previousHandPose === null) { // first hand pose
            this.addHandPose(handPose, side);
            return;
        }

        const motionScore = this.calculateMotionScore(handPose, previousHandPose);

        if (motionScore < HandPoseRecording.MOTION_SCORE_MIN_THRESHOLD) {
            console.log("skipping pose - motion score too low");
            return;
        }

        this.addHandPose(handPose, side);
    }

    private addHandPose(handPose: HandPose, side: HandSide) {
        if (side === "Left") {
            this._leftHandPoses.push(handPose);
            this._previousLeftHandPose = handPose;
        } else {
            this._rightHandPoses.push(handPose);
            this._previousRightHandPose = handPose;
        }

        console.log("recording hand pose");
    }

    private calculateMotionScore(handPose: HandPose, previousHandPose: HandPose): number {
        let score = 0;
        for (let i = 0; i < handPose.positions.length; i++) {
            const distance = handPose.positions[i].distanceTo(previousHandPose.positions[i]);
            score += distance;
        }
        return score;
    }
}