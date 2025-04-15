# ComfyUI-inspire-pack
class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

ANY_TYPE = AnyType("*")