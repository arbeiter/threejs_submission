import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';

let backgroundVideoGlobal; // Define a reference to the background video element globally
// Canvas
const canvas = document.querySelector('canvas.webgl')
// Scene
const scene = new THREE.Scene()
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Import the GLTFLoader
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { cameraPosition } from 'three/webgpu';
let videoGlobal; // Define a reference to the video element globally
// Variables for mouse position
const mouse = new THREE.Vector2();
const vector = new THREE.Vector3(); // To hold the projected position in 3D space


function computeMeshCenter(mesh) {
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    return center;
}
function setupCamera(gltf, boundingBox) {

    if (gltf.cameras && gltf.cameras.length > 0) {
        const importedCamera = gltf.cameras[0];

        // Create a new PerspectiveCamera using imported properties
        camera = new THREE.PerspectiveCamera(
            importedCamera.fov, // Convert FOV from radians to degrees
            1920/1080,
            importedCamera.near,
            importedCamera.far 
        );
        const size = boundingBox.getSize(new THREE.Vector3()).length();
        camera.near = size / 100;
        camera.far = size * 100;
        camera.updateProjectionMatrix();
        importCameraSettingsFromGltf(importedCamera);
        const cameraHelper = new THREE.CameraHelper(camera);
        scene.add(cameraHelper);
    }

    function importCameraSettingsFromGltf(importedCamera) {
        if (importedCamera.position && importedCamera.position instanceof THREE.Vector3) {
            camera.position.copy(importedCamera.position);
        }
        cameraScale = importedCamera.scale;
        camera.scale.copy(importedCamera.scale);
        const cameraEuler = new THREE.Euler(
            importedCamera.userData.euler_rotation[0], // X-axis rotation (in radians)
            0, // Y-axis rotation (in radians)
            importedCamera.userData.euler_rotation[2], // Z-axis rotation (in radians)
            'XYZ' // Use 'XYZ' as the rotation order
        );
        camera.rotation.copy(cameraEuler);
        let cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        console.log("CAMERA DIR", cameraDirection);
        camera.updateProjectionMatrix();
    }
}

let added = false;
function createCameraFromBoundingBox(planeCenter, boundingBox, fov) {
    const maxDim = Math.max(boundingBox.max.x, boundingBox.max.y, boundingBox.max.z);
    const fovDegree = THREE.MathUtils.degToRad(fov); // Convert FOV to radians
    const cameraDistance = (maxDim / 2) / Math.atan(fovDegree / 2); // Distance based on FOV and object size

    const bbox_center = new THREE.Vector3();
    boundingBox.getCenter(bbox_center);
    camera.lookAt(planeCenter);
 
    const size = boundingBox.getSize(new THREE.Vector3()).length();
    camera.near = size / 100;
    camera.far = size * 100;
    camera.updateProjectionMatrix();
    
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
}

function getCenterPoint(mesh) {
    var geometry = mesh.geometry;
    geometry.computeBoundingBox();
    var center = new THREE.Vector3();
    geometry.boundingBox.getCenter( center );
    return center;
}

function applyVideoTexture(meshMaterial, isBackground) {
    // video_texture_name
    // Access custom properties from mesh.userData.extras
    const extras = meshMaterial.userData.video_texture_paths;
    const videoPath = extras;

    // Create a video element
    const video = document.createElement('video');
    video.src = videoPath; // Set the source to the video path
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true; // Mute to allow autoplay without user interaction
    // Create a VideoTexture from the video element
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    // Clone the mesh's material to avoid affecting other meshes
    const material = meshMaterial.clone();
    material.transparent = true; // Enable transparency
    material.side = THREE.DoubleSide;
    if(isBackground) {
        backgroundVideoGlobal =  video;
    }

    // Assign the VideoTexture to the material's map
    material.map = videoTexture;
    console.log(`Applied video texture "${videoPath}" to mesh "${meshMaterial.name}".`);
    videoGlobal = video;
    return material;
}

const clock = new THREE.Clock();
const stats = new Stats();
const sizes = {
    width: 2000,
    height: 2000
}

let camera = null
let controls = null
const renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true 
})
renderer.setSize(1440, 810);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const container = document.getElementById('container');
container.appendChild(renderer.domElement);

let angle = 0.0;
function animate() {
    const delta = clock.getDelta();
    mixer.update(delta);
    // controls.update(delta);
    console.log('Camera Parameters:', {
        position: camera.position,
        rotation: camera.rotation,
        quaternion: camera.quaternion,
        scale: camera.scale,
        fov: camera.fov,
        aspect: camera.aspect,
        near: camera.near,
        far: camera.far
    });
    renderer.render(scene, camera);
}

scene.background = new THREE.Color('grey');

let mixer;
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
let decoderPath = 'https://www.gstatic.com/draco/v1/decoders/';
dracoLoader.setDecoderPath(decoderPath);

loader.setDRACOLoader(dracoLoader);
renderer.setPixelRatio(window.devicePixelRatio);

loader.load('output.glb', function (gltf) {
    const model = gltf.scene;
    scene.add( model );
    let fov = 34;

    mixer = new THREE.AnimationMixer(model);
    let i = 0;
    for (i = 0; i < gltf.animations.length; i++) {
        mixer.clipAction(gltf.animations[i]).play();
    }
    camera = new THREE.PerspectiveCamera(
        fov, // FOV in degrees
        1920/1080,
        1,
        100000
    );

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft white light
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(10, 20, 10);
    pointLight.castShadow = true;
    scene.add(pointLight);


    // Create a texture loader to load the image
    const textureLoader = new THREE.TextureLoader();
    const planeTexture = textureLoader.load('hero.png', (texture) => {
        // Flip the texture horizontally
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1; // Flip horizontally
        texture.needsUpdate = true; // Ensure the texture updates
    });
    const material = new THREE.MeshBasicMaterial({
        map: planeTexture
    });


    let isBackground;
    let planeCenter;
    let cameraPos;
    let boundingBox = new THREE.Box3();
    {
        model.traverse((child) => {
            if (child.isMesh) {
                boundingBox.expandByObject(child);
            }

            if(child.name.startsWith("CameraPlane")) {
                cameraPos = computeMeshCenter(child);
            } else if (child.name.startsWith("BG")) {
                planeCenter = getCenterPoint(child);
                child.material = material;
                isBackground = true;
            } else if (child.isMesh) {
                isBackground = false
                if (child.material.userData.video_texture_paths) {
                    const videoMaterial = applyVideoTexture(child.material, isBackground);
                    child.material = videoMaterial;
                    videoMaterial.needsUpdate = true;
                    child.transparent = true;
                    child.material.opacity = 1.0;
                } 
            }
        });
    }
    const helper = new THREE.Box3Helper( boundingBox, 0xffff00 );
    scene.add( helper );
    createCameraFromBoundingBox(planeCenter, boundingBox, fov);

    const cameraHelper = new THREE.CameraHelper(camera);
    scene.add(cameraHelper);
    renderer.setAnimationLoop(animate);
}, function (gltf) {
},
function (e) {
    console.log("ERRORED");
    console.error(e);
});

// Function to stop the video
function startVideo() {
    if (videoGlobal) {
        videoGlobal.play();
        videoGlobal.currentTime = 0; // Reset video to the start
        console.log("Video stopped and reset to the beginning.");
    }
}

// Function to stop the video
function stopVideo() {
    if (videoGlobal) {
        videoGlobal.pause();
        videoGlobal.currentTime = 0; // Reset video to the start
        console.log("Video stopped and reset to the beginning.");
    }
}

// Add event listener for stop button
const stopButton = document.getElementById('stopButton'); // Assuming the stop button has an ID of 'stopButton'
stopButton.addEventListener('click', stopVideo);
const startButton = document.getElementById('startButton'); // Assuming the stop button has an ID of 'stopButton'
startButton.addEventListener('click', startVideo);