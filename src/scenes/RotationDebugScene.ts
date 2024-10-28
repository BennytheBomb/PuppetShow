import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {Vector3} from "three";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

setup();

function render() {
    renderer.render(scene, camera);
    controls.update();
}

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x777777);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(700, 600);
    document.body.appendChild(renderer.domElement);

    const target = new THREE.AxesHelper(1);
    target.rotateX(-0.1);
    target.rotateY(-0.3);

    const current = new THREE.AxesHelper(1);
    current.rotateX(0.2);
    current.rotateY(1.3);
    current.rotateZ(-2.3);

    const targetUp = new Vector3(0, 1, 0).applyQuaternion(target.quaternion);
    const targetRight = new Vector3(1, 0, 0).applyQuaternion(target.quaternion);
    const targetForward = new Vector3(0, 0, 1).applyQuaternion(target.quaternion);

    const currentUp = new Vector3(0, 1, 0).applyQuaternion(current.quaternion);

    const upRotation = new THREE.Quaternion().setFromUnitVectors(currentUp, targetUp);

    current.rotation.setFromQuaternion(upRotation.multiply(current.quaternion));

    // const currentRight = new Vector3(1, 0, 0).applyQuaternion(current.quaternion);
    // const rightRotation = new THREE.Quaternion().setFromUnitVectors(currentRight, targetRight);
    // current.rotation.setFromQuaternion(rightRotation.multiply(current.quaternion));

    const currentForward = new Vector3(0, 0, 1).applyQuaternion(current.quaternion);
    const forwardRotation = new THREE.Quaternion().setFromUnitVectors(currentForward, targetForward);
    current.rotation.setFromQuaternion(forwardRotation.multiply(current.quaternion));

    scene.add(target);
    scene.add(current);
    // scene.add(new THREE.AxesHelper(1));

    // current.visible = false;

    camera.lookAt(0, 0, 0);
    camera.position.z = 3;

    renderer.render(scene, camera);

    controls = new OrbitControls(camera, renderer.domElement);

    renderer.setAnimationLoop(render);
}