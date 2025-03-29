// import {IPuppetPoseRecordingData} from "./interfaces/IPuppetPoseRecordingData";
import {HandExperience} from "./handtracking/HandExperience";

const canvasElement = document.getElementById("outputCanvas") as HTMLCanvasElement;
const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const playbackButton = document.getElementById("playbackButton") as HTMLButtonElement;
// const downloadButton = document.getElementById("downloadButton") as HTMLButtonElement;
const downloadVideoButton = document.getElementById("downloadVideoButton") as HTMLButtonElement;
// const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
// const input = document.getElementById("jsonFileInput") as HTMLInputElement;
const uploadStatus = document.getElementById("uploadStatus") as HTMLSpanElement;
const video = document.getElementById("webcam") as HTMLVideoElement;
const threeCanvas = document.getElementById("scene") as HTMLCanvasElement;
const canvasCtx: CanvasRenderingContext2D = canvasElement.getContext("2d") as CanvasRenderingContext2D;
const recordCheckbox = document.getElementById("recordCheckbox") as HTMLInputElement;
const costumesCheckbox = document.getElementById("costumesCheckbox") as HTMLInputElement;
const pitchSlider = document.getElementById("pitchSlider") as HTMLInputElement;
const mainContent = document.getElementById("mainContent") as HTMLElement;
const mediaPrompt = document.getElementById("mediaPrompt") as HTMLDivElement;
const videoContainer = document.getElementById('videoContainer') as HTMLDivElement;
const progressBar = document.getElementById("progressBar") as HTMLProgressElement;

// let audioBlob: Blob;
let videoBlob: Blob;
let recordVideo = false;

function resize() {
    const style = getComputedStyle(canvasElement)
    canvasElement.width = parseInt(style.width);
    canvasElement.height = parseInt(style.height);

    const threeStyle = getComputedStyle(threeCanvas)
    threeCanvas.width = parseInt(threeStyle.width);
    threeCanvas.height = parseInt(threeStyle.height);
}

window.addEventListener("resize", resize);

resize();

async function checkMediaAccess() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaPrompt.style.display = 'none';
        start();
    } catch (e) {
        mainContent.style.display = 'none';
    }
}

checkMediaAccess();

// start()

function start() {
    const handExperience = new HandExperience(video, canvasElement, canvasCtx, threeCanvas, progressBar);
    handExperience.onDataLoaded = (success) => {
        if (success) uploadStatus.innerHTML = "Sample data loaded from server!";
    };
    handExperience.onNewVideoRecording = (blob: Blob) => {
        videoBlob = blob;
        downloadVideoButton.disabled = false;
        // console.log("got the video recording");
    };
// handExperience.onNewAudioRecording = (blob: Blob) => {
//     audioBlob = blob;
//     console.log("got the audio recording");
// };

    downloadVideoButton.addEventListener("click", () => {
        if (videoBlob) {
            downloadFile(videoBlob, "video.mp4");
        }
    });
    recordCheckbox.addEventListener("change", () => {
        recordVideo = recordCheckbox.checked;
    });

    costumesCheckbox.addEventListener("change", () => {
        handExperience.setAccessoryVisible(costumesCheckbox.checked);
    });

    recordButton.addEventListener("click", () => {
        if (!handExperience.recording) {
            handExperience.startRecording();
        } else {
            handExperience.stopRecording();
        }

        recordButton.innerHTML = handExperience.recording ? "Stop Recording" : "Record";
    });

    handExperience.onNewHandRecording = () => {
        recordButton.innerHTML = handExperience.recording ? "Stop Recording" : "Record";
    };

    playbackButton.addEventListener("click", () => {
        if (handExperience.hasRecording && !handExperience.recording) {
            handExperience.playRecording(recordVideo);
        }
    });

// downloadButton.addEventListener("click", () => {
//     if (handExperience.hasRecording) {
//         const downloadableRecording = handExperience.downloadableHandPoseRecordingData;
//         downloadJSON(downloadableRecording);
//         if (audioBlob) downloadFile(audioBlob, "audio.wav");
//     }
// });
//
// uploadButton.addEventListener("click", () => {
//     handleFileUpload();
// });

    pitchSlider.addEventListener("input", () => {
        handExperience.setPitchShift(parseFloat(pitchSlider.value));
    });

}

// Add this script to dynamically set the aspect ratio based on the webcam


video.addEventListener('loadedmetadata', () => {
    const aspectRatio = video.videoWidth / video.videoHeight;
    // console.log(aspectRatio)
    videoContainer.style.aspectRatio = `${aspectRatio}`;
});


// function handleFileUpload() {
//     if (!input || !input.files || input.files.length === 0) {
//         alert("Please select a file to upload.");
//         return;
//     }
//
//     const file = input.files[0];
//     const reader = new FileReader();
//
//     if (file.type === "application/json" || file.name.endsWith(".json")) {
//         reader.onload = event => {
//             try {
//                 const handPoseRecordingData = JSON.parse(event.target?.result as string) as IPuppetPoseRecordingData;
//                 handExperience.loadHandPoseRecordingData(handPoseRecordingData);
//                 uploadStatus.innerHTML = "JSON upload successful!";
//             } catch (e) {
//                 alert("Invalid JSON file.");
//             }
//         };
//         reader.readAsText(file);
//     } else if (file.type === "audio/wav" || file.name.endsWith(".wav")) {
//         reader.onload = event => {
//             try {
//                 const audioBlob = new Blob([event.target?.result as ArrayBuffer], {type: "audio/wav"});
//                 handExperience.loadAudioFile(audioBlob);
//                 uploadStatus.innerHTML = "WAV upload successful!";
//             } catch (e) {
//                 alert("Invalid WAV file.");
//             }
//         };
//         reader.readAsArrayBuffer(file);
//     } else {
//         alert("Unsupported file type. Please upload a JSON or WAV file.");
//     }
// }
//
// function downloadJSON(data: IPuppetPoseRecordingData, filename = "data.json") {
//     const jsonStr = JSON.stringify(data, null, 2);  // Convert JSON object to a string
//     const blob = new Blob([jsonStr], {type: "application/json"});
//     downloadFile(blob, filename);
// }

function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}
