"use strict";

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { initMaskEditor } from "./utils/mask-editor.js";

const CLASS_NAME = "LoadMaskedImage";

function getImageURL(filePath) {
  return `/shinich39/comfyui-garbage-shits/image?path=${encodeURIComponent(filePath)}&rand=${Date.now()}`;
}

function selectNode(node) {
  app.canvas.deselectAllNodes();
  app.canvas.selectNode(node);
}

function generateRandomNumber(min, max) {
  return Math.random() * (max - min) + min;
}

function initNode() {
  try {
    const self = this;

    this.$$shits = {
      isInitialized: false,
      countQueues: 0,
      countLoops: 0,
      countErrors: 0,
      loadedImages: [],
      selectedImage: null,
      selectedIndex: -1,
    };

    this.$$shits.init = (function() {
      const self = this;
      if (this.widgets) {
        this.$$shits.DIR_PATH = this.widgets.find(e => e.name === "dir_path");
        this.$$shits.INDEX = this.widgets.find(e => e.name === "index");
        this.$$shits.MODE = this.widgets.find(e => e.name === "mode");
        this.$$shits.FILENAME = this.widgets.find(e => e.name === "filename");

        if (!this.$$shits.MASK) {
          this.$$shits.MASK = initMaskEditor.apply(this);
        }

        if (!this.$$shits.DIR_PATH) {
          throw new Error("dir_path widget not found.");
        }
        if (!this.$$shits.INDEX) {
          throw new Error("index widget not found.");
        }
        if (!this.$$shits.MODE) {
          throw new Error("index widget not found.");
        }
        if (!this.$$shits.FILENAME) {
          throw new Error("filename widget not found.");
        }
        if (!this.$$shits.MASK) {
          throw new Error("maskeditor widget not found.");
        }

        this.$$shits.isInitialized = true;
      } else {
        throw new Error("widgets not found.");
      }
    }).bind(this);

    this.$$shits.getIndex = (function(idx) {
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }
        let i = typeof idx === "number" ? idx : this.$$shits.INDEX.value;
        const min = 0;
        const max = this.$$shits.loadedImages?.length || 0;
        if (i < min) {
          i = max + i;
        } else if (max && i >= max) {
          i = i % max;
        }
        return i;
      } catch(err) {
        console.error(err);
        return 0;
      }
    }).bind(this);

    this.$$shits.loadImageByPath = (async function(filePath) {
      if (!this.$$shits.isInitialized) {
        throw new Error(`node #${this.id} has not been initialized.`);
      }
      if (!filePath || filePath.trim() == "") {
        return;
      }

      filePath = filePath.replace(/[\\\/]+/g, "/");
      let dirPath = filePath.replace(/\/[^\/]+$/, "/");
      let basename = filePath.replace(dirPath, "");
      let filename = basename.replace(/.[^.]+$/, "");

      if (this.$$shits.DIR_PATH.value === dirPath && this.$$shits.FILENAME.value === filename) {
        throw new Error(`Image already loaded: ${dirPath}/${filename}`);
      }

      this.$$shits.resetCounter();
      await this.$$shits.updateDirPath(dirPath);
      await this.$$shits.loadImages();

      let idx = this.$$shits.loadedImages.findIndex(e => {
        return e.origName === filename;
      });

      if (idx === -1) {
        idx = 0;
      }

      this.$$shits.updateIndex(idx);
      this.$$shits.clearImage();
      this.$$shits.selectImage();
      this.$$shits.renderImage();
      selectNode(this);
    }).bind(this);

    this.$$shits.clearImage = (function() {
      if (!this.$$shits.isInitialized) {
        throw new Error(`node #${this.id} has not been initialized.`);
      }
      const w = this.$$shits.MASK;
      w.element.style.width = this.size[0] - 32;
      w.element.style.height = this.size[0] - 32;
      w.origImgLoaded = false;
      w.drawImgLoaded = false;
      w.maskImgLoaded = false;
      w.origCtx.clearRect(0,0,w.origCanvas.width,w.origCanvas.height);
      w.drawCtx.clearRect(0,0,w.drawCanvas.width,w.drawCanvas.height);
      w.maskCtx.clearRect(0,0,w.maskCanvas.width,w.maskCanvas.height);
      w.origImg.src = "";
      w.drawImg.src = "";
      w.maskImg.src = "";
    }).bind(this);

    this.$$shits.selectImage = (function() {
      if (!this.$$shits.isInitialized) {
        throw new Error(`node #${this.id} has not been initialized.`);
      }
      let i = this.$$shits.getIndex();
      this.$$shits.selectedIndex = i;
      this.$$shits.selectedImage = this.$$shits.loadedImages[i];
      if (!this.$$shits.selectedImage) {
        this.$$shits.FILENAME.prevValue = "NO IMAGE";
        this.$$shits.FILENAME.value = "NO IMAGE";
        throw new Error(`No image in ${this.$$shits.DIR_PATH.value}`);
      }
      this.$$shits.FILENAME.prevValue = this.$$shits.selectedImage.origName;
      this.$$shits.FILENAME.value = this.$$shits.selectedImage.origName;
    }).bind(this);

    this.$$shits.renderImage = (function() {
      if (!this.$$shits.isInitialized) {
        throw new Error(`node #${this.id} has not been initialized.`);
      }
      if (!this.$$shits.selectedImage) {
        return;
      }
      try {
        const { origPath, drawPath, maskPath, } = this.$$shits.selectedImage;
        this.$$shits.MASK.origImg.src = getImageURL(origPath);
        this.$$shits.MASK.drawImg.src = drawPath ? getImageURL(drawPath) : "";
        this.$$shits.MASK.maskImg.src = maskPath ? getImageURL(maskPath) : "";
      } catch(err) {
        console.error(err);
      }
    }).bind(this);

    this.$$shits.loadImages = (async function() {
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }

        // clear loaded images
        this.$$shits.loadedImages = [];
  
        // get images in directory
        let d = this.$$shits.DIR_PATH.value;
        if (d && d.trim() !== "") {
          const images = await getImages(d);
          for (const image of images) {
            this.$$shits.loadedImages.push({
              origPath: image["orig_path"],
              origName: image["orig_name"],
              drawPath: image["draw_path"],
              drawName: image["draw_name"],
              maskPath: image["mask_path"],
              maskName: image["mask_name"],
            });
          }
        }
      } catch(err) {
        console.error(err);
      }
    }).bind(this);

    this.$$shits.updateDirPath = (function(str) {
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }
        this.$$shits.DIR_PATH.isCallbackEnabled = false;
        this.$$shits.DIR_PATH.prevValue = str;
        this.$$shits.DIR_PATH.value = str;
        this.$$shits.DIR_PATH.isCallbackEnabled = true;
      } catch(err) {
        console.error(err);
      }
    }).bind(this);

    this.$$shits.updateIndex = (function(idx) {
      this.$$shits.INDEX.isCallbackEnabled = false;
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }
        const isFixed = typeof idx === "number";
        const images = this.$$shits.loadedImages;
        const m = this.$$shits.MODE.value;

        if (!isFixed) {
          idx = this.$$shits.getIndex();
          if (m === "increment") {
            idx += 1;
          } else if (m === "decrement") {
            idx -= 1;
          } else if (m === "randomize") {
            idx = Math.floor(generateRandomNumber(0, images.length));
          }
        }

        const clampedIdx = Math.round(this.$$shits.getIndex(idx));
        this.$$shits.INDEX.value = clampedIdx;
      } catch(err) {
        console.error(err);
      }
      this.$$shits.INDEX.isCallbackEnabled = true;
    }).bind(this);

    this.$$shits.updateCounter = (function() {
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }
        const m = this.$$shits.MODE.value;
        const images = this.$$shits.loadedImages;
        const idx = this.$$shits.INDEX.value;
        this.$$shits.countQueues += 1;
        if (m === "increment" && idx >= images.length - 1) {
          this.$$shits.countLoops += 1;
        } else if (m === "decrement" && idx <= 0) {
          this.$$shits.countLoops += 1;
        }
      } catch(err) {
        console.error(err);
      }
    }).bind(this);

    this.$$shits.resetCounter = (function() {
      try {
        if (!this.$$shits.isInitialized) {
          throw new Error(`node #${this.id} has not been initialized.`);
        }
        this.$$shits.countQueues = 0;
        this.$$shits.countLoops = 0;
        this.$$shits.countErrors = 0;
      } catch(err) {
        console.error(err);
      }
    }).bind(this);

    // create widgets
    this.$$shits.init();

    const dpWidget = this.$$shits.DIR_PATH;
    const idxWidget = this.$$shits.INDEX;
    const fnWidget = this.$$shits.FILENAME;
    const modeWidget = this.$$shits.MODE;
    const maskWidget = this.$$shits.MASK;

    // this.onSelected = (e) => this.setDirtyCanvas(true, true);
    const onKeyDown = this.onKeyDown;
    this.onKeyDown = async function(e) {
      const r = onKeyDown.apply(this, arguments);
      const { key, ctrlKey, metaKey, shiftKey } = e;
      if (key === "ArrowLeft" || key === "ArrowRight") {
        e.preventDefault();
        e.stopPropagation();
        this.$$shits.resetCounter();
        if (key === "ArrowLeft") {
          this.$$shits.updateIndex(this.$$shits.INDEX.value - 1);
        } else {
          this.$$shits.updateIndex(this.$$shits.INDEX.value + 1);
        }
        this.$$shits.clearImage();
        this.$$shits.selectImage();
        this.$$shits.renderImage();
        selectNode(this);
      } else if ((key === "r" && (ctrlKey || metaKey)) || key === "F5") {
        e.preventDefault();
        e.stopPropagation();
        this.$$shits.resetCounter();
        await this.$$shits.loadImages();
        this.$$shits.updateIndex(this.$$shits.getIndex());
        this.$$shits.clearImage();
        this.$$shits.selectImage();
        this.$$shits.renderImage();
        selectNode(this);
      }
      return r;
    };

    dpWidget.isCallbackEnabled = false;
    dpWidget.options.getMinHeight = () => 64;
    dpWidget.options.getMaxHeight = () => 64;
    dpWidget.callback = async function(currValue) {
      if (!this.isCallbackEnabled) {
        return;
      }
      if (this.prevValue !== currValue) {
        this.prevValue = currValue;
        self.$$shits.resetCounter();
        await self.$$shits.loadImages();
        self.$$shits.updateIndex(0);
        self.$$shits.clearImage();
        self.$$shits.selectImage();
        self.$$shits.renderImage();
        selectNode(self);
      }
    }

    fnWidget.callback = function(currValue) {
      if (this.prevValue !== currValue) {
        this.value = this.prevValue;
        alert("You can not change filename.");
      }
    }

    idxWidget.isCallbackEnabled = false;
    idxWidget.timer = null;
    idxWidget.callback = function(v) {
      if (!this.isCallbackEnabled) {
        return;
      }
      if (this.timer) {
        clearTimeout(this.timer);
      }
      self.$$shits.resetCounter();
      self.$$shits.updateIndex(self.$$shits.getIndex());
      self.$$shits.clearImage();
      self.$$shits.selectImage();
      selectNode(self);
      this.timer = setTimeout(async () => {
        self.$$shits.renderImage();
      }, 128);
    }

    // fix widget size
    setTimeout(() => {
      this.setSize(this.size);
      this.setDirtyCanvas(true, true);
    }, 128);
  } catch(err) {
    console.error(err);
  }
}

async function getImages(dirPath) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/get-images`, {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({ path: dirPath }),
  });

  if (response.status !== 200) {
    throw new Error(response.statusText);
  }

  const data = await response.json();

  return data;
}

// Change image after prompt queued
;(() => {
  api.addEventListener("promptQueued", function() {
    for (const node of app.graph._nodes) {
      if (node.type === CLASS_NAME) {
        const prevIndex = node.$$shits.getIndex();
        node.$$shits.updateIndex();
        node.$$shits.updateCounter();
        const currIndex = node.$$shits.getIndex();
        // Prevent thumbnail loading when same image selected
        if (prevIndex !== currIndex) {
          node.$$shits.clearImage();
          node.$$shits.selectImage();
          node.$$shits.renderImage();
        }
      }
    }
  });

  console.log("[comfyui-garbage-shits] Image event added.");
})();

export default {
	name: `shinich39.GarbageShits.Image`,
  async afterConfigureGraph(missingNodeTypes) {
    for (const node of app.graph._nodes) {
      if (node.comfyClass === CLASS_NAME) {
        if (!node.$$shits || !node.$$shits.isInitialized) {
          initNode.apply(node);
        }
        node.$$shits.resetCounter();
        await node.$$shits.loadImages();
        // node.$$shits.updateIndex(node.$$shits.getIndex());
        node.$$shits.clearImage();
        try {
          node.$$shits.selectImage();
        } catch(err) {
          console.error(err);
        }
        node.$$shits.renderImage();

        node.$$shits.DIR_PATH.isCallbackEnabled = true;
        node.$$shits.INDEX.isCallbackEnabled = true;

        node.$$shits.DIR_PATH.prevValue = node.$$shits.DIR_PATH.value; 
        node.$$shits.FILENAME.prevValue = node.$$shits.FILENAME.value;
      }
    }
	},
  nodeCreated(node) {
    if (node.comfyClass === CLASS_NAME) {
      if (!node.$$shits || !node.$$shits.isInitialized) {
        initNode.apply(node);
      }
      if (!app.configuringGraph) {
        ;(async () => {
          node.$$shits.resetCounter();
          await node.$$shits.loadImages();
          // node.$$shits.updateIndex(node.$$shits.getIndex());
          node.$$shits.clearImage();
          try {
            node.$$shits.selectImage();
          } catch(err) {
            console.error(err);
          }
          node.$$shits.renderImage();

          node.$$shits.DIR_PATH.isCallbackEnabled = true;
          node.$$shits.INDEX.isCallbackEnabled = true;
        })();
      }
    }
  },
};