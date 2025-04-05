import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

export async function parseFilePath(filePath) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/parse-file-path`, {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({ path: filePath }),
  });

  if (response.status !== 200) {
    throw new Error(response.statusText);
  }

  return await response.json();
}

export async function getMetadata(filePath) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/get-metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({ path: filePath }),
  });

  if (response.status !== 200) {
    throw new Error(response.statusText);
  }

  return await response.json();
}

export async function setMetadata(filePath, info) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/save-metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({ path: filePath, info }),
  });

  if (response.status !== 200) {
    throw new Error(response.statusText);
  }

  return true;
}