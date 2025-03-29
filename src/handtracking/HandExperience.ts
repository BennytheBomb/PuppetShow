import {IPuppetPoseRecordingData} from "../interfaces/IPuppetPoseRecordingData";
import {HandPoseRecording} from "./HandPoseRecording";
import * as Tone from "tone";
import {HandScene} from "../scenes/HandScene";
import {HandTracking} from "./HandTracking";
import {IHandPose} from "../interfaces/IHandPose";

export class HandExperience {
    private readonly _pitchShift: Tone.PitchShift;

    private _handPoseRecording: HandPoseRecording = new HandPoseRecording();
    private _audioBlob!: Blob;
    private _audioRecorder!: MediaRecorder;
    private _audioChunks: BlobPart[] = [];
    private _handTracking: HandTracking;
    private _handScene: HandScene;
    private _chunks: Blob[] = [];
    private _mediaRecorder!: MediaRecorder;
    private _player: Tone.Player;
    private _threeCanvas: HTMLCanvasElement;

    constructor(video: HTMLVideoElement, canvasElement: HTMLCanvasElement, canvasCtx: CanvasRenderingContext2D, threeCanvas: HTMLCanvasElement) {
        this._handTracking = new HandTracking(video, canvasElement, canvasCtx);

        this._threeCanvas = threeCanvas;

        this.onHandPosesDetected = this.onHandPosesDetected.bind(this);
        this._handTracking.handPosesDetectedCallback = this.onHandPosesDetected;

        this._handScene = new HandScene(threeCanvas);

        this.onPlaybackEnd = this.onPlaybackEnd.bind(this);
        this._handScene.onPlaybackFinished = this.onPlaybackEnd;

        this._pitchShift = new Tone.PitchShift(4).toDestination();
        this._player = new Tone.Player();

        this.init();
    }

    private _onDataLoaded!: (success: boolean) => void;

    public set onDataLoaded(value: (success: boolean) => void) {
        this._onDataLoaded = value;
    }

    private _onNewVideoRecording!: (blob: Blob) => void;

    public set onNewVideoRecording(value: (blob: Blob) => void) {
        this._onNewVideoRecording = value;
    }

    private _onNewAudioRecording!: (blob: Blob) => void;

    public set onNewAudioRecording(value: (blob: Blob) => void) {
        this._onNewAudioRecording = value;
    }

    private _recording: Boolean = false;

    public get recording(): Boolean {
        return this._recording;
    }

    public get hasRecording(): boolean {
        return this._handPoseRecording.hasRecording;
    }

    public get downloadableHandPoseRecordingData() {
        return this._handPoseRecording.getDownloadableHandPoseRecordingData();
    }

    public setAccessoryVisible(visible: boolean) {
        this._handScene.setAccessoryVisible(visible);
    }

    public loadHandPoseRecordingData(data: IPuppetPoseRecordingData) {
        this._handPoseRecording.loadHandPoseRecordingData(data);
    }

    public setPitchShift(value: number) {
        this._pitchShift.pitch = value;
    }

    public loadAudioFile(blob: Blob) {
        this._audioBlob = blob;
        if (this._onNewAudioRecording) this._onNewAudioRecording(this._audioBlob);
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
        this._player.stop();
        // this._mediaRecorder.stop();

        const audioUrl = URL.createObjectURL(this._audioBlob);
        await this._player.load(audioUrl);
        this.onPlaybackStart(recordVideo);
    }

    private async init() {
        await this.loadData();
        await this.setupAudioRecorder();
    }

    private async setupAudioRecorder() {
        const audioStream = await navigator.mediaDevices.getUserMedia({audio: true});
        this._audioRecorder = new MediaRecorder(audioStream);

        this._audioRecorder.ondataavailable = (event) => {
            this._audioChunks.push(event.data);
        };

        this._audioRecorder.onstop = () => {
            this._audioBlob = new Blob(this._audioChunks, {type: 'audio/wav'});
            if (this._onNewAudioRecording) this._onNewAudioRecording(this._audioBlob);
        };
    }

    private recordVideo() {
        this._chunks = [];
        const videoStream = this._threeCanvas.captureStream(30);

        const audioContext = this._player.context;
        const mediaStreamDestination = audioContext.createMediaStreamDestination();

        this._pitchShift.connect(mediaStreamDestination);

        const audioStream = mediaStreamDestination.stream;
        const combinedStream = new MediaStream([...videoStream.getTracks(), ...audioStream.getTracks()]);

        this._mediaRecorder = new MediaRecorder(combinedStream, {mimeType: 'video/webm'});

        this._mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this._chunks.push(event.data);
            }
        };

        this._mediaRecorder.onstop = () => {
            const blob = new Blob(this._chunks, {type: 'video/webm'});
            this._onNewVideoRecording(blob);
        };

        this._mediaRecorder.start();
    }

    private onPlaybackStart(recordVideo: boolean) {
        this._player.connect(this._pitchShift);

        if (recordVideo) this.recordVideo();

        this._player.start();
        this._handScene.playbackRecording(this._handPoseRecording);
    }

    private onPlaybackEnd() {
        this._mediaRecorder?.stop();
    }

    private async loadData() {
        let success = true;
        const jsonData = await this.fetchJsonData();
        if (jsonData) this.loadHandPoseRecordingData(jsonData);
        else success = false;

        const audioFile = await this.fetchWavData();
        if (audioFile) this.loadAudioFile(audioFile);
        else success = false;

        if (this._onDataLoaded) {
            this._onDataLoaded(success);
        }
    }

    private onHandPosesDetected(handPoses: IHandPose[]) {
        if (!this._recording) return;

        for (const handPose of handPoses) {
            this._handPoseRecording.recordHandPose(handPose);
        }
    }

    private async fetchJsonData() {
        try {
            const response = await fetch("./recordings/data.json");
            if (response.ok) return await response.json();
        } catch (error) {
            console.warn("Can't fetch pre-recorded json:", error);
        }
        return null;
    }

    private async fetchWavData() {
        try {
            const response = await fetch("./recordings/audio.wav");
            if (response.ok) return await response.blob();
        } catch (error) {
            console.error("Can't fetch pre-recorded audio:", error);
        }
        return null;
    }
}