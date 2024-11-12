import {IPuppetPoseRecordingData} from "./interfaces/IPuppetPoseRecordingData";
import {HandExperience} from "./handtracking/HandExperience";

const canvasElement = document.getElementById("output_canvas") as HTMLCanvasElement;
const recordButton = document.getElementById("recordButton") as HTMLButtonElement;
const playbackButton = document.getElementById("playbackButton") as HTMLButtonElement;
const downloadButton = document.getElementById("downloadButton") as HTMLButtonElement;
const downloadVideoButton = document.getElementById("downloadVideoButton") as HTMLButtonElement;
const uploadButton = document.getElementById("uploadButton") as HTMLButtonElement;
const input = document.getElementById("jsonFileInput") as HTMLInputElement;
const uploadStatus = document.getElementById("uploadStatus") as HTMLSpanElement;
const video = document.getElementById("webcam") as HTMLVideoElement;
const threeCanvas = document.getElementById("scene") as HTMLCanvasElement;
const canvasCtx: CanvasRenderingContext2D = canvasElement.getContext("2d") as CanvasRenderingContext2D;
const recordCheckbox = document.getElementById("recordCheckbox") as HTMLInputElement;
const costumesCheckbox = document.getElementById("costumesCheckbox") as HTMLInputElement;
const pitchSlider = document.getElementById("pitchSlider") as HTMLInputElement;

let audioBlob: Blob;
let videoBlob: Blob;
let recordVideo = false;

const handExperience = new HandExperience(video, canvasElement, canvasCtx, threeCanvas);
handExperience.onDataLoaded = () => {
    uploadStatus.innerHTML = "Sample data loaded from server!";
};
handExperience.onNewVideoRecording = (blob: Blob) => {
    videoBlob = blob;
    downloadVideoButton.disabled = false;
    console.log("got the video recording");
};
handExperience.onNewAudioRecording = (blob: Blob) => {
    audioBlob = blob;
    console.log("got the audio recording");
};

downloadVideoButton.addEventListener("click", () => {
    if (videoBlob) {
        downloadFile(videoBlob, "video.webm");
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

playbackButton.addEventListener("click", () => {
    if (handExperience.hasRecording && !handExperience.recording) {
        handExperience.playRecording(recordVideo);
    }
});

downloadButton.addEventListener("click", () => {
    if (handExperience.hasRecording) {
        const downloadableRecording = handExperience.downloadableHandPoseRecordingData;
        downloadJSON(downloadableRecording);
        if (audioBlob) downloadFile(audioBlob, "audio.wav");
    }
});

uploadButton.addEventListener("click", () => {
    handleFileUpload();
});

pitchSlider.addEventListener("input", () => {
    handExperience.setPitchShift(parseFloat(pitchSlider.value));
});

function handleFileUpload() {
    if (!input || !input.files || input.files.length === 0) {
        alert("Please select a file to upload.");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    if (file.type === "application/json" || file.name.endsWith(".json")) {
        reader.onload = event => {
            try {
                const handPoseRecordingData = JSON.parse(event.target?.result as string) as IPuppetPoseRecordingData;
                handExperience.loadHandPoseRecordingData(handPoseRecordingData);
                uploadStatus.innerHTML = "JSON upload successful!";
            } catch (e) {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    } else if (file.type === "audio/wav" || file.name.endsWith(".wav")) {
        reader.onload = event => {
            try {
                const audioBlob = new Blob([event.target?.result as ArrayBuffer], {type: "audio/wav"});
                handExperience.loadAudioFile(audioBlob);
                uploadStatus.innerHTML = "WAV upload successful!";
            } catch (e) {
                alert("Invalid WAV file.");
            }
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert("Unsupported file type. Please upload a JSON or WAV file.");
    }
}

function downloadJSON(data: IPuppetPoseRecordingData, filename = "data.json") {
    const jsonStr = JSON.stringify(data, null, 2);  // Convert JSON object to a string
    const blob = new Blob([jsonStr], {type: "application/json"});
    downloadFile(blob, filename);
}

function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
}
