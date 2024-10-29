import { IPuppetPoseRecordingData } from "../interfaces/IPuppetPoseRecordingData";
import { HandPoseRecording } from "./HandPoseRecording";
import * as Tone from "tone";
import { HandScene } from "../scenes/HandScene";
import { HandTracking } from "./HandTracking";
import { IHandPose } from "../interfaces/IHandPose";

export class HandExperience {
    private _onDataLoaded!: () => void;
    private _onNewVideoRecording!: (blob: Blob) => void;

    private _handPoseRecording: HandPoseRecording = new HandPoseRecording();
    private _audioBlob: Blob;
    private _audioRecorder: MediaRecorder;
    private _audioChunks: BlobPart[] = [];
    private _recording: Boolean = false;
    private _handTracking: HandTracking;
    private _handScene: HandScene;
    private _chunks: Blob[] = [];
    private _mediaRecorder: MediaRecorder;

    public set onDataLoaded(value: () => void) {
        this._onDataLoaded = value;
    }

    public set onNewVideoRecording(value: (blob: Blob) => void) {
        this._onNewVideoRecording = value;
    }

    public get recording(): Boolean {
        return this._recording;
    }

    public get audioBlob(): Blob {
        return this._audioBlob;
    }

    constructor(video: HTMLVideoElement, canvasElement: HTMLCanvasElement, canvasCtx: CanvasRenderingContext2D, threeCanvas: HTMLCanvasElement) {
        this._handTracking = new HandTracking(video, canvasElement, canvasCtx);

        this.onHandPosesDetected = this.onHandPosesDetected.bind(this);
        this._handTracking.handPosesDetectedCallback = this.onHandPosesDetected;

        this._handScene = new HandScene(threeCanvas);

        const stream = threeCanvas.captureStream(30);
        this._mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        this._mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this._chunks.push(event.data);
            }
        };

        this._mediaRecorder.onstop = () => {
            const blob = new Blob(this._chunks, { type: 'video/webm' });
            this._onNewVideoRecording(blob);
        };

        this.onPlaybackEnd = this.onPlaybackEnd.bind(this);
        this._handScene.onPlaybackFinished = this.onPlaybackEnd;

        this.loadData();
    }

    private onPlaybackStart() {
        this._chunks = [];
        this._mediaRecorder.start();
    }

    private onPlaybackEnd() {
        this._mediaRecorder.stop();
    }

    private async loadData() {
        const jsonData = await this.fetchJsonData();
        this.loadHandPoseRecordingData(jsonData);

        const audioFile = await this.fetchWavData();
        this.loadAudioFile(audioFile);

        if (this._onDataLoaded) {
            this._onDataLoaded();
        }
    }

    public loadHandPoseRecordingData(data: IPuppetPoseRecordingData) {
        this._handPoseRecording.loadHandPoseRecordingData(data);
    }

    public loadAudioFile(blob: Blob) {
        this._audioBlob = blob;
    }

    public async startRecording() {
        this._recording = true;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._audioRecorder = new MediaRecorder(stream);

        this._audioRecorder.ondataavailable = (event) => {
            this._audioChunks.push(event.data);
        };

        this._audioRecorder.start();
        this._handPoseRecording.startRecording();
    }

    public stopRecording() {
        this._recording = false;

        this._handPoseRecording.stopRecording(performance.now());

        if (this._audioRecorder) {
            this._audioRecorder.stop();
            this._audioRecorder.onstop = () => {
                this._audioBlob = new Blob(this._audioChunks, { type: 'audio/wav' });
            };
        }
    }

    public playRecording() {
        const pitchShift = new Tone.PitchShift(4).toDestination();
        const audioUrl = URL.createObjectURL(this._audioBlob);
        const player = new Tone.Player(audioUrl).connect(pitchShift);

        Tone.loaded().then(() => {
            player.start();
            this._handScene.playbackRecording(this._handPoseRecording);
            this.onPlaybackStart();
        });
    }

    private onHandPosesDetected(handPoses: IHandPose[]) {
        if (!this._recording) return;

        for (const handPose of handPoses) {
            this._handPoseRecording.recordHandPose(handPose);
        }
    }

    private async fetchJsonData() {
        const response = await fetch("/recordings/data.json");
        return await response.json();
    }

    private async fetchWavData() {
        const response = await fetch("/recordings/audio.wav");
        return await response.blob();
    }

    public get hasRecording(): boolean {
        return this._handPoseRecording.hasRecording;
    }

    public get downloadableHandPoseRecordingData() {
        return this._handPoseRecording.getDownloadableHandPoseRecordingData();
    }
}