import os
import json
import traceback
import atexit

import folder_paths
import comfy

from io import BytesIO
from urllib.parse import unquote

from server import PromptServer
from aiohttp import web

from PIL import Image
from PIL.PngImagePlugin import PngInfo

from .utils.image import parse_file_path, get_metadata, get_images
from .civitai import get_model_hashes, get_ckpt_json
wakeup = None
wakeup_mode = None

def deactivate_wakeup():
  global wakeup, wakeup_mode
  if wakeup != None:
    wakeup._deactivate()
    wakeup = None
    wakeup_mode = None

def activate_wakeup(mode):
  global wakeup, wakeup_mode
  
  from wakepy import keep

  if wakeup != None and wakeup_mode != mode:
    deactivate_wakeup()

  if mode == 1:
    # sleep
    wakeup = keep.running()
    wakeup._activate()
  elif mode == 2:
    # prevent screen saver
    wakeup = keep.presenting()
    wakeup._activate()
    
  wakeup_mode = mode

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/get-comfy-options")
async def _get_comfy_options(request):
  try:
    return web.json_response({
      "samplers": comfy.samplers.KSampler.SAMPLERS,
      "schedulers": comfy.samplers.KSampler.SCHEDULERS,
      "controlnets": folder_paths.get_filename_list("controlnet"),
      "checkpoints": folder_paths.get_filename_list("checkpoints"),
      "loras": folder_paths.get_filename_list("loras"),
      "vaes": folder_paths.get_filename_list("vae"),
    })
  except Exception as err:
    print(traceback.format_exc())
    return web.Response(status=400)
  
@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/parse-file-path")
async def _parse_file_path(request):
  try:
    req = await request.json()
    file_path = req["path"]
    return web.json_response(parse_file_path(file_path))
  except Exception as err:
    print(traceback.format_exc())
    return web.Response(status=400)
  
@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/get-metadata")
async def _get_metadata(request):
  try:
    req = await request.json()
    file_path = req["path"]
    return web.json_response(get_metadata(file_path))
  except Exception as err:
    print(traceback.format_exc())
    return web.Response(status=400)

@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/set-metadata")
async def _set_metadata(request):
  try:
    req = await request.json()
    file_path = req["path"]
    info = req["info"]

    prompt = info["prompt"]
    extra_pnginfo = info["extra_data"]["extra_pnginfo"]

    metadata = PngInfo()
    if prompt is not None:
      metadata.add_text("prompt", json.dumps(prompt))
    if extra_pnginfo is not None:
      for x in extra_pnginfo:
        metadata.add_text(x, json.dumps(extra_pnginfo[x]))

    image = Image.open(file_path)
    image.save(file_path, pnginfo=metadata)

    return web.Response(status=200)
  except Exception as err:
    print(traceback.format_exc())
    return web.Response(status=400)


@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/image")
async def _get_image(request):
  if "path" in request.rel_url.query:
    file_path = unquote(request.rel_url.query["path"])
    if os.path.isfile(file_path):
      filename = os.path.basename(file_path)
      with Image.open(file_path) as img:
        image_format = 'webp'
        quality = 90
        buffer = BytesIO()
        img.save(buffer, format=image_format, quality=quality)
        buffer.seek(0)

        return web.Response(body=buffer.read(), content_type=f'image/{image_format}',
          headers={"Content-Disposition": f"filename=\"{filename}\""})

  return web.Response(status=404)

@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/get-images")
async def _get_images(request):
  try:
    req = await request.json()
    file_path = req["path"]
    image_list = get_images(file_path)
    return web.json_response(image_list)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)

@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/edit-image")
async def routes_edit_image(request):
  post = await request.post()
  draw_image = post.get("draw")
  mask_image = post.get("mask")
  orig_path = post.get("path")
  dir_path = os.path.dirname(orig_path)
  orig_name = os.path.basename(orig_path)
  image_name, image_ext = os.path.splitext(orig_name)

  draw_name = "." + image_name + "_d"
  draw_path = os.path.join(dir_path, draw_name + ".png")
  mask_name = "." + image_name + "_m"
  mask_path = os.path.join(dir_path, mask_name + ".png")
  res_name = "." + image_name + "_r"
  res_path = os.path.join(dir_path, res_name + ".png")

  # save draw image
  draw_pil = Image.open(draw_image.file).convert("RGBA")
  draw_pil.save(draw_path, compress_level=4)
  
  # save mask image
  mask_pil = Image.open(mask_image.file).convert('RGBA')
  mask_pil.save(mask_path, compress_level=4)

  # create result image
  orig_pil = Image.open(orig_path).convert("RGBA")

  # merge draw image
  orig_pil.paste(draw_pil, (0,0), draw_pil)

  # merge mask image
  mask_alpha = mask_pil.getchannel('A')
  orig_pil.putalpha(mask_alpha)

  # save result image
  orig_pil.save(res_path, compress_level=4)

  return web.json_response({
    "orig_name": orig_name,
    "orig_path": orig_path,
    "draw_name": draw_name,
    "draw_path": draw_path,
    "mask_name": mask_name,
    "mask_path": mask_path,
  })

@PromptServer.instance.routes.post("/shinich39/comfyui-garbage-shits/clear-image")
async def clear_image(request):
  req = await request.json()
  orig_path = req["path"]
  dir_path = os.path.dirname(orig_path)
  orig_name = os.path.basename(orig_path)
  image_name, image_ext = os.path.splitext(orig_name)

  draw_name = "." + image_name + "_d"
  draw_path = os.path.join(dir_path, draw_name + ".png")
  mask_name = "." + image_name + "_m"
  mask_path = os.path.join(dir_path, mask_name + ".png")
  res_name = "." + image_name + "_r"
  res_path = os.path.join(dir_path, res_name + ".png")

  if os.path.exists(draw_path):
    os.remove(draw_path)

  if os.path.exists(mask_path):
    os.remove(mask_path)

  if os.path.exists(res_path):
    os.remove(res_path)

  return web.Response(status=200)

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/get-ckpt-workflows")
async def _get_ckpt_workflows(request):
  try:
    hashes = get_model_hashes()
    ckpts = get_ckpt_json()

    # Filtering
    filtered_ckpts = {}
    for file_rel_path in folder_paths.get_filename_list("checkpoints"):
      file_name = os.path.basename(file_rel_path)
      hash = hashes[file_name]
      name = file_rel_path
      for ckpt in ckpts:
        if hash in ckpt["hashes"]:
          filtered_ckpts[name] = ckpt
          break
        elif name in ckpt["files"]:
          filtered_ckpts[name] = ckpt
          break

    return web.json_response({
      "checkpoints": filtered_ckpts
    })
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/disable-system-sleep")
async def _disable_system_sleep(request):
  try:
    deactivate_wakeup()
    print(f"[comfyui-garbage-shits] Disable System Sleep")
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/enable-system-sleep")
async def _enable_system_sleep(request):
  try:
    activate_wakeup(1)
    print(f"[comfyui-garbage-shits] Enable System Sleep")
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)
  
@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/disable-screen-saver")
async def _disable_screen_saver(request):
  try:
    deactivate_wakeup()
    print(f"[comfyui-garbage-shits] Disable Screen Saver")
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)
  

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/enable-screen-saver")
async def _enable_screen_saver(request):
  try:
    activate_wakeup(2)
    print(f"[comfyui-garbage-shits] Enable Screen Saver")
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)
  
atexit.register(deactivate_wakeup)