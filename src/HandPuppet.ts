import * as THREE from "three";
import { HandSide } from "./IHandPose";
import {IPuppetHandFeatures} from "./IPuppetHandFeatures";

export class HandPuppet extends THREE.Object3D {
    private debugVisualizer: THREE.Object3D;
    private debugMeshes: THREE.Object3D[] = [];
    private palmBox: THREE.Mesh;
    private fingerBox: THREE.Mesh;
    private thumbBox: THREE.Mesh;
    private fingerBoxPivot: THREE.Object3D;
    private thumbBoxPivot: THREE.Object3D;
    private joints: number;
    private leftEye: THREE.Mesh;
    private leftEyePupils: THREE.Mesh;
    private rightEye: THREE.Mesh;
    private rightEyePupils: THREE.Mesh;
    private handCategory: HandSide;

    // Debug meshes
    private wristMesh: THREE.Mesh;
    private handCenterMesh: THREE.Mesh;
    private fingerTopMesh: THREE.Mesh;
    private palmCenterMesh: THREE.Mesh;
    private debugLine: THREE.Line;

    constructor(joints: number, color: THREE.ColorRepresentation, handCategory: HandSide) {
        super();

        this.joints = joints;
        this.handCategory = handCategory;

        this.palmBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({color: 0x333333}));
        this.fingerBox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.02), new THREE.MeshBasicMaterial({color: 0x444444}));
        this.thumbBox = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.02), new THREE.MeshBasicMaterial({color: 0x555555}));

        this.palmBox.visible = true;
        this.fingerBox.visible = true;
        this.thumbBox.visible = true;

        this.fingerBoxPivot = new THREE.Object3D();
        this.thumbBoxPivot = new THREE.Object3D();

        this.fingerBoxPivot.add(this.fingerBox);
        this.thumbBoxPivot.add(this.thumbBox);

        this.fingerBox.position.y = 0.05;
        this.thumbBox.position.y = 0.05;

        this.add(this.palmBox);
        this.add(this.fingerBoxPivot);
        this.add(this.thumbBoxPivot);

        const eyeGeometry = new THREE.SphereGeometry(0.023);
        const eyeMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});

        this.leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        this.rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);

        const pupilGeometry = new THREE.SphereGeometry(0.005);
        const pupilMaterial = new THREE.MeshBasicMaterial({color: 0x000000});

        this.leftEyePupils = new THREE.Mesh(pupilGeometry, pupilMaterial);
        this.rightEyePupils = new THREE.Mesh(pupilGeometry, pupilMaterial);

        this.leftEye.add(this.leftEyePupils);
        this.rightEye.add(this.rightEyePupils);

        this.leftEyePupils.position.set(0, 0.02, 0);
        this.rightEyePupils.position.set(0, 0.02, 0);

        this.fingerBox.add(this.leftEye);
        this.fingerBox.add(this.rightEye);

        if (handCategory === "Left") {
            this.leftEye.position.set(-0.02, 0.02, -0.03);
            this.rightEye.position.set(0.02, 0.02, -0.03);
        } else {
            this.leftEye.position.set(-0.02, 0.02, 0.03);
            this.rightEye.position.set(0.02, 0.02, 0.03);
        }

        {
            this.debugVisualizer = new THREE.Object3D();
            this.add(this.debugVisualizer);

            const material = new THREE.MeshBasicMaterial({color: color});
            const debugGeometry = new THREE.SphereGeometry(0.005);
            const debugMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});

            for (let i = 0; i < joints; i++) {
                const mesh = new THREE.Mesh(debugGeometry, material);

                this.debugVisualizer.add(mesh);
                this.debugMeshes.push(mesh);
            }

            this.wristMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this.handCenterMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this.fingerTopMesh = new THREE.Mesh(debugGeometry, debugMaterial);
            this.palmCenterMesh = new THREE.Mesh(debugGeometry, debugMaterial);

            this.debugVisualizer.add(this.wristMesh);
            this.debugVisualizer.add(this.handCenterMesh);
            this.debugVisualizer.add(this.fingerTopMesh);
            this.debugVisualizer.add(this.palmCenterMesh);

            // this.thumbBoxPivot.add(new THREE.AxesHelper(0.1));

            const debugLineMaterial = new THREE.LineBasicMaterial({color: 0xff0000});
            const debugLinePoints = [];
            debugLinePoints.push(new THREE.Vector3());
            debugLinePoints.push(new THREE.Vector3());

            const debugLineGeometry = new THREE.BufferGeometry().setFromPoints(debugLinePoints);
            this.debugLine = new THREE.Line(debugLineGeometry, debugLineMaterial);
            this.debugVisualizer.add(this.debugLine);

            this.debugVisualizer.visible = false;
        }
    }

    public update(handFeatures: IPuppetHandFeatures) {
        const palmCenter = handFeatures.palmCenter;
        const handCenter = handFeatures.handCenter;
        const wrist = handFeatures.wrist;
        const fingerTop = handFeatures.fingerTop;
        const thumb = handFeatures.thumb;
        const rightPalmDirection = handFeatures.rightPalmDirection;

        {
            this.palmBox.position.copy(palmCenter);

            const upPalmDirection = new THREE.Vector3().subVectors(handCenter, wrist).normalize();
            const palmBoxUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.palmBox.quaternion);
            const palmBoxUpRotation = new THREE.Quaternion().setFromUnitVectors(palmBoxUp, upPalmDirection);
            this.palmBox.rotation.setFromQuaternion(palmBoxUpRotation.multiply(this.palmBox.quaternion));

            const palmBoxRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.palmBox.quaternion);
            const palmBoxRightRotation = new THREE.Quaternion().setFromUnitVectors(palmBoxRight, rightPalmDirection);
            this.palmBox.rotation.setFromQuaternion(palmBoxRightRotation.multiply(this.palmBox.quaternion));
        }

        {
            this.fingerBoxPivot.position.copy(handCenter);

            const upFingerDirection = new THREE.Vector3().subVectors(fingerTop, handCenter).normalize();
            const fingerBoxPivotUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.fingerBoxPivot.quaternion);
            const fingerBoxPivotUpRotation = new THREE.Quaternion().setFromUnitVectors(fingerBoxPivotUp, upFingerDirection);

            this.fingerBoxPivot.rotation.setFromQuaternion(fingerBoxPivotUpRotation.multiply(this.fingerBoxPivot.quaternion));

            const fingerBoxPivotRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.fingerBoxPivot.quaternion);
            const fingerBoxPivotRightRotation = new THREE.Quaternion().setFromUnitVectors(fingerBoxPivotRight, rightPalmDirection);

            this.fingerBoxPivot.rotation.setFromQuaternion(fingerBoxPivotRightRotation.multiply(this.fingerBoxPivot.quaternion));
        }

        {
            this.thumbBoxPivot.position.copy(wrist);

            const upThumbDirection = new THREE.Vector3().subVectors(thumb, wrist).normalize();
            const thumbBoxPivotUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.thumbBoxPivot.quaternion);
            const thumbBoxPivotUpRotation = new THREE.Quaternion().setFromUnitVectors(thumbBoxPivotUp, upThumbDirection);

            this.thumbBoxPivot.rotation.setFromQuaternion(thumbBoxPivotUpRotation.multiply(this.thumbBoxPivot.quaternion));

            const thumbBoxPivotRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.thumbBoxPivot.quaternion);
            const thumbBoxPivotRightRotation = new THREE.Quaternion().setFromUnitVectors(thumbBoxPivotRight, rightPalmDirection);

            this.thumbBoxPivot.rotation.setFromQuaternion(thumbBoxPivotRightRotation.multiply(this.thumbBoxPivot.quaternion));
        }

        // Debug meshes
        this.wristMesh.position.copy(wrist);
        this.handCenterMesh.position.copy(handCenter);
        this.fingerTopMesh.position.copy(fingerTop);
        this.palmCenterMesh.position.copy(palmCenter);

        // for (let i = 0; i < this.joints; i++) {
        //     this.debugMeshes[i].position.copy(positions[i]);
        // }
    }

    private updateDebugLine(start: THREE.Vector3, end: THREE.Vector3) {
        const newPositions = new Float32Array(6);

        newPositions[0] = start.x;
        newPositions[1] = start.y;
        newPositions[2] = start.z;
        newPositions[3] = end.x;
        newPositions[4] = end.y;
        newPositions[5] = end.z;

        this.debugLine.geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
        this.debugLine.geometry.attributes.position.needsUpdate = true;
    }
}