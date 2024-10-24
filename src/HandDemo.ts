import {
    HandLandmarker,
    FilesetResolver, HandLandmarkerResult
} from "@mediapipe/tasks-vision";
import {drawConnectors, drawLandmarks} from "@mediapipe/drawing_utils";
import {HAND_CONNECTIONS} from "@mediapipe/hands";
import {HandPose, HandSide} from "./HandPose";
import {Vector3} from "three";
import {HandPoseRecording} from "./HandPoseRecording";
import {playbackRecording} from "./HandScene";

// const demosSection = document.getElementById("demos");

let handLandmarker: HandLandmarker;
let runningMode = "VIDEO";
let webcamRunning: Boolean = false;

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "./node_modules/@mediapipe/tasks-vision/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `../models/hand_landmarker.task`,
            delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
    });
    enableCam();
};
createHandLandmarker();

const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
    "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d");
const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const playbackButton = document.getElementById("playbackButton") as HTMLButtonElement;
let recording = false;
recordButton.addEventListener("click", () => {
    recording = !recording;
    recordButton.innerHTML = recording ? "Stop Recording" : "Record";

    if (recording) {
        handPoseRecording.startRecording();
    } else {
        handPoseRecording.stopRecording(performance.now());
    }
});

playbackButton.addEventListener("click", () => {
    if (handPoseRecording.hasRecording && !recording) {
        playbackRecording();
    }
});

const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (!hasGetUserMedia()) {
    console.warn("getUserMedia() is not supported by your browser");
}

function enableCam() {
    if (!handLandmarker) {
        console.log("Wait! objectDetector not loaded yet.");
        return;
    }

    webcamRunning = true;

    const constraints = {
        video: true
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
}

let lastVideoTime = -1;
let results: HandLandmarkerResult;
export const handPoseRecording: HandPoseRecording = new HandPoseRecording();
export let handPoses: HandPose[] = [];

console.log(video);

function drawResultsOnWebcam() {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (results.landmarks) {
        for (const landmarks of results.landmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: "#00FF00",
                lineWidth: 5
            });
            drawLandmarks(canvasCtx, landmarks, {color: "#FF0000", lineWidth: 0.1});
        }
    }
    canvasCtx.restore();
}

async function predictWebcam() {
    canvasElement.style.width = video.videoWidth;
    canvasElement.style.height = video.videoHeight;
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = handLandmarker.detectForVideo(video, startTimeMs);
        if (results && results.handednesses) {
            handPoses = buildHandPoses(results, startTimeMs);

            if (recording) {
                handPoses.forEach(handPose => {
                    handPoseRecording.recordHandPose(handPose, handPose.side);
                });
            }
        }
    }

    drawResultsOnWebcam();

    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function buildHandPoses(handLandmarkerResult: HandLandmarkerResult, timestamp: number): HandPose[] {
   return handLandmarkerResult.handednesses.map((handedness, index) => {
        const categoryName = handedness[0].categoryName as HandSide;
        const score = handedness[0].score;
        // World landmarks are normalized
        const positions = handLandmarkerResult.worldLandmarks[index].map(landmark => new Vector3(landmark.x, landmark.y, landmark.z));

        return new HandPose(score, positions, categoryName, timestamp);
   });
}
