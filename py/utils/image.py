import os

from pathlib import Path

from PIL import Image, ImageFile
from PIL.PngImagePlugin import PngImageFile

# fix
ImageFile.LOAD_TRUNCATED_IMAGES = True

def parse_file_path(file_path):
  fullname = os.path.basename(file_path)
  dirname = os.path.dirname(file_path)
  filename, extname = os.path.splitext(file_path)
  abs_path = os.path.abspath(file_path)
  rel_path = os.path.relpath(file_path)
  return {
    "absPath": abs_path,
    "relPath": rel_path,
    "fullName": fullname,
    "fileName": filename,
    "extName": extname,
    "dirName": dirname,
  }
    
def get_metadata(file_path):
  with Image.open(file_path) as image:
    if isinstance(image, PngImageFile):
      return {
        **parse_file_path(file_path),
        **{
          "width": image.width,
          "height": image.height,
          "info": image.info,
          "format": image.format,
        }
      }
    
def get_images(dir_path):
  image_list = []
  if os.path.isdir(dir_path):
    for file in os.listdir(dir_path):  
      # not image
      if not file.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
        continue

      # mask, draw, result
      if file.startswith("."):
        continue

      image_name, image_ext = os.path.splitext(file)
      image_path = Path(os.path.join(dir_path, file)).as_posix()
      draw_name = "." + image_name + "_d"
      draw_path = Path(os.path.join(dir_path, draw_name + ".png")).as_posix()
      mask_name = "." + image_name + "_m"
      mask_path = Path(os.path.join(dir_path, mask_name + ".png")).as_posix()

      is_draw_exists = os.path.exists(draw_path)
      is_mask_exists = os.path.exists(mask_path)
      
      image_list.append({
        "dir_path": dir_path,
        "orig_path": image_path,
        "orig_name": file,
        "draw_path": draw_path if is_draw_exists else None,
        "draw_name": draw_name if is_draw_exists else None,
        "mask_path": mask_path if is_mask_exists else None,
        "mask_name": mask_name if is_mask_exists else None,
      })
  
  return image_list