import os
import json
import hashlib
import traceback
import requests
import gzip
import io
import folder_paths

__DIRNAME = os.path.dirname(os.path.abspath(__file__))
JSON_DIR_PATH = os.path.join(__DIRNAME, "..", "data")
LATEST_DATA_PATH = os.path.join(JSON_DIR_PATH, "latest.json")
CKPT_DATA_PATH = os.path.join(JSON_DIR_PATH, "checkpoints.json")
HASH_DATA_PATH = os.path.join(JSON_DIR_PATH, "hashes.json")
REPO_URL = "https://github.com/shinich39/civitai-model-json"
LATEST_DATA_URL = "https://raw.githubusercontent.com/shinich39/civitai-model-json/refs/heads/main/dist/latest.json"
CKPT_DATA_URL = "https://raw.githubusercontent.com/shinich39/civitai-model-json/refs/heads/main/dist/checkpoints.json.gz"

def read_model_hash(file_path):
  with open(file_path, "rb") as f:
    return hashlib.sha256(f.read()).hexdigest().upper()
  
def get_model_hashes():
  hashes = {}
  if os.path.exists(JSON_DIR_PATH) == False:
    os.mkdir(JSON_DIR_PATH)

  if os.path.exists(HASH_DATA_PATH) == True:
    with open(HASH_DATA_PATH, "r") as f:
      hashes = json.load(f)

  for file_rel_path in folder_paths.get_filename_list("checkpoints"):
    file_name = os.path.basename(file_rel_path)
    file_path = folder_paths.get_full_path("checkpoints", file_rel_path)

    if file_name not in hashes:
      print(f"[comfyui-garbage-shits] {file_name} hash not found. generating hash...")
      hashes[file_name] = read_model_hash(file_path)
      update_model_hashes(hashes)

  return hashes

def update_model_hashes(hashes):
  with open(HASH_DATA_PATH, "w") as f:
    f.write(json.dumps(hashes, indent=2))
    f.close()
  
def get_remote_latest():
  try:
    res = requests.get(LATEST_DATA_URL)
    data = json.loads(res.text)
    return data
  except Exception:
    return None
  
def get_local_latest():
  try:
    if os.path.exists(LATEST_DATA_PATH) == True:
      with open(LATEST_DATA_PATH, "r") as f:
        return json.load(f)
  except Exception:
    return None

def get_ckpt_json():
  if os.path.exists(JSON_DIR_PATH) == False:
    os.mkdir(JSON_DIR_PATH)

  # Check updates
  local_data = get_local_latest()
  remote_data = get_remote_latest()

  remote_time = None
  if remote_data != None and "updatedAt" in remote_data:
    remote_time = remote_data["updatedAt"]

  local_time = None
  if local_data != None and "updatedAt" in local_data:
    local_time = local_data["updatedAt"]

  is_updated = os.path.exists(CKPT_DATA_PATH) == False or local_time != remote_time

  if is_updated == False:
    with open(CKPT_DATA_PATH, "r") as file:
      print(f"[comfyui-garbage-shits] No updates found: {local_time} = {remote_time}")
      return json.load(file)
    
  # Save latest.json
  with open(LATEST_DATA_PATH, "w") as f:
    f.write(json.dumps(remote_data))
    f.close()
  
  # Download checkpoints.json
  print(f"[comfyui-garbage-shits] New update available: {local_time} < {remote_time}")
  print(f"[comfyui-garbage-shits] Downloading checkpoints.json.gz...")

  try:
    res = requests.get(CKPT_DATA_URL)
    print(f"[comfyui-garbage-shits] Decompressing checkpoints.json.gz...")
    with gzip.GzipFile(fileobj=io.BytesIO(res.content)) as f:
      decompressed_data = f.read()

    text = decompressed_data.decode('utf-8')
    data = json.loads(text)
    with open(CKPT_DATA_PATH, "w") as f:
      f.write(json.dumps(data))
      f.close()

    print(f"[comfyui-garbage-shits] checkpoints.json has been downloaded.")

    return data
  except Exception:
    print(traceback.format_exc())
    print(f"[comfyui-garbage-shits] Failed to download.")

    try:
      if os.path.exists(CKPT_DATA_PATH) == True:
        with open(CKPT_DATA_PATH, "r") as file:
          return json.load(file)
    except:
      pass

    return []