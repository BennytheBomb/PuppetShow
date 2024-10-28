import {HandPose} from "./HandPose";

export interface IHandPoseRecordingData {
    leftHandPoses: HandPose[];
    rightHandPoses: HandPose[];
    duration: number;
}