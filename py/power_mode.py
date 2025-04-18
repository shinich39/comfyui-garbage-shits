import traceback
import atexit

from server import PromptServer
from aiohttp import web

wakeup = None
wakeup_mode = None

def deactivate_wakeup(mode = 0):
  global wakeup, wakeup_mode

  if wakeup != None:
    if mode == 0 or mode == wakeup_mode:
      wakeup._deactivate()
      print(f'[comfyui-garbage-shits] Deactivate power mode: {"Sleep" if wakeup_mode == 1 else "Screen Saver"}')
      wakeup = None
      wakeup_mode = None

def activate_wakeup(mode = 0):
  global wakeup, wakeup_mode
  
  from wakepy import keep

  if wakeup == None:
    if mode == 1:
      # prevent sleep
      wakeup = keep.running()
      wakeup._activate()
      wakeup_mode = mode
      print(f'[comfyui-garbage-shits] Activate power mode: {"Sleep" if mode == 1 else "Screen Saver"}')
    elif mode == 2:
      # prevent screen saver
      wakeup = keep.presenting()
      wakeup._activate()
      wakeup_mode = mode
      print(f'[comfyui-garbage-shits] Activate power mode: {"Sleep" if mode == 1 else "Screen Saver"}')
    else:
      print(f'[comfyui-garbage-shits] Invalid power mode: {mode}')
  else:
    print(f'[comfyui-garbage-shits] Power mode already activated: {"Sleep" if mode == 1 else "Screen Saver"}')

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/enable-system-sleep")
async def _enable_system_sleep(request):
  try:
    deactivate_wakeup(0)
    activate_wakeup(1)
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)

@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/enable-screen-saver")
async def _enable_screen_saver(request):
  try:
    deactivate_wakeup(0)
    activate_wakeup(2)
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)
  
@PromptServer.instance.routes.get("/shinich39/comfyui-garbage-shits/disable-power-mode")
async def _disable_power_mode(request):
  try:
    deactivate_wakeup(0)
    return web.Response(status=200)
  except Exception:
    print(traceback.format_exc())
    return web.Response(status=400)
  
atexit.register(deactivate_wakeup)