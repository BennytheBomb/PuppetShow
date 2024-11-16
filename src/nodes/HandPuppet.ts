import * as THREE from "three";
import {HandSide} from "../interfaces/IHandPose";
import {IPuppetHandFeatures} from "../interfaces/IPuppetHandFeatures";
import {GLTF, GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

export class HandPuppet extends THREE.Object3D {
    private readonly _palmBox: THREE.Mesh;
    private readonly _fingerBox: THREE.Mesh;
    private readonly _thumbBox: THREE.Mesh;
    private readonly _fingerBoxPivot: THREE.Object3D;
    private readonly _thumbBoxPivot: THREE.Object3D;
    private readonly _leftEye: THREE.Mesh;
    private readonly _leftEyePupils: THREE.Mesh;
    private readonly _rightEye: THREE.Mesh;
    private readonly _rightEyePupils: THREE.Mesh;

    private _accessory!: THREE.Group;
    // private _joints: number;
    // private _handCategory: HandSide;

    // Debug meshes
    private readonly _debugVisualizer: THREE.Object3D;
    private _debugMeshes: THREE.Object3D[] = [];
    private readonly _wristMesh: THREE.Mesh;
    private readonly _handCenterMesh: THREE.Mesh;
    private readonly _fingerTopMesh: THREE.Mesh;
    private readonly _palmCenterMesh: THREE.Mesh;
    private readonly _debugLine: THREE.Line;

    constructor(joints: number, color: THREE.ColorRepresentation, handCategory: HandSide, loader: GLTFLoader) {
        super();

        // this._joints = joints;
        // this._handCategory = handCategory;

        this._palmBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({color: 0x333333}));
        this._fingerBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({color: 0x444444}));
        this._thumbBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.02), new THREE.MeshBasicMaterial({color: 0x555555}));

        this._palmBox.visible = true;
        this._fingerBox.visible = true;
        this._thumbBox.visible = true;

        this._fingerBoxPivot = new THREE.Object3D();
        this._thumbBoxPivot = new THREE.Object3D();

        this._fingerBoxPivot.add(this._fingerBox);
        this._thumbBoxPivot.add(this._thumbBox);

        this._fingerBox.position.y = 0.05;
        this._thumbBox.position.y = 0.05;

        this.add(this._palmBox);
        this.add(this._fingerBoxPivot);
        this.add(this._thumbBoxPivot);

        const eyeGeometry = new THREE.SphereGeometry(0.023);
        const eyeMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});

        this._leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this._rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

        const pupilGeometry = new THREE.SphereGeometry(0.005);
        const pupilMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

        this._leftEyePupils = new THREE.Mesh(pupilGeometry, pupilMaterial);
        this._rightEyePupils = new THREE.Mesh(pupilGeometry, pupilMaterial);

        this._leftEye.add(this._leftEyePupils);
        this._rightEye.add(this._rightEyePupils);

        this._leftEyePupils.position.set(0, 0.02, 0);
        this._rightEyePupils.position.set(0, 0.02, 0);

        this._fingerBox.add(this._leftEye);
        this._fingerBox.add(this._rightEye);

        this.setupHandAppearance(handCategory, loader);

        {
            this._debugVisualizer = new THREE.Object3D();
            this.add(this._debugVisualizer);

            const material = new THREE.MeshBasicMaterial({color: color});
            const debugGeometry = new THREE.SphereGeometry(0.005);
            const debugMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});

            for (let i = 0; i < joints; i++) {
                const mesh = new THREE.Mesh(debugGeometry, material);

                this._debugVisualizer.add(mesh);
                this._debugMeshes.push(mesh);
            }

            this._wristMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this._handCenterMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this._fingerTopMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this._palmCenterMesh = new THREE.Mesh(debugGeometry, debugMaterial);

            this._debugVisualizer.add(this._wristMesh);
            this._debugVisualizer.add(this._handCenterMesh);
            this._debugVisualizer.add(this._fingerTopMesh);
            this._debugVisualizer.add(this._palmCenterMesh);

            const debugLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
            const debugLinePoints = [];
            debugLinePoints.push(new THREE.Vector3());
            debugLinePoints.push(new THREE.Vector3());

            const debugLineGeometry = new THREE.BufferGeometry().setFromPoints(debugLinePoints);
            this._debugLine = new THREE.Line(debugLineGeometry, debugLineMaterial);
            this._debugVisualizer.add(this._debugLine);

            this._debugVisualizer.visible = false;
        }
    }

    public setAccessoryVisible(visible: boolean) {
        this._accessory.visible = visible;
    }

    public update(handFeatures: IPuppetHandFeatures) {
        const palmCenter = handFeatures.palmCenter;
        const handCenter = handFeatures.handCenter;
        const wrist = handFeatures.wrist;
        const fingerTop = handFeatures.fingerTop;
        const thumb = handFeatures.thumb;
        const rightPalmDirection = handFeatures.rightPalmDirection;

        {
            this._palmBox.position.copy(palmCenter);

            const upPalmDirection = new THREE.Vector3().subVectors(handCenter, wrist).normalize();
            const palmBoxUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this._palmBox.quaternion);
            const palmBoxUpRotation = new THREE.Quaternion().setFromUnitVectors(palmBoxUp, upPalmDirection);
            this._palmBox.rotation.setFromQuaternion(palmBoxUpRotation.multiply(this._palmBox.quaternion));

            const palmBoxRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this._palmBox.quaternion);
            const palmBoxRightRotation = new THREE.Quaternion().setFromUnitVectors(palmBoxRight, rightPalmDirection);
            this._palmBox.rotation.setFromQuaternion(palmBoxRightRotation.multiply(this._palmBox.quaternion));
        }

        {
            this._fingerBoxPivot.position.copy(handCenter);

            const upFingerDirection = new THREE.Vector3().subVectors(fingerTop, handCenter).normalize();
            const fingerBoxPivotUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this._fingerBoxPivot.quaternion);
            const fingerBoxPivotUpRotation = new THREE.Quaternion().setFromUnitVectors(fingerBoxPivotUp, upFingerDirection);

            this._fingerBoxPivot.rotation.setFromQuaternion(fingerBoxPivotUpRotation.multiply(this._fingerBoxPivot.quaternion));

            const fingerBoxPivotRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this._fingerBoxPivot.quaternion);
            const fingerBoxPivotRightRotation = new THREE.Quaternion().setFromUnitVectors(fingerBoxPivotRight, rightPalmDirection);

            this._fingerBoxPivot.rotation.setFromQuaternion(fingerBoxPivotRightRotation.multiply(this._fingerBoxPivot.quaternion));
        }

        {
            this._thumbBoxPivot.position.copy(wrist);

            const upThumbDirection = new THREE.Vector3().subVectors(thumb, wrist).normalize();
            const thumbBoxPivotUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this._thumbBoxPivot.quaternion);
            const thumbBoxPivotUpRotation = new THREE.Quaternion().setFromUnitVectors(thumbBoxPivotUp, upThumbDirection);

            this._thumbBoxPivot.rotation.setFromQuaternion(thumbBoxPivotUpRotation.multiply(this._thumbBoxPivot.quaternion));

            const thumbBoxPivotRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this._thumbBoxPivot.quaternion);
            const thumbBoxPivotRightRotation = new THREE.Quaternion().setFromUnitVectors(thumbBoxPivotRight, rightPalmDirection);

            this._thumbBoxPivot.rotation.setFromQuaternion(thumbBoxPivotRightRotation.multiply(this._thumbBoxPivot.quaternion));
        }

        // Debug meshes
        this._wristMesh.position.copy(wrist);
        this._handCenterMesh.position.copy(handCenter);
        this._fingerTopMesh.position.copy(fingerTop);
        this._palmCenterMesh.position.copy(palmCenter);

        // for (let i = 0; i < this.joints; i++) {
        //     this.debugMeshes[i].position.copy(positions[i]);
        // }
    }

    private setupHandAppearance(handCategory: HandSide, loader: GLTFLoader) {
        if (handCategory === "Left") {
            this.setupLeftHandAppearance(loader);
        } else {
            this.setupRightHandAppearance(loader);
        }
    }

    private setupRightHandAppearance(loader: GLTFLoader) {
        this._leftEye.position.set(-0.02, 0.02, 0.03);
        this._rightEye.position.set(0.02, 0.02, 0.03);

        loader.load("./3d-models/glasses.glb", (gltf: GLTF) => {
            this._accessory = gltf.scene;
            this._fingerBox.add(this._accessory);
            this._accessory.rotateX(-Math.PI / 2);
            this._accessory.rotateZ(Math.PI);
            this._accessory.position.set(0, 0.05, 0);
            this._accessory.scale.set(0.003, 0.005, 0.005);
        }, undefined, function (error) {
            console.error(error);
        });
    }

    private setupLeftHandAppearance(loader: GLTFLoader) {
        this._leftEye.position.set(-0.02, 0.02, -0.03);
        this._rightEye.position.set(0.02, 0.02, -0.03);

        loader.load("./3d-models/top_hat.glb", (gltf: GLTF) => {
            this._accessory = gltf.scene;
            this._fingerBox.add(this._accessory);
            this._accessory.rotateX(-Math.PI / 2 - 0.7);
            this._accessory.position.set(0, -0.02, -0.025);
            this._accessory.scale.set(0.007, 0.007, 0.007);
        }, undefined, function (error) {
            console.error(error);
        });
    }

    // private updateDebugLine(start: THREE.Vector3, end: THREE.Vector3) {
    //     const newPositions = new Float32Array(6);
    //
    //     newPositions[0] = start.x;
    //     newPositions[1] = start.y;
    //     newPositions[2] = start.z;
    //     newPositions[3] = end.x;
    //     newPositions[4] = end.y;
    //     newPositions[5] = end.z;
    //
    //     this._debugLine.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    //     this._debugLine.geometry.attributes.position.needsUpdate = true;
    // }
}