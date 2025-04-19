"use strict";

import { app } from "../../../scripts/app.js";

const Settings = {
  "Enable": true,
}

function isValidType(a, b) {
  a = a.toLowerCase();
  if (["any", "*"].indexOf(a) > -1) {
    return true;
  }
  b = b.toLowerCase();
  if (["any", "*"].indexOf(b) > -1) {
    return true;
  }
  return a === b;
}

function getValidTargets(node, type, isInput) {
  const result = [];
  for (const n of app.graph._nodes) {
    if (n.id === node.id) {
      continue;
    }

    const slots = isInput ?
      n.outputs?.filter(e => isValidType(e.type, type)) ?? [] :
      n.inputs?.filter(e => isValidType(e.type, type)) ?? [];

    if (slots.length > 0) {
      result.push(n);
    }
  }
  return result;
}

function moveCanvas(x, y) {
  app.canvas.ds.offset[0] = x;
  app.canvas.ds.offset[1] = y;
  if (app.canvas.ds.onredraw) {
    app.canvas.ds.onredraw(app.canvas.ds);
  }
}

function renderCanvas() {
  app.canvas.draw(true, true);
}

try {
  let onDrag = false;
  let isInput;
  let targets = [];
  let targetIndex;

  function getTargetIndex() {
    const x = app.canvas.graph_mouse[0];
    for (let i = 0; i < targets.length; i++) {
      if (x < targets[i].pos[0]) {
        return i;
      }
    }
    return 0;
  }

  function moveCanvasToTarget(target) {
    try {
      if (!target) {
        return;
      }

      let x = app.canvas.ds.offset[0];
      let y = app.canvas.ds.offset[1];

      x += app.canvas.graph_mouse[0];
      y += app.canvas.graph_mouse[1];

      x -= target.pos[0];
      y -= target.pos[1];

      x -= target.size[0] * 0.5;
      y -= target.size[1] * 0.5;

      moveCanvas(x, y);
      renderCanvas();
    } catch(err) {
      console.error(err);
    }
  }

  const origProcessMouseDown = LGraphCanvas.prototype.processMouseDown;
  LGraphCanvas.prototype.processMouseDown = function(e) {
    const r = origProcessMouseDown?.apply(this, arguments);

    if (!Settings.Enable) {
      return r;
    }

    onDrag = this.connecting_links && this.connecting_links.length > 0;

    if (onDrag) {
      try {
        const { input, output, node, slot } = this.connecting_links[0];
        if (input || output) {
          isInput = !!input;
  
          const validTargets = getValidTargets(node, (isInput ? input : output).type, isInput);

          targets = [node, ...validTargets].sort((a, b) => a.pos[0] - b.pos[0]);

          // targetIndex = targets.findIndex((n) => n == node) + 1;
          targetIndex = getTargetIndex();
        }
      } catch(err) {
        console.error(err);
      }
    }

    return r;
  }

  // const origProcessMouseMove = LGraphCanvas.prototype.processMouseMove;
  // LGraphCanvas.prototype.processMouseMove = function(e) {
  //   const r = origProcessMouseMove?.apply(this, arguments);
  //   if (onDrag) {
  //     // console.log(e.clientX - initialClientX, e.clientY - initialClientY);
  //   }
  //   return r;
  // }

  const origProcessMouseUp = LGraphCanvas.prototype.processMouseUp;
  LGraphCanvas.prototype.processMouseUp = function(e) {
    const r = origProcessMouseUp?.apply(this, arguments);
    if (onDrag) {
      onDrag = false;
    }
    return r;
  }

  // global event
  window.addEventListener("contextmenu", function(e) {
    if (!onDrag) {
      return;
    }

    e.preventDefault();

    const target = targets[targetIndex % targets.length];
    moveCanvasToTarget(target);
    targetIndex++;
  }, true);
} catch(err) {
  console.error(err);
}

export default {
	name: "shinich39.GarbageShits.SearchTarget",
  settings: [
    {
      id: 'shinich39.GarbageShits.SearchTarget.Enable',
      category: ['GarbageShits', 'SearchTarget', 'Enable'],
      name: 'Enable',
      tooltip: 'Search target to mouse right button on dragging',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["Enable"] = value;
      }
    },
  ],
};