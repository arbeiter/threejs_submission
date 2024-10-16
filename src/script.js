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
let videoGlobal; // Define a reference to the video element globally

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
    video.play().catch((error) => {
        console.error('Error playing the video:', error);
    });

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

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const container = document.getElementById('container');
container.appendChild(stats.dom);
container.appendChild(renderer.domElement);


function animate() {
    const delta = clock.getDelta();
    mixer.update(delta);
    controls.update();
    stats.update();
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

    // Setup camera
    {
        if (gltf.cameras.length > 0) {
            const importedCamera = gltf.cameras[0];
            camera = new THREE.PerspectiveCamera(
                importedCamera.fov,
                window.innerWidth / window.innerHeight,
                importedCamera.near,
                importedCamera.far
            );

            camera.position.copy(importedCamera.position);
            camera.rotation.copy(importedCamera.rotation);
            if (gltf.cameras[0].userData && gltf.cameras[0].userData.extras) {
                const deltaTransform = new THREE.Vector3(
                    gltf.cameras[0].userData.extras.random_delta_transform[0],
                    gltf.cameras[0].userData.extras.random_delta_transform[1],
                    gltf.cameras[0].userData.extras.random_delta_transform[2]
                );
                camera.position.add(deltaTransform);
            }
        } else {
            // TODO: Crash
        }

        controls = new OrbitControls(camera, container);
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.update();

        camera.quaternion.copy(gltf.cameras[0].quaternion);
        camera.scale.copy(gltf.cameras[0].scale);
        scene.add(camera);
    }

    mixer = new THREE.AnimationMixer(model);
    let i = 0;
    for (i = 0; i < gltf.animations.length; i++) {
        mixer.clipAction(gltf.animations[i]).play();
    }

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Soft white light
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(10, 20, 10);
    pointLight.castShadow = true;
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight2.position.set(0, 0, 10);
    pointLight2.castShadow = true;
    scene.add(pointLight2);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, -10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);
    // Traverse model and 
    {
        model.traverse((child) => {
            // This is essential for drag and drop or else the entire scene will be moved around, 
            // and also the start and stop button
            let isBackground = false;
            if (child.name.startsWith("Background")) {
                isBackground = true;
                console.log("Detected the background video.");
            }

            if (child.isMesh && child.userData) {
                if (child.material.userData.video_texture_paths) {
                    const videoMaterial = applyVideoTexture(child.material, isBackground);
                    child.material = videoMaterial;
                    videoMaterial.needsUpdate = true;
                    child.transparent = true;
                    child.material.opacity = 1.0;
                } else {
                    const material = child.material;
                    if (material.map) {
                        material.map.flipY = false; // Disable default WebGL texture flip
                        // Flip the UV coordinates
                        if (!child.geometry.attributes.uv) {
                            console.warn(`Mesh "${child.name}" is missing UVs.`);
                        } else {
                            console.log(`Mesh "${child.name}" has UVs.`);
                            const uv = child.geometry.attributes.uv;
                            for (let i = 0; i < uv.count; i++) {
                                uv.setY(i, 1 - uv.getY(i));  // Flip Y coordinate of UV
                            }
                            uv.needsUpdate = true;  // Inform Three.js that UVs have been updated
                        }
                        child.castShadow = true;
                        child.receiveShadow = true;
                        child.material = material;
                    }
                }
            }
        });
    }

    scene.add(model);
    renderer.setAnimationLoop(animate);
}, function (gltf) {
    console.log("PROGRESS", gltf);
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