import fs from "node:fs";
import path from "node.path";
import "dotenv/config";

const node = await (await fetch(`https://api.comfy.org/nodes/comfyui-garbage-shits`, {
  method: 'GET',
})).json();

await fetch(`https://api.comfy.org/publishers/shinich39/nodes/comfyui-garbage-shits/versions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.API_TOKEN}`, 
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    node: node,
    "node_version": {
      "changelog": "<string>",
      "comfy_node_extract_status": "<string>",
      "createdAt": "2023-11-07T05:31:56Z",
      "dependencies": ["<string>"],
      "deprecated": false,
      "downloadUrl": "<string>",
      "id": "<string>",
      "node_id": "<string>",
      "status": "NodeVersionStatusActive",
      "status_reason": "<string>",
      "version": "<string>"
    },
    "personal_access_token": "<string>"
  })
})
  .then(response => response.json())
  .then(response => console.log(response))
  .catch(err => console.error(err));