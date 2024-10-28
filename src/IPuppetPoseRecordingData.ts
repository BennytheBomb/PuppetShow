import { IPuppetPose } from "./IPuppetPose";

export interface IPuppetPoseRecordingData {
    leftPuppetPoses: IPuppetPose[];
    rightPuppetPoses: IPuppetPose[];
    duration: number;
}