import * as THREE from 'three';
import { handPoses } from "./HandDemo";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

let scene: THREE.Scene;
let origin: THREE.Object3D;
let leftHand: THREE.Object3D;
let rightHand: THREE.Object3D;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let leftCubes: THREE.Mesh[] = [];
let rightCubes: THREE.Mesh[] = [];
let controls: OrbitControls;

let leftHandBox: THREE.Mesh;

const joints = 21;

setup();

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x777777);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(500, 300);
    document.body.appendChild(renderer.domElement);

    origin = new THREE.Object3D();
    origin.add(new THREE.AxesHelper(0.1));
    scene.add(origin);

    leftHand = new THREE.Object3D();
    rightHand = new THREE.Object3D();

    origin.add(leftHand);
    origin.add(rightHand);

    const sphereGeometry = new THREE.SphereGeometry(0.005);
    const leftMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
    const rightMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});

    for (let i = 0; i < joints; i++) {
        const leftCube = new THREE.Mesh(sphereGeometry, leftMaterial);
        const rightCube = new THREE.Mesh(sphereGeometry, rightMaterial);

        leftHand.add(leftCube);
        rightHand.add(rightCube);

        leftCubes.push(leftCube);
        rightCubes.push(rightCube);
    }

    leftHandBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.01), new THREE.MeshBasicMaterial({color: 0x00ff00}));
    leftHand.add(leftHandBox);

    camera.position.set(0, 0, 0.5);
    camera.lookAt(0, 0, 0);

    leftHand.position.x = 0.2;
    rightHand.position.x = -0.2;

    leftHand.rotateZ(Math.PI)

    controls = new OrbitControls(camera, renderer.domElement);

    renderer.setAnimationLoop(render);
}

function render() {
    for (let handPose of handPoses) {
        if (handPose.side === "Right") continue;

        const cubes = handPose.side === "Left" ? leftCubes : rightCubes;

        const top = new THREE.Vector3();
        top.add(handPose.positions[5]);
        top.add(handPose.positions[9]);
        top.add(handPose.positions[13]);
        top.add(handPose.positions[17]);
        top.divideScalar(4);

        const bottom = handPose.positions[0];

        const center = new THREE.Vector3();
        center.add(top);
        center.add(bottom);
        center.divideScalar(2);

        const direction = new THREE.Vector3();
        direction.subVectors(top, bottom);

        leftHandBox.position.copy(center);
        leftHandBox.rotation.setFromVector3(direction);

        for (let i = 0; i < joints; i++) {
            cubes[i].position.x = handPose.positions[i].x;
            cubes[i].position.y = handPose.positions[i].y;
            cubes[i].position.z = handPose.positions[i].z;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}