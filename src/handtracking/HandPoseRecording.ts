import { IHandPose } from "../interfaces/IHandPose";
import { IPuppetPoseRecordingData } from "../interfaces/IPuppetPoseRecordingData";
import { IPuppetPose } from "../interfaces/IPuppetPose";
import { calculateCenter } from "../helpers/VectorHelper";
import * as THREE from 'three';

export class HandPoseRecording {
    private static readonly CONFIDENCE_SCORE_THRESHOLD = 0.7;
    private static readonly MOTION_SCORE_MIN_THRESHOLD = 0.05; // in meters
    private static readonly RECORDING_TIME_INTERVAL = 16; // around 60 fps

    private _leftHandPoses: IPuppetPose[] = [];
    private _rightHandPoses: IPuppetPose[] = [];
    private _startTime: number;
    private _endTime: number;

    private _previousLeftHandPose: IHandPose = null;
    private _previousRightHandPose: IHandPose = null;

    public get leftHandPoses(): IPuppetPose[] {
        return this._leftHandPoses;
    }

    public get rightHandPoses(): IPuppetPose[] {
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

    public recordHandPose(handPose: IHandPose) {
        if (handPose.score < HandPoseRecording.CONFIDENCE_SCORE_THRESHOLD) {
            console.log("skipping pose - confidence score too low");
            return;
        }

        const previousHandPose = handPose.side === "Left" ? this._previousLeftHandPose : this._previousRightHandPose;

        handPose.timestamp -= this._startTime; // Normalize to start time

        if (previousHandPose === null) { // first hand pose
            this.addHandPose(handPose);
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

        this.addHandPose(handPose);
    }

    public getDownloadableHandPoseRecordingData(): IPuppetPoseRecordingData {
        return {
            leftPuppetPoses: this._leftHandPoses,
            rightPuppetPoses: this._rightHandPoses,
            duration: this.duration
        };
    }

    public loadHandPoseRecordingData(puppetPoseRecording: IPuppetPoseRecordingData) {
        this._leftHandPoses = puppetPoseRecording.leftPuppetPoses;
        this._rightHandPoses = puppetPoseRecording.rightPuppetPoses;
        this._startTime = 0;
        this._endTime = puppetPoseRecording.duration;
    }

    private addHandPose(handPose: IHandPose) {
        const puppetPose = this.createPuppetPose(handPose);
        if (handPose.side === "Left") {
            this._leftHandPoses.push(puppetPose);
            this._previousLeftHandPose = handPose;
        } else {
            this._rightHandPoses.push(puppetPose);
            this._previousRightHandPose = handPose;
        }

        console.log("recording hand pose");
    }

    private createPuppetPose(handPose: IHandPose): IPuppetPose {
        const wristRaw = handPose.positions[0];
        const thumbRaw = handPose.positions[4];
        const handCenter = calculateCenter([handPose.positions[5], handPose.positions[9], handPose.positions[13], handPose.positions[17]]);
        const fingerTopRaw = calculateCenter([handPose.positions[8], handPose.positions[12], handPose.positions[16], handPose.positions[20]]);
        const rightPalmDirection = new THREE.Vector3().subVectors(handCenter, handPose.positions[17]).normalize();
        const fingerTop = new THREE.Vector3();
        const handHingePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(rightPalmDirection, handCenter);
        handHingePlane.projectPoint(fingerTopRaw, fingerTop);
        const thumb = new THREE.Vector3();
        handHingePlane.projectPoint(thumbRaw, thumb);
        const wrist = new THREE.Vector3();
        handHingePlane.projectPoint(wristRaw, wrist);
        const palmCenter = calculateCenter([handCenter, wrist]);

        return {
            handFeatures: {
                palmCenter,
                handCenter,
                fingerTop,
                thumb,
                wrist,
                rightPalmDirection,
            },
            side: handPose.side,
            timestamp: handPose.timestamp
        };
    }

    private calculateMotionScore(handPose: IHandPose, previousHandPose: IHandPose): number {
        let score = 0;
        for (let i = 0; i < handPose.positions.length; i++) {
            const distance = handPose.positions[i].distanceTo(previousHandPose.positions[i]);
            score += distance;
        }
        return score;
    }
}