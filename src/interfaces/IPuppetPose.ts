import {HandSide} from "./IHandPose";
import {IPuppetHandFeatures} from "./IPuppetHandFeatures";

export interface IPuppetPose {
    handFeatures: IPuppetHandFeatures;
    side: HandSide;
    timestamp: number;
}