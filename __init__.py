"""
@author: shinich39
@title: comfyui-garbage-shits
@nickname: comfyui-garbage-shits
@version: 1.0.9
@description: Collection of garbage
"""

from .install import install_wakepy
from .py.api import *
from .py.metadata_lodaers import *
from .py.random_routes import *
from .py.image_loaders import *
from .py.run_javascript import *
from .py.civitai import *
from .py.power_mode import *

install_wakepy()

NODE_CLASS_MAPPINGS = {
  "ShowNodesFromImage": ShowNodesFromImage,
  "LoadBooleanFromImage": LoadBooleanFromImage,
  "LoadIntFromImage": LoadIntFromImage,
  "LoadFloatFromImage": LoadFloatFromImage,
  "LoadStringFromImage": LoadStringFromImage,
  "LoadComboFromImage": LoadComboFromImage,
  "RandomRoutes": RandomRoutes,
  "LoadMaskedImage": LoadMaskedImage,
  "RunJavascript": RunJavascript,
}

NODE_DISPLAY_NAME_MAPPINGS = {
  "ShowNodesFromImage": "Show Nodes from Image",
  "LoadBooleanFromImage": "Load Boolean from Image",
  "LoadIntFromImage": "Load Int from Image",
  "LoadFloatFromImage": "Load Float from Image",
  "LoadStringFromImage": "Load String from Image",
  "LoadMaskedImage": "Load Masked Image",
  "RunJavascript": "Run Javascript",
}

WEB_DIRECTORY = "./web/js"
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS"]