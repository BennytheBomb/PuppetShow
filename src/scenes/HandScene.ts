import * as THREE from 'three';
import { HandPuppet } from "../nodes/HandPuppet";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { IPuppetPose } from "../interfaces/IPuppetPose";
import { IPuppetHandFeatures } from "../interfaces/IPuppetHandFeatures";
import { HandPoseRecording } from "../handtracking/HandPoseRecording";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export class HandScene {
    private static readonly JOINTS = 21;

    private _onPlaybackFinished!: () => void;

    private readonly _scene: THREE.Scene;
    private readonly _origin: THREE.Object3D;
    private readonly _leftHand: HandPuppet;
    private readonly _rightHand: HandPuppet;
    private readonly _camera: THREE.PerspectiveCamera;
    private readonly _lerpPositions: boolean;

    private _theatre!: THREE.Group;
    private _handPoseRecording!: HandPoseRecording;
    private _leftHandPoseIndex!: number;
    private _rightHandPoseIndex!: number;
    private _renderer: THREE.WebGLRenderer;
    private _controls: OrbitControls;
    private _isPlaying = false;
    private _loader: GLTFLoader = new GLTFLoader();
    private _startPlaybackTime = -1;

    public set onPlaybackFinished(callback: () => void) {
        this._onPlaybackFinished = callback;
    }

    constructor(canvas: HTMLCanvasElement, lerpPositions = false) {
        this._lerpPositions = lerpPositions;

        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x000000);
        this._camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 100);

        this._renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        });
        this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this._origin = new THREE.Object3D();
        this._origin.add(new THREE.AxesHelper(0.1));
        this._scene.add(this._origin);
        this._origin.rotateY(Math.PI);

        this._leftHand = new HandPuppet(HandScene.JOINTS, 0x00ff00, "Left", this._loader);
        this._rightHand = new HandPuppet(HandScene.JOINTS, 0xff0000, "Right", this._loader);

        this._origin.add(this._leftHand);
        this._origin.add(this._rightHand);

        this._camera.position.set(0, 0, 0.5);
        this._camera.lookAt(0, 0, 0);

        this._leftHand.position.x = 0.2;
        this._leftHand.rotateZ(Math.PI);
        this._rightHand.position.x = -0.2;
        this._rightHand.rotateZ(Math.PI);

        const light = new THREE.AmbientLight(0x404040, 30);
        this._scene.add(light);

        const spotLightLeftHand = new THREE.SpotLight(0xffffff, 0.5, 1, Math.PI / 5);
        spotLightLeftHand.position.copy(this._leftHand.position);
        spotLightLeftHand.position.z += 0.2;
        spotLightLeftHand.position.y += 0.2;
        spotLightLeftHand.target = this._leftHand;

        const spotLightRightHand = new THREE.SpotLight(0xffffff, 0.5, 1, Math.PI / 5);
        spotLightRightHand.position.copy(this._rightHand.position);
        spotLightRightHand.position.z += 0.2;
        spotLightRightHand.position.y += 0.2;
        spotLightRightHand.target = this._rightHand;

        // spotLight.add(new THREE.AxesHelper(0.1));

        this._scene.add(spotLightRightHand);
        this._scene.add(spotLightLeftHand);

        this._controls = new OrbitControls(this._camera, this._renderer.domElement);

        this._loader.load( "../3d-models/theatre.glb", (gltf: GLTF) => {
            this._theatre = gltf.scene;
            this._scene.add(this._theatre);

            this._theatre.scale.set(3, 2.5, 2.5);
            this._theatre.position.set(0.05, -0.05, 0.2);
        }, undefined, (error) => {
            console.error(error);
        });
    }

    public playbackRecording(handPoseRecording: HandPoseRecording) {
        this._startPlaybackTime = performance.now();
        this._leftHandPoseIndex = 0;
        this._rightHandPoseIndex = 0;
        this._isPlaying = true;
        this._handPoseRecording = handPoseRecording;

        this.render = this.render.bind(this);
        this._renderer.setAnimationLoop(this.render);
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

        this._controls.update();
        this._renderer.render(this._scene, this._camera);
    }

    private updateHandPoses() {
        if (!this._handPoseRecording) return;

        const leftHandPoses = this._handPoseRecording.leftHandPoses;
        const rightHandPoses = this._handPoseRecording.rightHandPoses;
        const currentTime = performance.now();

        const timeSinceStart = currentTime - this._startPlaybackTime;

        if (timeSinceStart <= this._handPoseRecording.duration) {
            this.updateHand(this._leftHand, leftHandPoses, this._leftHandPoseIndex, timeSinceStart);
            this.updateHand(this._rightHand, rightHandPoses, this._rightHandPoseIndex, timeSinceStart);
        } else if (this._isPlaying) {
            this._isPlaying = false;
            this._onPlaybackFinished();
        }
    }
}