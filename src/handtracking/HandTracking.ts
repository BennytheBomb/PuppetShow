import {
    HandLandmarker,
    FilesetResolver,
    HandLandmarkerResult
} from "@mediapipe/tasks-vision";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import { IHandPose, HandSide } from "../interfaces/IHandPose";
import { Vector3 } from "three";
import { HandPoseRecording } from "./HandPoseRecording";
import { playbackRecording } from "../scenes/HandScene";
import { IPuppetPoseRecordingData } from "../interfaces/IPuppetPoseRecordingData";

let handLandmarker: HandLandmarker;
let runningMode = "VIDEO";
let webcamRunning: Boolean = false;
const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
    "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d");
const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const playbackButton = document.getElementById("playbackButton") as HTMLButtonElement;
const downloadButton = document.getElementById("downloadButton") as HTMLButtonElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
const input = document.getElementById("jsonFileInput") as HTMLInputElement;
const uploadStatus = document.getElementById("uploadStatus") as HTMLSpanElement;
let recording = false;
let lastVideoTime = -1;
let results: HandLandmarkerResult;
export const handPoseRecording: HandPoseRecording = new HandPoseRecording();
export let handPoses: IHandPose[] = [];

async function fetchJsonData() {
    const response = await fetch("/recordings/data.json");
    return await response.json();
}

fetchJsonData().then((data) => {
    handPoseRecording.loadHandPoseRecordingData(data);
    uploadStatus.innerHTML = "Loaded recording from server!";
});

const createHandLandmarker = async () => {
    const vision = await FilesetResolver.forVisionTasks(
        "./node_modules/@mediapipe/tasks-vision/wasm"
    );
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: "../models/hand_landmarker.task",
            delegate: "GPU"
        },
        runningMode: runningMode,
        numHands: 2
    });
    enableCam();
};
createHandLandmarker();

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

downloadButton.addEventListener("click", () => {
    if (handPoseRecording.hasRecording) {
        var downloadableRecording = handPoseRecording.getDownloadableHandPoseRecordingData();
        downloadJSON(downloadableRecording);
    }
});

uploadButton.addEventListener("click", () => {
    handleFileUpload();
});

function handleFileUpload() {
    if (!input || !input.files || input.files.length === 0) {
        alert("Please select a JSON file to upload.");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const handPoseRecordingData = JSON.parse(event.target?.result as string) as IPuppetPoseRecordingData;
            handPoseRecording.loadHandPoseRecordingData(handPoseRecordingData);
            uploadStatus.innerHTML = "Upload successful!";
        } catch (e) {
            alert("Invalid JSON file.");
        }
    };

    reader.readAsText(file);
}

function downloadJSON(data: IPuppetPoseRecordingData, filename = "data.json") {
    const jsonStr = JSON.stringify(data, null, 2);  // Convert JSON object to a string
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
}

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
                    handPoseRecording.recordHandPose(handPose);
                });
            }
        }
    }

    drawResultsOnWebcam();

    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}

function buildHandPoses(handLandmarkerResult: HandLandmarkerResult, timestamp: number): IHandPose[] {
   return handLandmarkerResult.handednesses.map((handedness, index) => {
        const side = handedness[0].categoryName as HandSide;
        const score = handedness[0].score;
        // World landmarks are normalized
        const positions = handLandmarkerResult.worldLandmarks[index].map(landmark => new Vector3(landmark.x, landmark.y, landmark.z));

        return { score, positions, side, timestamp };
   });
}
