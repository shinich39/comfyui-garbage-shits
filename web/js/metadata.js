"use strict";

import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";
import JSON5 from "./utils/json5.min.js";
import { getMetadata } from "./utils/api.js";
import { parseWorkflow } from "./utils/workflow.js";

const Types = {
  Meta: [
    "LoadBooleanFromImage",
    "LoadIntFromImage",
    "LoadFloatFromImage",
    "LoadStringFromImage",
    "LoadComboFromImage",
    "ShowNodesFromImage",
  ],
  Image: [
    "LoadImage",
    "LoadImageMask",
    "LoadImage //Inspire",
    "Load image with metadata [Crystools]",
    "Image Load", // was-node-suite-comfyui
    "LoadMaskedImage", // comfyui-garbage-shits
  ],
}

function isSupportedNode(node) {
  if (!node || !node.comfyClass) {
    return false;
  }
  if (Types.Image.indexOf(node.comfyClass) > -1) {
    return true;
  }
  return false;
}

function initMetaNode() {
  try {
    if (this.$shits && this.$shits.isInitialized) {
      return;
    }

    this.$shits = {};

    this.$shits.getImageNode = (function() {
      const input = this.inputs?.find(e => e.name === "image");
      if (!input || !input.link) {
        return;
      }
      const linkId = input.link;
      const link = app.graph.links.get(linkId);
      const targetId = link.origin_id;
      const target = app.graph._nodes.find(e => e.id === targetId);
      return isSupportedNode(target) ? target : undefined;
    }).bind(this);
    
    this.$shits.getMetadata = (async function() {      
      try {
        const node = this.$shits.getImageNode();
        if (!node) {
          return;
        }
        if (node.$shits instanceof Error) {
          return;
        } else if (typeof node.$shits === "object") {
          return node.$shits;
        }
        const filePath = getFilePathFromImageNode(node);
        if (!filePath) {
          return;
        }

        const { 
          absPath,
          relPath,
          fullName,
          fileName,
          extName,
          dirName,
          width, 
          height, 
          info, 
          format, // "PNG"
        } = await getMetadata(filePath);

        const workflow = info?.workflow ? JSON5.parse(info.workflow) : undefined;
        const prompt = info?.prompt ? JSON5.parse(info.prompt) : undefined;

        const nodes = parseWorkflow(workflow, prompt);
        
        node.$shits = {
          absPath,
          relPath,
          fullName,
          fileName,
          extName,
          dirName,
          width,
          height,
          nodes,
          prompt,
          workflow,
          format,
        }

        return node.$shits;
      } catch(err) {
        console.error(err);
        node.$shits = err;
        return;
      }
    }).bind(this);

    this.$shits.update = (async function() {
      const data = await this.$shits.getMetadata();
      if (!data) {
        return;
      }

      if (this.comfyClass === "ShowNodesFromImage") {
        this.widgets[0].value = JSON.stringify(data.nodes, null, 2);
        return;
      }

      const queryWidget = this.widgets[0];
      const valueWidget = this.widgets[1];

      if (queryWidget.value === "PATH") {
        valueWidget.value = data?.filePath;
      } else if (queryWidget.value === "FILENAME") {
        valueWidget.value = data?.fullname;
      } else if (queryWidget.value === "DIR") {
        valueWidget.value = data?.dirname;
      } else if (queryWidget.value === "NAME") {
        valueWidget.value = data?.filename;
      } else if (queryWidget.value === "EXT") {
        valueWidget.value = data?.extname.replace(".", "");
      } else if (queryWidget.value === "WIDTH") {
        valueWidget.value = data?.width;
      } else if (queryWidget.value === "HEIGHT") {
        valueWidget.value = data?.height;
      } else {
        const queryValue = queryWidget.value.split(".");
        const nodeName = queryValue.slice(0, queryValue.length - 1).join(".");
        const widgetName = queryValue.slice(queryValue.length - 1).join(".") || ""; // Note.

        let target;
        if (/\[([0-9]+)\]$/.test(nodeName)) {
          target = findNode(
            data.nodes,
            nodeName.replace(/\[([0-9]+)\]$/, ""), 
            parseInt(/\[([0-9]+)\]$/.exec(nodeName).pop())
          );
        } else {
          target = findNode(data.nodes, nodeName, 0);
        }
        
        // set value
        if (target && target.values[widgetName]) {
          valueWidget.value = target.values[widgetName];
        }
      }
    }).bind(this);

    // prevent update during initialization
    setTimeout(() => {
      this.onConnectionsChange = function() {
        const imageNode = this.$shits.getImageNode();
        if (!imageNode) {
          return;
        }
        clearCache(imageNode);
        updateMetaNodes();
      }
    }, 1024);
  } catch(err) {
    console.error(err);
  }
}

function initImageNode() {
  const self = this;

  const setCallback = function(widget) {
    if (!widget) {
      return;
    }
    const orig = widget.callback;
    widget.callback = function () {
      const r = orig ? orig.apply(this, arguments) : undefined;

      // update path nodes when image loader path changed
      clearCache(self);
      updateMetaNodes();
      
      return r;
    }
  }

  // prevent send callback during initialization
  setTimeout(() => {
    switch(this.comfyClass) {
      // core
      case "LoadImage":
      case "LoadImageMask":
        setCallback(this.widgets?.find(e => e.name === "image"));
        break;
      // ComfyUI-Inspire-Pack
      case "LoadImage //Inspire": 
        setCallback(this.widgets?.find(e => e.name === "image"));
        break;
      // ComfyUI-Crystools
      case "Load image with metadata [Crystools]":
        setCallback(this.widgets?.find(e => e.name === "image"));
        break;
      // WAS Node Suite
      case "Image Load": 
        setCallback(this.widgets?.find(e => e.name === "image_path"));
        break;
      // comfyui-garbage-shits
      case "LoadMaskedImage": 
        setCallback(this.widgets?.find(e => e.name === "index"));
        setCallback(this.widgets?.find(e => e.name === "dir_path"));
        break; 
    }
  }, 1024);
}

function getFilePathFromImageNode(node) {
  if (node && node.widgets) {
    let prefix, suffix;
    switch(node.comfyClass) {
      // core
      case "LoadImage":
      case "LoadImageMask": 
        prefix = "ComfyUI/input";
        suffix = node.widgets.find(e => e.name === "image")?.value;
        break;
      // ComfyUI-Inspire-Pack
      case "LoadImage //Inspire": 
        prefix = "ComfyUI/input";
        suffix = node.widgets.find(e => e.name === "image")?.value;
        break;
      // ComfyUI-Crystools
      case "Load image with metadata [Crystools]": 
        prefix = "ComfyUI/input";
        suffix = node.widgets.find(e => e.name === "image")?.value;
        break;
      // WAS Node Suite
      case "Image Load": 
        suffix = node.widgets.find(e => e.name === "image_path")?.value;
        break;
      // comfyui-garbage-shits
      case "LoadMaskedImage": 
        prefix = node.widgets.find(e => e.name === "dir_path")?.value;
        suffix = node.widgets.find(e => e.name === "filename")?.value;
        break;
    }
    if (prefix && suffix) {
      return `${prefix}/${suffix}`.replace(/[\\/]+/g, "/");
    } else if (suffix) {
      return suffix.replace(/[\\/]+/g, "/");;
    }
  }
}

function matchNode(n, q) {
  if (!n || !q) {
    return false;
  }
  if (n.title && n.title === q) {
    return true;
  }
  if (n.type && n.type === q) {
    return true;
  }
  if (n.id && n.id == q) {
    return true;
  }
  return false;
}

function findNode(nodes, query, index, reverse) {
  if (!index) {
    index = 0;
  }
  let count = 0;
  if (!reverse) {
    for (let i = 0; i < nodes.length; i++) {
      if (matchNode(nodes[i], query)) {
        if (count === index) {
          return nodes[i];
        } else {
          count++;
        }
      }
    }
  } else {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (matchNode(nodes[i], query)) {
        if (count === index) {
          return nodes[i];
        } else {
          count++;
        }
      }
    }
  }
}

function clearCache(node) {
  delete node.$shits;
}

function clearCaches() {
  for (const node of app.graph._nodes) {
    if (Types.Image.indexOf(node.comfyClass) > -1) {
      clearCache(node);
    }
  }
}

async function updateMetaNodes() {
  for (const node of app.graph._nodes) {
    if (Types.Meta.indexOf(node.comfyClass) > -1) {
      try {
        await node.$shits.update();
      } catch(err) {
        console.error(err);
      }
    }
  }
}

export default {
	name: `shinich39.GarbageShits.Metadata`,
  setup() {
    api.addEventListener("promptQueued", async function() {
      clearCaches();
      await updateMetaNodes();
      console.log("[comfyui-garbage-shits] Metadata updated.");
    });
    console.log("[comfyui-garbage-shits] Metadata event added.");
  },
  nodeCreated(node) {
    if (Types.Meta.indexOf(node.comfyClass) > -1) {
      initMetaNode.apply(node);
    } else if (Types.Image.indexOf(node.comfyClass) > -1) {
      initImageNode.apply(node);
    }
  },
}