import {FilesetResolver, HandLandmarker, HandLandmarkerResult} from "@mediapipe/tasks-vision";
import {drawConnectors, drawLandmarks} from "@mediapipe/drawing_utils";
import {HAND_CONNECTIONS} from "@mediapipe/hands";
import {HandSide, IHandPose} from "../interfaces/IHandPose";
import {Vector3} from "three";

export class HandTracking {
    private static readonly RUNNING_MODE = "VIDEO";
    private readonly _video: HTMLVideoElement;
    private readonly _canvasCtx: CanvasRenderingContext2D;
    private _canvasElement: HTMLCanvasElement;
    private _handLandmarker!: HandLandmarker;
    private _webcamRunning: Boolean = false;
    private _lastVideoTime = -1;
    private _results!: HandLandmarkerResult;

    constructor(video: HTMLVideoElement, canvasElement: HTMLCanvasElement, canvasCtx: CanvasRenderingContext2D) {
        this._video = video;
        this._canvasElement = canvasElement;
        this._canvasCtx = canvasCtx;

        if (!this.hasGetUserMedia()) {
            console.warn("getUserMedia() is not supported by your browser");
        }

        this.predictWebcam = this.predictWebcam.bind(this);
        this.init();
    }

    private _handPosesDetectedCallback!: (handPoses: IHandPose[]) => void;

    public set handPosesDetectedCallback(value: (handPoses: IHandPose[]) => void) {
        this._handPosesDetectedCallback = value;
    }

    private _recording: boolean = false;

    public set recording(value: boolean) {
        this._recording = value;
    }

    private async init() {
        await this.createHandLandmarker();
        this.enableCam();
    }

    private async createHandLandmarker() {
        const vision = await FilesetResolver.forVisionTasks("./node_modules/@mediapipe/tasks-vision/wasm");
        this._handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "../models/hand_landmarker.task",
                delegate: "GPU"
            },
            runningMode: HandTracking.RUNNING_MODE,
            numHands: 2
        });
    }

    private hasGetUserMedia() {
        return !!navigator.mediaDevices?.getUserMedia;
    }

    private enableCam() {
        if (!this._handLandmarker) {
            console.log("Wait! objectDetector not loaded yet.");
            return;
        }

        this._webcamRunning = true;

        const constraints = {
            video: true
        };

        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            this._video.srcObject = stream;
            this._video.onloadeddata = this.predictWebcam;
            // this._video.addEventListener("loadeddata", this.predictWebcam.bind(this));
        });
    }

    private drawResultsOnWebcam() {
        this._canvasCtx.save();
        this._canvasCtx.clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
        if (this._results?.landmarks) {
            for (const landmarks of this._results.landmarks) {
                drawConnectors(this._canvasCtx, landmarks, HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 5
                });
                drawLandmarks(this._canvasCtx, landmarks, {color: "#FF0000", lineWidth: 0.1});
            }
        }

        if (this._recording) {
            this._canvasCtx.fillStyle = "red";
            this._canvasCtx.beginPath();
            this._canvasCtx.arc(30, 30, 10, 0, Math.PI * 2, true);
            this._canvasCtx.fill();

            this._canvasCtx.fillStyle = "red";
            this._canvasCtx.font = "20px Arial";
            this._canvasCtx.fillText("REC", 50, 35);
        }


        this._canvasCtx.restore();
    }

    private async predictWebcam() {
        this._canvasElement.style.width = this._video.videoWidth.toString();
        this._canvasElement.style.height = this._video.videoHeight.toString();
        this._canvasElement.width = this._video.videoWidth;
        this._canvasElement.height = this._video.videoHeight;

        let startTimeMs = performance.now();
        if (this._lastVideoTime !== this._video.currentTime) {
            this._lastVideoTime = this._video.currentTime;
            this._results = this._handLandmarker.detectForVideo(this._video, startTimeMs);
            if (this._results && this._results.handednesses && this._handPosesDetectedCallback) {
                const handPoses = this.buildHandPoses(this._results, startTimeMs);
                this._handPosesDetectedCallback(handPoses);
            }
        }

        this.drawResultsOnWebcam();

        if (this._webcamRunning === true) {
            window.requestAnimationFrame(this.predictWebcam);
        }
    }

    private buildHandPoses(handLandmarkerResult: HandLandmarkerResult, timestamp: number): IHandPose[] {
        return handLandmarkerResult.handednesses.map((handedness, index) => {
            const side = handedness[0].categoryName as HandSide;
            const score = handedness[0].score;
            // World landmarks are normalized
            const positions = handLandmarkerResult.worldLandmarks[index].map(landmark => new Vector3(landmark.x, landmark.y, landmark.z));

            return {score, positions, side, timestamp};
        });
    }
}