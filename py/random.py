from .utils.any import ANY_TYPE

class RandomRoutes:
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "": (ANY_TYPE,),
            },
        }
    
    CATEGORY = "GarbageShits"
    RETURN_TYPES = (ANY_TYPE,)
    RETURN_NAMES = ("output0",)
