import bpy
import os
import shutil

export_path = bpy.path.abspath("//"+"NEW") 
export_dir = os.path.dirname(export_path)
print("SESSION BEGINS")
material_video_map = {}

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

    print("EXPORT DIR", export_dir)
    if not os.path.exists(export_dir):
        try:
            os.makedirs(export_dir)
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
                            else:
                                print(f"Video file '{video_name}' already exists in export directory.")
                            abs_path = bpy.path.abspath(image_path)
                            video_name = os.path.basename(abs_path)
                            print_image_properties(image)
                            video_textures.append({
                                'name': video_name,
                                'filepath': video_name
                            })
        if video_textures:
            mat['video_texture_paths'] = ';'.join([vt['filepath'] for vt in video_textures])
            print(f"Annotated Material: '{mat.name}' with Video Paths: {[vt['filepath'] for vt in video_textures]}")
            material_video_map[mat.name] = video_textures
    if not material_video_map:
        print("No materials with video textures found.")
    else:
        print(f"Total Materials Annotated with Video Textures: {len(material_video_map)}")
    return material_video_map

def annotate_mesh_with_video(mesh, video_textures):
    if len(video_textures) == 1:
        # Single video texture
        mesh["video_texture_name"] = video_textures[0]['name']
        mesh["video_texture_filepath"] = video_textures[0]['filepath']
        print(f"Annotated Mesh: '{mesh.name}' with Video Texture Info.")
    print(f"Annotated Mesh: '{mesh.name}' with Video Texture Info.")

def find_meshes_using_materials(material_video_map):
    """
    Find all meshes that use materials with video textures.
    Args:
        material_video_map (dict): A dictionary mapping material names to video texture info.
    Returns:
        dict: A dictionary mapping mesh objects to their associated video texture info.
    """
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
    """
    Annotate each mesh with its associated video texture information.
    
    Args:
        mesh_video_map (dict): A dictionary mapping mesh objects to their video texture info.
    """
    for mesh_obj, video_textures in mesh_video_map.items():
        annotate_mesh_with_video(mesh_obj.data, video_textures)

def export_gltf(filepath, export_as_glb=True):
    """
    Export the current Blender scene to GLTF/GLB with custom properties included.
    
    Args:
        filepath (str): The destination filepath for the GLTF/GLB export.
        export_as_glb (bool): If True, export as GLB (binary); otherwise, export as GLTF (JSON).
    """
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB' if export_as_glb else 'GLTF_SEPARATE',
        export_extras=True,         # Include custom properties
        export_materials='EXPORT',  # Export materials
        export_apply=True,          # Apply transformations
        export_yup=True,            # Y-up coordinate system
        export_animations=True,
        export_cameras=True      # Export animations if any
    )
    print(f"Exported GLTF{'B' if export_as_glb else ''} to: {filepath}")

def main():
    material_video_map = annotate_materials_with_video_paths()
    if material_video_map:
        mesh_video_map = find_meshes_using_materials(material_video_map)
        export_gltf(export_path, False)

if __name__ == "__main__":
    main()