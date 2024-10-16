import bpy
import os
import shutil
import os
import shutil
import logging

export_path = bpy.path.abspath("/home/pulo/NEW") 
export_dir = os.path.dirname(export_path)
print("SESSION BEGINS")
material_video_map = {}
import mathutils
import math

# Setup logging configuration
log_path = "/tmp/BLENDER.log"
logging.basicConfig(
    filename=log_path,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger()
full_path = os.path.abspath(os.getcwd())
current_directory = os.getcwd()
logger.info(current_directory)

def is_video_file(filepath):
    """
    Check if the given filepath points to a video file based on its extension.
    """
    video_extensions = ['.mp4', '.avi', '.mov', '.mkv', '.webm']
    _, ext = os.path.splitext(filepath.lower())
    return ext in video_extensions

def print_image_properties(image):
    """
    Print all properties of a Blender Image data-block in a structured format.
    """
    print(f"\nImage Properties for: {image.name}")
    print("-" * 60)
    
    # Basic Information
    print(f"Name: {image.name}")
    print(f"Filepath: {image.filepath}")
    print(f"Source: {image.source}")

    print("-" * 60)

def annotate_materials_with_video_paths():
    if not os.path.exists(export_dir):
        try:
            os.makedirs(export_dir)
            print(f"Created export directory: {export_dir}")
        except Exception as e:
            print(f"Failed to create export directory '{export_dir}': {e}")
            return
    for mat in bpy.data.materials:
        if not mat.use_nodes:
            continue  # Skip materials that don't use nodes
        video_textures = []
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE':
                image = node.image
                if image:
                    image_path = image.filepath
                    if is_video_file(image_path):
                        image_path = image.filepath
                        if True:
                            abs_path = bpy.path.abspath(image_path)
                            video_name = os.path.basename(abs_path)
                            dest_path = os.path.join(export_dir, video_name)
                            if not os.path.exists(dest_path):
                                try:
                                    shutil.copy2(abs_path, dest_path)
                                    print(f"Copied video file '{video_name}' to export directory.")
                                except Exception as e:
                                    print(f"Failed to copy video file '{video_name}': {e}")
                                    continue  # Skip annotating this video texture
                            abs_path = bpy.path.abspath(image_path)
                            video_name = os.path.basename(abs_path)
                            print_image_properties(image)
                            video_textures.append({
                                'name': video_name,
                                'filepath': video_name
                            })
        if video_textures:
            mat['video_texture_paths'] = ';'.join([vt['filepath'] for vt in video_textures])
            material_video_map[mat.name] = video_textures
    return material_video_map

def annotate_mesh_with_video(mesh, video_textures):
    if len(video_textures) == 1:
        # Single video texture
        mesh["video_texture_name"] = video_textures[0]['name']
        mesh["video_texture_filepath"] = video_textures[0]['filepath']
        
        print(f"Annotated Mesh: '{mesh.name}' with Video Texture Info.")
    print(f"Annotated Mesh: '{mesh.name}' with Video Texture Info.")

def find_meshes_using_materials(material_video_map):
    mesh_video_map = {}
    for obj in bpy.data.objects:
        if obj.type != 'MESH':
            continue  # Only process mesh objects
        mesh = obj.data
        # Iterate through the mesh's materials
        for slot in obj.material_slots:
            mat = slot.material
            if mat and mat.name in material_video_map:
                # Initialize list if mesh not yet in map
                if obj not in mesh_video_map:
                    mesh_video_map[obj] = []
                # Append all video textures from the material
                mesh_video_map[obj].extend(material_video_map[mat.name])
    return mesh_video_map

def annotate_meshes_with_video_info(mesh_video_map):
    for mesh_obj, video_textures in mesh_video_map.items():
        annotate_mesh_with_video(mesh_obj.data, video_textures)

def export_gltf(filepath, export_as_glb=True):
    camera = bpy.context.scene.camera
    camera_position = camera.matrix_world.to_translation()
    original_position = mathutils.Vector((0.0, 0.0, 0.0))
    delta_transform = camera.matrix_world.to_translation() - original_position
    camera["prop_delta_transform"] = [delta_transform.x, delta_transform.y, delta_transform.z]
    logger.info(f"GLTF -> CAMERA DELTA TRANSFORM: translation={delta_transform.z}")
    # Store delta transform as a custom property
    if "extras" not in camera:
        camera["extras"] = {}
    camera["prop_delta_transform_1"] = [delta_transform.x, delta_transform.y, delta_transform.z]
    camera.location = original_position + delta_transform
    logger.info(f"Camera updated: position={camera_position}")
    logger.info(f"Camera before GLTF transformations: position={camera_position}")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB' if export_as_glb else 'GLTF_SEPARATE',
        export_extras=True,         # Include custom properties
        export_materials='EXPORT',  # Export materials
        export_apply=False,          # Apply transformations
        export_yup=True,            # Y-up coordinate system
        export_animations=True,
        export_cameras=True,      # Export animations if any
        export_attributes=True        
    )
    abs_export_path = os.path.abspath(filepath)
    logger.info(f"Exporting GLTF to: {abs_export_path}")
    print(f"Exporting GLTF to: {abs_export_path}")

def apply_camera_transformations(camera):
    bpy.context.view_layer.objects.active = camera  # Make camera the active object
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    camera_position = camera.matrix_world.to_translation()
    camera_rotation = camera.matrix_world.to_quaternion()
    camera_rotation = camera.matrix_world.to_quaternion()
    camera_scale = camera.matrix_world.to_scale()
    euler_rotation = camera_rotation.to_euler('XYZ')
    euler_rotation_deg = [math.degrees(euler_rotation.x), math.degrees(euler_rotation.y), math.degrees(euler_rotation.z)]
    logger.info("EULER", euler_rotation_deg)
    
    # Store position and rotation as custom properties
    camera["position"] = [camera_position.x, camera_position.y, camera_position.z]
    camera["translation"] = [camera_position.x, camera_position.y, camera_position.z]
    camera["rotation"] = [camera_rotation.x, camera_rotation.y, camera_rotation.z, camera_rotation.w]
    camera["euler_rotation"] = euler_rotation_deg
    camera["position"] = [camera_position.x, camera_position.y, camera_position.z]
    camera["translation"] = [camera_position.x, camera_position.y, camera_position.z]

    camera["scale"] = camera_scale
    logger.info("CAMERA SCALE", camera_scale)
    logger.info("CAMERA", camera)
    original_position = mathutils.Vector((0.0, 0.0, 0.0))
    delta_transform = camera.matrix_world.to_translation() - original_position
    camera["prop_delta_transform"] = [delta_transform.x, delta_transform.y, delta_transform.z]
    logger.info(f"CAMERA DELTA TRANSFORM: translation={delta_transform.z}")

    camera.location = original_position + delta_transform
    logger.info(f"Camera updated: position={camera_position}, rotation={camera_rotation}")
    
def main():
    logger.info("MAIN")
    material_video_map = annotate_materials_with_video_paths()
    camera = bpy.context.scene.camera
    camera_position = camera.matrix_world.to_translation()
    logger.info("CAMERA")
    logger.info(f"Camera before transformations: position={camera_position}")
    if camera:
        logger.info("APPLY CAMERA")
        apply_camera_transformations(camera)  # Apply camera transformations
    else:
        print("No active camera in the scene.")

    if material_video_map:
        mesh_video_map = find_meshes_using_materials(material_video_map)
        logger.info("EXPORT BEFORE")
    export_gltf(export_path, True)
    logger.info("EXPORT DONE")
    if camera:
        camera_position = camera.matrix_world.to_translation()
        
if __name__ == "__main__":
    main()