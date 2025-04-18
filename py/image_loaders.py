import numpy as np
import torch
import os
import folder_paths

from PIL import Image, ImageOps

IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".webp")

class LoadMaskedImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "dir_path": ("STRING", {"default": os.path.relpath(folder_paths.get_input_directory()), "multiline": True}),
        "index":  ("INT", {"default": 0, "min": -1, "step": 1}),
        "mode": (["fixed", "increment", "decrement", "randomize",],),
        "filename": ("STRING", {"default": "",}),
      }
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = ("IMAGE", "MASK", "STRING",)
  RETURN_NAMES = ("IMAGE", "MASK", "FILENAME",)

  def exec(self, dir_path, index, mode, filename, **kwargs):
    orig_name, orig_ext = os.path.splitext(filename)
    orig_path = os.path.join(dir_path, filename)
    mask_path = os.path.join(dir_path, "." + orig_name + "_r.png")

    file_path = mask_path if os.path.exists(mask_path) == True else orig_path

    image = Image.open(file_path)
    img = ImageOps.exif_transpose(image)
    image = img.convert("RGB")
    image = np.array(image).astype(np.float32) / 255.0
    image = torch.from_numpy(image)[None,]
    if 'A' in img.getbands():
      mask = np.array(img.getchannel('A')).astype(np.float32) / 255.0
      mask = 1. - torch.from_numpy(mask)
    else:
      mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")

    return (image, mask.unsqueeze(0), orig_name,)
