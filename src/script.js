import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
// Canvas
const canvas = document.querySelector('canvas.webgl')
// Scene
const scene = new THREE.Scene()
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'; // Import the GLTFLoader
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GUI } from 'lil-gui';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selectableObjects = [];
let bbox =  null; 
let bboxHelper = null;

// Create a play button
const playButton = document.createElement('button');
playButton.innerHTML = "Play Video";
document.body.appendChild(playButton);

function updateCamera() {
}

/**
 * Object
 */
const clock = new THREE.Clock();
const stats = new Stats();
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
/**
 * Sizes
 */
const sizes = {
    width: 1000,
    height:1000 
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
camera.position.z = -10;
scene.add(camera)
let isDragging = false;
let selectedObject = null;
let dragPlane = new THREE.Plane();
const offset = new THREE.Vector3();

const renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true
})
renderer.shadowMap.enabled = true;

// Event Listeners for Mouse Interaction
renderer.domElement.addEventListener('mousedown', onMouseDown, false);
renderer.domElement.addEventListener('mousemove', onMouseMove, false);
renderer.domElement.addEventListener('mouseup', onMouseUp, false);
renderer.setSize(sizes.width, sizes.height);
document.addEventListener('keydown', onKeyDown, false);

function onMouseDown(event) {
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    
    // Perform raycasting
    const intersects = raycaster.intersectObjects(selectableObjects, true);
    if (intersects.length > 0) {
        // Prevent the controls from rotating the scene
        selectedObject = modelGroup; 
        // Highlight the bounding box
        highlightBoundingBox(selectedObject);
        // Set up the plane for movement calculation
        dragPlane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()),
            selectedObject.position
        );
        // Calculate the offset between the intersection point and the object position
        const intersectionPoint = intersects[0].point;
        offset.copy(intersectionPoint).sub(selectedObject.position);
        isDragging = true;
    } else {
        // If no object is selected, allow controls to operate
        controls.enabled = true;
    }
}

function onMouseMove(event) {
    if (!isDragging) return;
    // Calculate mouse position in normalized device coordinates
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = - ((event.clientY - rect.top) / rect.height) * 2 + 1;
    // Update the raycaster
    raycaster.setFromCamera(mouse, camera);
    // Calculate the intersection point with the plane
    const planeIntersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, planeIntersect);
    // Update the object's position
    selectedObject.position.copy(planeIntersect.sub(offset));
    // Update the bounding box helper
    if (bboxHelper) {
        bboxHelper.update();
    }
}

function onMouseUp(event) {
    if (isDragging) {
        isDragging = false;
        controls.enabled = true;
    }
}

function highlightBoundingBox(object) {
    // Remove existing bounding box helper
    if (bboxHelper) {
        scene.remove(bboxHelper);
        bboxHelper = null;
    }
    // Create a new bounding box helper for the selected object
    bboxHelper = new THREE.BoxHelper(object, 0xffff00); // Yellow color
    scene.add(bboxHelper);
}

const container = document.getElementById( 'container' );
container.appendChild( stats.dom );
container.appendChild( renderer.domElement );

const controls = new OrbitControls( camera, container );
controls.enablePan = false;
controls.enableZoom = true;
controls.update();

const planeWidth = 5; // Fixed width
const planeHeight = 5; // Choose an appropriate height for the plane
const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

function animate() {
    const delta = clock.getDelta();
    mixer.update( delta );
    controls.update();
    stats.update();
    renderer.render( scene, camera );
}

scene.background = new THREE.Color( 'grey');

let mixer;
const loader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
let decoderPath = 'https://www.gstatic.com/draco/v1/decoders/';
dracoLoader.setDecoderPath( decoderPath );

loader.setDRACOLoader( dracoLoader);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
renderer.setPixelRatio(window.devicePixelRatio);


const color = 0xFFFFFF;
const intensity = 100;
const light = new THREE.PointLight( color, intensity );
// Shadow map size
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;

// Shadow camera settings
light.shadow.camera.left = -50;
light.shadow.camera.right = 50;
light.shadow.camera.top = 50;
light.shadow.camera.bottom = -50;
light.shadow.camera.near = 1;
light.shadow.camera.far = 100;


light.castShadow = true;
light.position.set( 0, 10, 0 );
scene.add( light );
const helper = new THREE.PointLightHelper( light );
scene.add( helper );
scene.add( helper );
class ColorGUIHelper {
    constructor( object, prop ) {
        this.object = object;
        this.prop = prop;
    }
    get value() {
        return `#${this.object[ this.prop ].getHexString()}`;
    }
    set value( hexString ) {
        this.object[ this.prop ].set( hexString );
    }
}

function makeXYZGUI( gui, vector3, name, onChangeFn ) {
    const folder = gui.addFolder( name );
    folder.add( vector3, 'x', - 10, 10 ).onChange( onChangeFn );
    folder.add( vector3, 'y', 0, 10 ).onChange( onChangeFn );
    folder.add( vector3, 'z', - 10, 10 ).onChange( onChangeFn );
}

class MinMaxGUIHelper {

    constructor( obj, minProp, maxProp, minDif ) {

        this.obj = obj;
        this.minProp = minProp;
        this.maxProp = maxProp;
        this.minDif = minDif;

    }
    get min() {

        return this.obj[ this.minProp ];

    }
    set min( v ) {

        this.obj[ this.minProp ] = v;
        this.obj[ this.maxProp ] = Math.max( this.obj[ this.maxProp ], v + this.minDif );

    }
    get max() {

        return this.obj[ this.maxProp ];

    }
    set max( v ) {

        this.obj[ this.maxProp ] = v;
        this.min = this.min; // this will call the min setter

    }
}

const gui = new GUI();
gui.addColor( new ColorGUIHelper( light, 'color' ), 'value' ).name( 'color' );
gui.add( light, 'intensity', 0, 200 );
gui.add( light, 'distance', 0, 40 ).onChange( updateCamera );

{
    const folder = gui.addFolder( 'Shadow Camera' );
    folder.open();
    const minMaxGUIHelper = new MinMaxGUIHelper( light.shadow.camera, 'near', 'far', 0.1 );
    folder.add( minMaxGUIHelper, 'min', 0.1, 50, 0.1 ).name( 'near' ).onChange( updateCamera );
    folder.add( minMaxGUIHelper, 'max', 0.1, 50, 0.1 ).name( 'far' ).onChange( updateCamera );
}

makeXYZGUI( gui, light.position, 'position', updateCamera );
const video = document.createElement('video');
video.src = 'bro.webm';
video.load();
video.play();
video.loop = true;
video.muted = true;
video.playsInline = true; 
video.crossOrigin = 'anonymous'; 

const video1 = document.createElement('video');
video1.src = 'raw.mp4';  // Provide the path to your video file
video1.play();
video1.muted = true; // Required for autoplay
video1.loop = true;
video1.playsInline = true;

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat;
videoTexture.needsUpdate = true;

const materialAnim = new THREE.MeshBasicMaterial({
    map: videoTexture
});

const customMaterial = new THREE.MeshBasicMaterial({
    map: videoTexture,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false, // Optional: may help with transparency issues
});


const videoTexture2 = new THREE.VideoTexture(video);
videoTexture2.minFilter = THREE.LinearFilter;
videoTexture2.magFilter = THREE.LinearFilter;
videoTexture2.format = THREE.RGBFormat;
videoTexture2.flipY = true;

playButton.addEventListener('click', function() {
  video.play().then(() => {
    console.log("Video is playing.");
    playButton.style.display = 'none';
  }).catch(error => {
    console.error('Error trying to play the video:', error);
  });
});

const videoTexture1 = new THREE.VideoTexture(video1);
const planeMaterial = new THREE.MeshBasicMaterial({ 
  map: videoTexture1,
  side: THREE.DoubleSide 
});

// Create a PMREM generator (for creating mipmapped radiance environment maps)
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

// Load the EXR texture
new EXRLoader()
.setDataType(THREE.FloatType)
.load('chapel_day_1k.exr', function (texture) {
const exrCubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
scene.environment = exrCubeRenderTarget.texture;

texture.dispose();  // Clean up to avoid memory issues
pmremGenerator.dispose();
});
/*
    // Add the model to the group
    modelGroup.add(model);

    // Compute the bounding box of the model group
    const bbox = new THREE.Box3().setFromObject(modelGroup);

    // Calculate the size and center of the bounding box
    const size = new THREE.Vector3();
    bbox.getSize(size);

    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Create a box geometry matching the bounding box dimensions
    const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);

    // Create an invisible material
    const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });

    // Create the bounding box mesh
    bboxMesh = new THREE.Mesh(boxGeometry, invisibleMaterial);

    // Position the bounding box mesh at the center
    bboxMesh.position.copy(center);

    // Add the bounding box mesh to the group
    modelGroup.add(bboxMesh);

    // Adjust the model's position relative to the group
    model.position.sub(center);

    // Add the bounding box mesh to the selectable objects
    selectableObjects.push(bboxMesh);

    // Create a bounding box helper for visualization
    bboxHelper = new THREE.BoxHelper(modelGroup, 0xffff00);
    scene.add(bboxHelper);
*/
let modelGroup = new THREE.Group();
scene.add(modelGroup); // Add the group to the scene

let names = [];
var mesher = null;
loader.load('LittlestTokyo1.glb', function ( gltf ) {
    const model = gltf.scene;
    let shadowCatcher = null;
    model.traverse(function (node) {
        names = names.concat(node.name);
        const prefix = "Plane00";
        if(node.name.substring(0, prefix.length) === prefix) {
            console.log(node.name);
            if (node.isMesh) {
                // Apply the video texture material to the specific mesh
                node.material = customMaterial;
                node.castShadow = false;
                node.receiveShadow = false;
                node.transparent = true;
            }
        }

        if (node.name == "ShadowCatcher") {
            shadowCatcher = node;
            shadowCatcher.material = customMaterial;
            mesher = shadowCatcher;
        } else {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });

    var j = 0;
    for(j = 0; j < names.length; j++) {
        if(names[j].substring(0,7) === "Plane00") {
          console.log("HELLO", names[j]);
        }
    }    
    const normal = new THREE.Vector3();
    mesher.getWorldDirection(normal);
    const cubeMat = new THREE.MeshPhongMaterial({ 
        color: 0xFFFFFF,
        side: THREE.DoubleSide,
    });

    shadowCatcher.receiveShadow = true;
    shadowCatcher.castShadow = true;
    shadowCatcher.material = cubeMat;
    console.log(names);
    model.position.set( 0, 0, 0 );
    scene.add( model );

    mixer = new THREE.AnimationMixer( model );

    let i = 0;
    for(i = 0; i < gltf.animations.length; i++) {
        mixer.clipAction( gltf.animations[ i ] ).play();
    }
    const cameras = [];
    gltf.scene.traverse(function (child) {
      if (child.isCamera) {
        cameras.push(child);
      }
    });

    if (cameras.length > 0) {
      const importedCamera = cameras[0];
      camera.position.copy(importedCamera.position);
      camera.rotation.copy(importedCamera.rotation);
    }

    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.copy(mesher.position);
    const upVector = new THREE.Vector3(0, -1, 0); // Default normal of a plane
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upVector, normal);
    plane.quaternion.premultiply(quaternion);
    scene.add(plane);

    {
        modelGroup.add(model);
        const bbox = new THREE.Box3().setFromObject(modelGroup);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const invisibleMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const bboxMesh = new THREE.Mesh(boxGeometry, invisibleMaterial);
        bboxMesh.position.copy(center);
        modelGroup.add(bboxMesh);
        modelGroup.position.sub(center);
        selectableObjects.push(bboxMesh);
        bboxHelper = new THREE.BoxHelper(modelGroup, 0xffff00);
        scene.add(bboxHelper);
    }
    
    renderer.setAnimationLoop( animate );
}, function(gltf) {
    console.log("PROGRESS", gltf);
},
function (e) {
    console.log("ERRORED");
    console.error( e );
});


// Handle Start and Stop button events
document.getElementById('startButton').addEventListener('click', () => {
    if (!isAnimating) {
        isAnimating = true;
    }
});

document.getElementById('stopButton').addEventListener('click', () => {
    isAnimating = false; // Stop the animation loop
});

video.addEventListener('play', function() {
  console.log('Video is now playing on the plane.');
});

function onKeyDown(event) {
    if (event.key === 'r' || event.key === 'R') {
        // Flip the modelGroup by 90 degrees around the Y-axis
        modelGroup.rotation.x += Math.PI / 2;
        // Optionally, normalize the rotation to keep it within 0 to 2π
        modelGroup.rotation.x %= (2 * Math.PI);

        // Update the bounding box helper
        if (bboxHelper) {
            bboxHelper.update();
        }
    }
}
