import { IPuppetPoseRecordingData } from "../interfaces/IPuppetPoseRecordingData";
import { HandPoseRecording } from "./HandPoseRecording";
import * as Tone from "tone";
import { HandScene } from "../scenes/HandScene";
import { HandTracking } from "./HandTracking";
import { IHandPose } from "../interfaces/IHandPose";

export class HandExperience {
    private _onDataLoaded!: () => void;
    private _onNewVideoRecording!: (blob: Blob) => void;
    private _onNewAudioRecording!: (blob: Blob) => void;

    private _handPoseRecording: HandPoseRecording = new HandPoseRecording();
    private _audioBlob!: Blob;
    private _audioRecorder!: MediaRecorder;
    private _audioChunks: BlobPart[] = [];
    private _recording: Boolean = false;
    private _handTracking: HandTracking;
    private _handScene: HandScene;
    private _chunks: Blob[] = [];
    private _mediaRecorder!: MediaRecorder;
    private player: Tone.Player;

    public set onDataLoaded(value: () => void) {
        this._onDataLoaded = value;
    }

    public set onNewVideoRecording(value: (blob: Blob) => void) {
        this._onNewVideoRecording = value;
    }

    public set onNewAudioRecording(value: (blob: Blob) => void) {
        this._onNewAudioRecording = value;
    }

    public get recording(): Boolean {
        return this._recording;
    }

    constructor(video: HTMLVideoElement, canvasElement: HTMLCanvasElement, canvasCtx: CanvasRenderingContext2D, threeCanvas: HTMLCanvasElement) {
        this._handTracking = new HandTracking(video, canvasElement, canvasCtx);

        this.onHandPosesDetected = this.onHandPosesDetected.bind(this);
        this._handTracking.handPosesDetectedCallback = this.onHandPosesDetected;

        this._handScene = new HandScene(threeCanvas);

        this.onPlaybackEnd = this.onPlaybackEnd.bind(this);
        this._handScene.onPlaybackFinished = this.onPlaybackEnd;

        // TODO: make pitch shift field and adjustable during runtime
        const pitchShift = new Tone.PitchShift(4).toDestination();
        this.player = new Tone.Player().connect(pitchShift);

        this.init(threeCanvas);
    }

    private async init(canvas: HTMLCanvasElement) {
        await this.loadData();
        await this.setupMediaRecorder(canvas);
    }

    private async setupMediaRecorder(canvas: HTMLCanvasElement) {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this._audioRecorder = new MediaRecorder(audioStream);

        this._audioRecorder.ondataavailable = (event) => {
            this._audioChunks.push(event.data);
        };

        this._audioRecorder.onstop = () => {
            this._audioBlob = new Blob(this._audioChunks, { type: 'audio/wav' });
            this._onNewAudioRecording(this._audioBlob);
        };

        const videoStream = canvas.captureStream(30);

        this._mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });

        this._mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this._chunks.push(event.data);
            }
        };

        this._mediaRecorder.onstop = () => {
            const blob = new Blob(this._chunks, { type: 'video/webm' });
            this._onNewVideoRecording(blob);
        };
    }

    private onPlaybackStart(recordVideo: boolean) {
        this.player.start();
        this._handScene.playbackRecording(this._handPoseRecording);

        this._chunks = [];

        if (recordVideo) this._mediaRecorder.start();
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
        this._onNewAudioRecording(this._audioBlob);
    }

    public async startRecording() {
        this._recording = true;

        this._handTracking.recording = true;

        this._audioRecorder.start();
        this._handPoseRecording.startRecording();
    }

    public stopRecording() {
        this._recording = false;

        this._handTracking.recording = false;

        this._handPoseRecording.stopRecording(performance.now());

        if (this._audioRecorder) {
            this._audioRecorder.stop();
        }
    }

    public async playRecording(recordVideo: boolean) {
        this.player.stop();
        this._mediaRecorder.stop();

        const audioUrl = URL.createObjectURL(this._audioBlob);
        await this.player.load(audioUrl);
        this.onPlaybackStart(recordVideo);
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