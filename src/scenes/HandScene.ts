import * as THREE from 'three';
import { HandPuppet } from "../nodes/HandPuppet";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { IPuppetPose } from "../interfaces/IPuppetPose";
import { IPuppetHandFeatures } from "../interfaces/IPuppetHandFeatures";
import { HandPoseRecording } from "../handtracking/HandPoseRecording";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class HandScene {
    private static readonly JOINTS = 21;

    private _scene: THREE.Scene;
    private origin: THREE.Object3D;
    private leftHand: HandPuppet;
    private rightHand: HandPuppet;
    private theatre: THREE.Group;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private isPlaying = false;
    private loader: GLTFLoader = new GLTFLoader();
    private chunks: Blob[] = [];
    private mediaRecorder: MediaRecorder;
    private startPlaybackTime = -1;
    private handPoseRecording: HandPoseRecording;
    private leftHandPoseIndex: number;
    private rightHandPoseIndex: number;
    private _lerpPositions: boolean;

    constructor(lerpPositions = false) {
        this._lerpPositions = lerpPositions;

        const canvas = document.getElementById("scene") as HTMLCanvasElement;
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x000000);
        this.camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.origin = new THREE.Object3D();
        this.origin.add(new THREE.AxesHelper(0.1));
        this._scene.add(this.origin);
        this.origin.rotateY(Math.PI);

        this.leftHand = new HandPuppet(HandScene.JOINTS, 0x00ff00, "Left", this.loader);
        this.rightHand = new HandPuppet(HandScene.JOINTS, 0xff0000, "Right", this.loader);

        this.origin.add(this.leftHand);
        this.origin.add(this.rightHand);

        this.camera.position.set(0, 0, 0.5);
        this.camera.lookAt(0, 0, 0);

        this.leftHand.position.x = 0.2;
        this.leftHand.rotateZ(Math.PI);
        this.rightHand.position.x = -0.2;
        this.rightHand.rotateZ(Math.PI);

        const light = new THREE.AmbientLight(0x404040, 30);
        this._scene.add(light);

        const spotLightLeftHand = new THREE.SpotLight(0xffffff, 0.5, 1, Math.PI / 5);
        spotLightLeftHand.position.copy(this.leftHand.position);
        spotLightLeftHand.position.z += 0.2;
        spotLightLeftHand.position.y += 0.2;
        spotLightLeftHand.target = this.leftHand;

        const spotLightRightHand = new THREE.SpotLight(0xffffff, 0.5, 1, Math.PI / 5);
        spotLightRightHand.position.copy(this.rightHand.position);
        spotLightRightHand.position.z += 0.2;
        spotLightRightHand.position.y += 0.2;
        spotLightRightHand.target = this.rightHand;

        // spotLight.add(new THREE.AxesHelper(0.1));

        this._scene.add(spotLightRightHand);
        this._scene.add(spotLightLeftHand);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.loader.load( "../3d-models/theatre.glb", (gltf: GLTF) => {
            this.theatre = gltf.scene;
            this._scene.add(this.theatre);

            this.theatre.scale.set(3, 2.5, 2.5);
            this.theatre.position.set(0.05, -0.05, 0.2);
        }, undefined, (error) => {
            console.error(error);
        });

        const stream = canvas.captureStream(30);

        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.chunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.chunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);

            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'threejs-recording.webm';
            downloadLink.click();

            URL.revokeObjectURL(url);
        };
    }

    public playbackRecording(handPoseRecording: HandPoseRecording) {
        this.startPlaybackTime = performance.now();
        this.leftHandPoseIndex = 0;
        this.rightHandPoseIndex = 0;
        this.isPlaying = true;
        this.handPoseRecording = handPoseRecording;

        this.render = this.render.bind(this);
        this.renderer.setAnimationLoop(this.render);

        this.onPlaybackStart();
    }

    private updateHand(handPuppet: HandPuppet, puppetPoses: IPuppetPose[], index: number, timeSinceStart: number) {
        if (puppetPoses.length > 0) {
            while (index < puppetPoses.length - 1 && puppetPoses[index].timestamp < timeSinceStart) {
                index++;
            }

            let handFeature: IPuppetHandFeatures;

            if (this._lerpPositions) {
                if (index === puppetPoses.length - 1) {
                    return;
                }

                const currentPuppetPose = puppetPoses[index];
                const nextPuppetPose = puppetPoses[index + 1];
                const duration = nextPuppetPose.timestamp - currentPuppetPose.timestamp;
                const alpha = (timeSinceStart - currentPuppetPose.timestamp) / duration;

                handFeature = this.lerpPuppetHandFeatures(currentPuppetPose.handFeatures, nextPuppetPose.handFeatures, alpha);
            } else {
                handFeature = puppetPoses[index].handFeatures;
            }

            handPuppet.update(handFeature);
        }
    }

    private onPlaybackStart() {
        this.mediaRecorder.start();
    }

    private onPlaybackEnd() {
        this.mediaRecorder.stop();
    }

    private lerpPuppetHandFeatures(currentFeatures: IPuppetHandFeatures, nextFeatures: IPuppetHandFeatures, alpha: number): IPuppetHandFeatures {
        return {
            palmCenter: new THREE.Vector3().lerpVectors(currentFeatures.palmCenter, nextFeatures.palmCenter, alpha),
            handCenter: new THREE.Vector3().lerpVectors(currentFeatures.handCenter, nextFeatures.handCenter, alpha),
            fingerTop: new THREE.Vector3().lerpVectors(currentFeatures.fingerTop, nextFeatures.fingerTop, alpha),
            thumb: new THREE.Vector3().lerpVectors(currentFeatures.thumb, nextFeatures.thumb, alpha),
            wrist: new THREE.Vector3().lerpVectors(currentFeatures.wrist, nextFeatures.wrist, alpha),
            rightPalmDirection: new THREE.Vector3().lerpVectors(currentFeatures.rightPalmDirection, nextFeatures.rightPalmDirection, alpha),
        };
    }

    private render() {
        this.updateHandPoses();

        this.controls.update();
        this.renderer.render(this._scene, this.camera);
    }

    private updateHandPoses() {
        if (!this.handPoseRecording) return;

        const leftHandPoses = this.handPoseRecording.leftHandPoses;
        const rightHandPoses = this.handPoseRecording.rightHandPoses;
        const currentTime = performance.now();

        const timeSinceStart = currentTime - this.startPlaybackTime;

        if (timeSinceStart <= this.handPoseRecording.duration) {
            this.updateHand(this.leftHand, leftHandPoses, this.leftHandPoseIndex, timeSinceStart);
            this.updateHand(this.rightHand, rightHandPoses, this.rightHandPoseIndex, timeSinceStart);
        } else if (this.isPlaying) {
            this.isPlaying = false;
            this.onPlaybackEnd();
        }
    }
}