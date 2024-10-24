import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;

setup();

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x777777);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(700, 600);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
    controls.update();
}