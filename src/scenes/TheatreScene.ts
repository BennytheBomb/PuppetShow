import * as THREE from "three";
import {GLTF, GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
const loader: GLTFLoader = new GLTFLoader();

setup();

function setup() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x777777);
    camera = new THREE.PerspectiveCamera(75, 1.5, 0.1, 100);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(600, 400);
    document.body.appendChild(renderer.domElement);

    //controls = new OrbitControls(camera, renderer.domElement);
    renderer.setAnimationLoop(render);

    const light = new THREE.AmbientLight(0x404040, 4);
    scene.add(light);

    camera.position.set(0, 0.1, 0.2);

    loader.load("../3d-models/theatre.glb", function (gltf: GLTF) {
        scene.add(gltf.scene);
    }, undefined, function (error) {
        console.error(error);
    });
}

function render() {
    renderer.render(scene, camera);
    //controls.update();
}