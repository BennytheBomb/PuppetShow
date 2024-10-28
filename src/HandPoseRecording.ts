import {HandPose, HandSide} from "./HandPose";
import {IHandPoseRecordingData} from "./IHandPoseRecordingData";

export class HandPoseRecording {
    private static readonly CONFIDENCE_SCORE_THRESHOLD = 0.7;
    private static readonly MOTION_SCORE_MIN_THRESHOLD = 0.01;
    private static readonly RECORDING_TIME_INTERVAL = 0;

    private _leftHandPoses: HandPose[] = [];
    private _rightHandPoses: HandPose[] = [];
    private _startTime: number;
    private _endTime: number;

    private _previousLeftHandPose: HandPose = null;
    private _previousRightHandPose: HandPose = null;

    public get leftHandPoses(): HandPose[] {
        return this._leftHandPoses;
    }

    public get rightHandPoses(): HandPose[] {
        return this._rightHandPoses;
    }

    public get duration(): number {
        return this._endTime - this._startTime;
    }

    public get hasRecording(): boolean {
        return (this._leftHandPoses.length > 0 || this._rightHandPoses.length > 0) && this.duration > 0;
    }

    public startRecording() {
        this._startTime = performance.now();
        this._endTime = -1;
        this._leftHandPoses = [];
        this._rightHandPoses = [];
        this._previousLeftHandPose = null;
        this._previousRightHandPose = null;
    }

    public stopRecording(endTime: number) {
        this._endTime = endTime - this._startTime;
        this._startTime = 0;
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

        handPose.timestamp -= this._startTime; // Normalize to start time

        if (previousHandPose === null) { // first hand pose
            this.addHandPose(handPose, side);
            return;
        }

        if (Math.abs(handPose.timestamp - previousHandPose.timestamp) < HandPoseRecording.RECORDING_TIME_INTERVAL) {
            return;
        }

        const motionScore = this.calculateMotionScore(handPose, previousHandPose);

        if (motionScore < HandPoseRecording.MOTION_SCORE_MIN_THRESHOLD) {
            console.log("skipping pose - motion score too low");
            return;
        }

        this.addHandPose(handPose, side);
    }

    public getDownloadableHandPoseRecordingData(): IHandPoseRecordingData {
        return {
            leftHandPoses: this._leftHandPoses,
            rightHandPoses: this._rightHandPoses,
            duration: this.duration
        };
    }

    public loadHandPoseRecordingData(handPoseRecording: IHandPoseRecordingData) {
        this._leftHandPoses = handPoseRecording.leftHandPoses;
        this._rightHandPoses = handPoseRecording.rightHandPoses;
        this._startTime = 0;
        this._endTime = handPoseRecording.duration;
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