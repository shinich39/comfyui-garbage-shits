from .utils.any import ANY_TYPE

class ShowNodesFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "string": ("STRING", {"default": "", "multiline": True,}),
      },
    }
  
  CATEGORY = "GarbageShits"
  RETURN_TYPES = ()
  RETURN_NAMES = ()

class LoadBooleanFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "query": ("STRING", {"default": "", "placeholder": "" }),
        "boolean": ("BOOLEAN", {"default": False,}),
      },
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = ("BOOLEAN",)
  RETURN_NAMES = ("BOOLEAN",)

  def exec(self, image, query, v):
    return (bool(v),)
  
class LoadIntFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "query": ("STRING", {"default": "","placeholder": "KSampler.seed",}),
        "int": ("INT", {"default": 0,}),
      },
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = ("INT",)
  RETURN_NAMES = ("INT",)

  def exec(self, image, query, v):
    return (int(v),)
  
class LoadFloatFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "query": ("STRING", {"default": "","placeholder": "KSampler.denoise",}),
        "float": ("FLOAT", {"default": 0.00,}),
      },
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = ("FLOAT",)
  RETURN_NAMES = ("FLOAT",)

  def exec(self, image, query, v):
    return (float(v),)
  
class LoadStringFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "query": ("STRING", {"default": "","placeholder": "CLIPTextEncode.text",}),
        "string": ("STRING", {"default": "", "multiline": True}),
      },
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = ("STRING",)
  RETURN_NAMES = ("STRING",)

  def exec(self, image, query, v):
    return (str(v),)

class LoadComboFromImage():
  def __init__(self):
    pass

  @classmethod
  def IS_CHANGED(self, **kwargs):
    return float("NaN")

  @classmethod
  def INPUT_TYPES(cls):
    return {
      "required": {
        "image": ("IMAGE",),
        "query": ("STRING", {"default": "","placeholder": "Load Checkpoint.ckpt_name",}),
        "combo": ("STRING", {"default": "",}),
      },
    }
  
  CATEGORY = "GarbageShits"
  FUNCTION = "exec"
  RETURN_TYPES = (ANY_TYPE,)
  RETURN_NAMES = ("COMBO",)

  def exec(self, image, query, v):
    return (v,)
