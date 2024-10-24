import * as THREE from 'three';
import {handPoseRecording, handPoses} from "./HandDemo";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Hand } from "./Hand";

let scene: THREE.Scene;
let origin: THREE.Object3D;
let leftHand: Hand;
let rightHand: Hand;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

let startPlaybackTime = -1;

const joints = 21;

setup();

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x777777);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(600, 400);
    document.body.appendChild(renderer.domElement);

    origin = new THREE.Object3D();
    origin.add(new THREE.AxesHelper(0.1));
    scene.add(origin);

    leftHand = new Hand(joints, 0x00ff00, "Left");
    rightHand = new Hand(joints, 0xff0000, "Right");

    origin.add(leftHand);
    origin.add(rightHand);

    camera.position.set(0, 0, 0.5);
    camera.lookAt(0, 0, 0);

    leftHand.position.x = 0.2;
    leftHand.rotateZ(Math.PI);
    rightHand.position.x = -0.2;
    rightHand.rotateZ(Math.PI);

    controls = new OrbitControls(camera, renderer.domElement);
}

export function playbackRecording() {
    startPlaybackTime = performance.now();
    leftHandPoseIndex = 0;
    rightHandPoseIndex = 0;

    renderer.setAnimationLoop(render);
}

let leftHandPoseIndex: number;
let rightHandPoseIndex: number;

function render() {
    const leftHandPoses = handPoseRecording.leftHandPoses;
    const rightHandPoses = handPoseRecording.rightHandPoses;
    const currentTime = performance.now();

    const timeSinceStart = currentTime - startPlaybackTime;

    if (timeSinceStart <= handPoseRecording.duration) {
        while (leftHandPoseIndex < leftHandPoses.length - 1 && leftHandPoses[leftHandPoseIndex].timestamp < timeSinceStart) {
            leftHandPoseIndex++;
        }

        leftHand.update(leftHandPoses[leftHandPoseIndex].positions);

        while (rightHandPoseIndex < rightHandPoses.length - 1 && rightHandPoses[rightHandPoseIndex].timestamp < timeSinceStart) {
            rightHandPoseIndex++;
        }

        rightHand.update(rightHandPoses[rightHandPoseIndex].positions);
    }

    controls.update();
    renderer.render(scene, camera);
}