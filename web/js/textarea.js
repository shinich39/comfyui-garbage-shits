"use strict";

import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";

let prevElement = null,
    historyIndex = 0,
    history = [];

const Settings = {
  "EnableHistory": true,
  "EnableNativation": true,
  "EnableComment": true,
  "EnableBeautify": true,
  "EnableBracket": true,
  "EnableGlobalPrompts": true,
  "OverrideDynamicPrompt": true,
  "EnableLogging": true,
}

const Commands = {
  "ctrl+z": undoHandler,
  "ctrl+shift+z": redoHandler,
  "tab": tabHandler,
  "shift+tab": tabHandler, // Navigation
  "ctrl+b": beautifyHandler,
  "ctrl+shift+b": beautifyHandler,
  "ctrl+/": commentHandler,
  "shift+{": bracketHandler,
  "shift+(": bracketHandler,
  "shift+<": bracketHandler,
  "[": bracketHandler,
  "backspace": removeBracketHandler,
  // "enter": linebreakHandler,
  // "\'": bracketHandler,
  // "\`": bracketHandler,
  // "shift+\"": bracketHandler,
}

const Brackets = {
  "(": ["(",")"],
  "{": ["{","}"],
  "[": ["[","]"],
  "<": ["<",">"],
  "\"": ["\"","\""],
  "\'": ["\'","\'"],
  "\`": ["\`","\`"],
}

function getCursor(el) {
  return [
    el.selectionStart,
    el.selectionEnd,
  ];
}

function setCursor(el, start, end) {
  el.focus();
  el.setSelectionRange(start, end);
}

function getLevel(str) {
  let n = 0;
  for (let i = str.length - 1; i >= 0; i--) {
    const ch = str[i];
    if (str[i] === "}" && (!str[i-1] || str[i-1] !== "\\")) {
      n--;
    }
    if (str[i] === "{" && (!str[i-1] || str[i-1] !== "\\")) {
      n++;
    }
  }
  return Math.max(0, n);
}

function parseKey(e) {
  const { key } = e;
  const shiftKey = e.shiftKey;
  const ctrlKey = e.ctrlKey || e.metaKey;
  return { key, shiftKey, ctrlKey };
}

function getKey(e) {
  const { key, ctrlKey, metaKey, shiftKey } = e;
  return (ctrlKey || metaKey ? "ctrl+" : "") + (shiftKey ? "shift+" : "") + key.toLowerCase();
}

function isCommand(e) {
  return !!getCommand(e);
}

function getCommand(e) {
  return Commands[getKey(e)];
}

function stripComments(str) {
  return str.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
}

function setWeights(str, n) {
  const parts = str.split(":");
  let v = parts[0], w = parseFloat(parts[1]);

  if (isNaN(w)) {
    w = Math.pow(1.1, n);
  }

  w = Math.floor(w * 100) / 100;

  if (w === 1) {
    return v;
  } else if (w === 1.1) {
    return `(${v})`;
  } else {
    return `(${v}:${w})`;
  }
}

function calcMaxChars(textarea) {
  const mirror = document.createElement('span');
  document.body.appendChild(mirror);

  const styles = window.getComputedStyle(textarea);
  mirror.style.font = styles.font;
  mirror.style.fontSize = styles.fontSize;
  mirror.style.fontFamily = styles.fontFamily;
  mirror.style.visibility = 'hidden';
  mirror.style.position = 'absolute';
  mirror.style.whiteSpace = 'pre';

  mirror.textContent = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const avgCharWidth = mirror.offsetWidth / mirror.textContent.length;
  document.body.removeChild(mirror);

  const paddingLeft = parseFloat(styles.paddingLeft);
  const paddingRight = parseFloat(styles.paddingRight);
  const contentWidth = textarea.clientWidth - paddingLeft - paddingRight;

  return Math.floor(contentWidth / avgCharWidth);
}

function getGlobalPrompts() {
  const result = {};

  // Note does not have comfyClass
  const notes = app.graph._nodes.filter((item) => 
      item.type === "Note" && item.widgets[0] && item.mode === 0);

  for (const n of notes) {
    const key = n.title;
    const value = n.widgets[0].value;

    if (!result[key]) {
      result[key] = [value];
    } else {
      result[key].push(value);
    }
  }

  return result;
}

function parseString(str) {
  let offset = 0;
  return str.split(/[,()[\]{}|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const index = str.indexOf(item, offset);

      offset = index + item.length;

      return {
        value: item,
        start: index,
        end: index + item.length,
      }
    });
}

function parseDynamicPrompt(prompt) {
  let offset = 0, 
      i = prompt.indexOf("{", offset);
  while(i > -1) {
    offset = i + 1;
    if (prompt.charAt(i - 1) !== "\\") {
      const closingIndex = prompt.indexOf("}", offset);
      if (closingIndex === -1) {
        break;
      }
  
      const nextOpeningIndex = prompt.indexOf("{", offset);
      if (nextOpeningIndex === -1 || closingIndex < nextOpeningIndex) {
        const items = prompt.substring(i + 1, closingIndex).split("|");
        const item = items[Math.floor(Math.random() * items.length)];
  
        prompt = prompt.substring(0, i) + 
          item + 
          prompt.substring(closingIndex + 1);
          
        offset = 0; 
      }
    }
    i = prompt.indexOf("{", offset);
  }

  return prompt;
}

function parseGlobalPrompt(prompt) {
  const globalPrompts = getGlobalPrompts();

  for (const [key, values] of Object.entries(globalPrompts)) {
    prompt = prompt.replaceAll(`$${key}`, () => values[Math.floor(Math.random() * values.length)] || "");
  }

  return prompt;
}

function getNextItem(str, currStart, currEnd, reverse) {
  const items = parseString(str);
  if (!reverse) {
    for (let i = 0; i < items.length; i++) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i + 1] || items[0];
      } else if ((start <= currStart && end >= currStart) || (start > currStart)) {
        return items[i];
      }
    }
    return items[0];
  } else {
    for (let i = items.length - 1; i >= 0; i--) {
      const { value, start, end } = items[i];
      if (start == currStart && end == currEnd) {
        return items[i - 1] || items[items.length - 1];
      } else if ((start <= currStart && end >= currStart) || (end < currStart)) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }
}

function getAllItems(currValue, currStart, currEnd) {
  const items = parseString(currValue);
  let result = [];
  for (let i = 0; i < items.length; i++) {
    const { value, start, end } = items[i];
    if (end > currStart && start < currEnd) {
      result.push(items[i]);
    }
  }
  return result;
}

function getPrevHistory(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    return;
  }
  historyIndex = Math.max(0, historyIndex - 1);
  return history[historyIndex];
}

function getNextHistory(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    return;
  }
  historyIndex = Math.min(history.length - 1, historyIndex + 1);
  return history[historyIndex];
}

function addHistory(e, newHistory) {
  if (!Settings.EnableHistory) {
    return;
  }
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    prevElement = e.target;
    history = [newHistory];
    historyIndex = history.length - 1;
  } else {
    history = history.slice(0, historyIndex + 1);
    const lastHistory = history[history.length - 1];
    if (
      !lastHistory ||
      lastHistory.value !== newHistory.value ||
      lastHistory.start !== newHistory.start ||
      lastHistory.end !== newHistory.end
    ) {
      history.push(newHistory);
    }
    historyIndex = history.length - 1;
  }
}

function undoHandler(e) {
  if (!Settings.EnableHistory) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const h = getPrevHistory(e);
  if (h) {
    const { value, start, end } = h;
    e.target.value = value;
    e.target.focus();
    e.target.setSelectionRange(start, end);
  }
}

function redoHandler(e) {
  if (!Settings.EnableHistory) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const h = getNextHistory(e);
  if (h) {
    const { value, start, end } = h;
    e.target.value = value;
    e.target.focus();
    e.target.setSelectionRange(start, end);
  }
}

function tabHandler(e) {
  if (!Settings.EnableNativation) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);
  const { value, start, end } = getNextItem(currValue, currStart, currEnd, shiftKey);

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: elem.value,
    start: start,
    end: end,
  });

  setCursor(elem, start, end);
}

function beautifyHandler(e) {
  if (!Settings.EnableBeautify) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  // const width = elem.offsetWidth;
  // const height = elem.offsetHeight;
  // const max = calcMaxChars(elem);

  const currParts = currValue.split(/((?<!\\)[,{}()[\]|])/)
    .map((item) => item.trim())
    .filter(Boolean)

  let acc = "", w = 0, d = 0;
  for (let i = 0; i < currParts.length; i++) {
    let v = currParts[i];
    const last = acc[acc.length - 1];
    if (v === "(") {
      w++;
    } else if (v === ")") {
      w--;
    } else if (v === "[") {
      w--;
    } else if (v === "]") {
      w++;
    } else if (v === "{") {
      if (last) {
        if (shiftKey) {
          acc += `\n${"  ".repeat(d)}`;
        } else if (d === 0){
          acc += `\n`;
        }
      }
      acc += `{`;
      d++;
    } else if (v === "}") {
      d--;
      if (shiftKey) {
        acc += `\n${"  ".repeat(d)}`;
      }
      acc += `}`;
    } else if (v === "|") {
      acc += `|`;
    } else if (v === ",") {
      if (shiftKey && (last === "{" || last === "}" || last === "|")) {
        acc += `\n${"  ".repeat(d)}`;
      }
      acc += ",";
    } else {
      if (shiftKey && (last === "{" || last === "}" || last === "|")) {
        acc += `\n${"  ".repeat(d)}`;
      }
      acc += setWeights(v, w);
    }
  }

  let newValue = acc;
  let newStart = acc.length;
  let newEnd = acc.length;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

function commentHandler(e) {
  if (!Settings.EnableComment) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  const lines = currValue.split(/\n/);
  for (let i = 0; i < lines.length - 1; i++) {
    lines[i] += "\n";
  }
 
  const selectedLineIndexes = [];
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = offset;
    const end = offset + line.length - 1;

    offset += line.length;

    if (start > currEnd || end < currStart) {
      continue;
    }

    selectedLineIndexes.push(i);
  }

  let isComment = true;
  for (const i of selectedLineIndexes) {
    if (!(/^\/\//.test(lines[i]))) {
      isComment = false;
      break;
    }
  }

  const changes = [];
  for (const i of selectedLineIndexes) {
    const line = lines[i];
    if (!isComment) {
      lines[i] = "// " + line;
    } else {
      lines[i] = line.replace(/^\/\/[^\S\r\n]*/, "");
    }

    changes.push(lines[i].length - line.length);
  }

  const newValue = lines.join("");
  const newStart = currStart + changes[0];
  const newEnd = currEnd + changes.reduce((acc, cur) => acc + cur, 0);

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

function bracketHandler(e) {
  if (!Settings.EnableBracket) {
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const [opening, closing] = Brackets[key];
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  let newValue = currValue;
  let newStart = currStart;
  let newEnd = currEnd;

  let left = currValue.substring(0, currStart);
  let center = currValue.substring(currStart, currEnd);
  let right = currValue.substring(currEnd);

  newValue = left + opening + center + closing + right;
  newStart = left.length + opening.length;
  newEnd = left.length + opening.length + center.length;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

function removeBracketHandler(e) {
  if (!Settings.EnableBracket) {
    return;
  }
  const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;

  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);

  if (currStart !== currEnd) {
    return;
  }

  const leftChar = currValue.charAt(currStart - 1);
  const rightChar = currValue.charAt(currStart);
  if (!Brackets[leftChar] || Brackets[leftChar][1] !== rightChar) {
    return;
  }

  e.preventDefault();
  e.stopPropagation();

  let left = currValue.substring(0, currStart - 1);
  let center = currValue.substring(currStart, currEnd);
  let right = currValue.substring(currEnd + 1);

  let newValue = left + center + right;
  let newStart = currStart - 1;
  let newEnd = currStart - 1;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

// conflict with pysssss-autocomplete
function linebreakHandler(e) {
  e.preventDefault();
  e.stopPropagation();
  // const { key, shiftKey, ctrlKey } = parseKey(e);
  const elem = e.target;
  const currValue = elem.value;
  const [ currStart, currEnd ] = getCursor(elem);
  const level = getLevel(currValue.substring(0, currStart));

  let newValue = currValue;
  let newStart = currStart;
  let newEnd = currEnd;

  let left = currValue.substring(0, currStart);
  let center = "\n" + Array(level * 2).fill(" ").join("");
  let right = currValue.substring(currEnd);

  if (right.charAt(0) === "}") {
    right = "\n" + Array((level - 1) * 2).fill(" ").join("") + right;
  }

  newValue = left + center + right;
  newStart = left.length + center.length;
  newEnd = left.length + center.length;

  // Add history
  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
  addHistory(e, {
    value: newValue,
    start: newStart,
    end: newEnd,
  });

  // Set value
  elem.value = newValue;
  setCursor(elem, newStart, newEnd);
}

async function keydownHandler(e) {
  try {
    // const { key, shiftKey, ctrlKey } = parseKey(e);
    const command = getCommand(e);
    if (command) {
      command(e);
    }
  } catch(err) {
    console.error(err);
  }
}

function focusHandler(e) {
  if (!prevElement || !e.target.isSameNode(prevElement)) {
    setTimeout(function() {
      const currValue = e.target.value;
      const [ currStart, currEnd ] = getCursor(e.target);
    
      addHistory(e, {
        value: currValue,
        start: currStart,
        end: currEnd,
      });
    }, 10);
  }
}

function clickHandler(e) {
  setTimeout(function() {
    const currValue = e.target.value;
    const [ currStart, currEnd ] = getCursor(e.target);
  
    addHistory(e, {
      value: currValue,
      start: currStart,
      end: currEnd,
    });
  }, 10);
}

function changeHandler(e) {
  const currValue = e.target.value;
  const [ currStart, currEnd ] = getCursor(e.target);

  addHistory(e, {
    value: currValue,
    start: currStart,
    end: currEnd,
  });
}

// Fix selected values via DynamicPrompt
// Synchronize workflow values with prompt(output) values
// {red|green|blue} => red
;(() => {
  const origFunc = api.queuePrompt;
  api.queuePrompt = async function(...args) {
    if (Settings["OverrideDynamicPrompt"]) {
      const { output, workflow } = args[1];
      for (const node of app.graph.nodes) {
        if (!node.widgets) {
          continue;
        }
        for (let i = 0; i < node.widgets.length; i++) {
          const widget = node.widgets[i];
          if (!widget.dynamicPrompts) {
            continue;
          }
          const serializedValue = output[node.id]?.inputs[widget.name];
          const serializedNode = workflow.nodes.find((item) => item.id === node.id);
          if (
            serializedValue && 
            serializedNode && 
            typeof serializedNode.widgets_values[i] === typeof serializedValue
          ) {
            serializedNode.widgets_values[i] = serializedValue;
          }
        }
      }
    }

    return await origFunc.call(api, ...args);
  }
})();

export default {
	name: "shinich39.GarbageShits.Textarea",
  settings: [
    {
      id: 'shinich39.GarbageShits.Textarea.EnableLogging',
      category: ['GarbageShits', 'Textarea', 'EnableLogging'],
      name: 'Enable Logging',
      tooltip: 'Write prompts in the console',
      type: 'boolean',
      defaultValue: false,
      onChange: (value) => {
        Settings["EnableLogging"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.OverrideDynamicPrompt',
      category: ['GarbageShits', 'Textarea', 'OverrideDynamicPrompt'],
      name: 'Override Dynamic Prompt',
      tooltip: 'Override selected value via DynamicPrompt to workflow',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["OverrideDynamicPrompt"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableBracket',
      category: ['GarbageShits', 'Textarea', 'EnableBracket'],
      name: 'Enable Bracket',
      tooltip: 'Insert closing bracket with opening bracket',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableBracket"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableGlobalPrompts',
      category: ['GarbageShits', 'Textarea', 'EnableGlobalPrompts'],
      name: 'Enable Global Prompts',
      tooltip: 'Set global prompt to Notes. Key is Title of Note. Use to prompt with a key with a leading "$"',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableGlobalPrompts"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableBeautify',
      category: ['GarbageShits', 'Textarea', 'EnableBeautify'],
      name: 'Enable Beautify',
      tooltip: 'Ctrl + B, Ctrl + Shift + B',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableBeautify"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableComment',
      category: ['GarbageShits', 'Textarea', 'EnableComment'],
      name: 'Enable Comment',
      tooltip: 'Ctrl + \/',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableComment"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableNavigation',
      category: ['GarbageShits', 'Textarea', 'EnableNavigation'],
      name: 'Enable Navigation',
      tooltip: 'Tab',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableNavigation"] = value;
      }
    },
    {
      id: 'shinich39.GarbageShits.Textarea.EnableHistory',
      category: ['GarbageShits', 'Textarea', 'EnableHistory'],
      name: 'Enable History',
      tooltip: 'Ctrl + Z, Ctrl + Shift + Z',
      type: 'boolean',
      defaultValue: true,
      onChange: (value) => {
        Settings["EnableHistory"] = value;
      }
    },
  ],
	init() {
    const STRING = ComfyWidgets.STRING;
    ComfyWidgets.STRING = function (node, inputName, inputData) {
      const r = STRING.apply(this, arguments);
      if (!inputData[1]?.multiline) {
        return r;
      }
      if (!r.widget?.element) {
        return r;
      }
    
      const elem = r.widget.element;
      elem.addEventListener("keydown", keydownHandler, true);
      elem.addEventListener("focus", focusHandler, true);
      elem.addEventListener("input", changeHandler, true);
      elem.addEventListener("click", clickHandler, true);

      return r;
    };
	},
  nodeCreated(node) {
		if (node.widgets) {
			// Locate dynamic prompt text widgets
			// Include any widgets with dynamicPrompts set to true, and customtext
			const widgets = node.widgets.filter(
				(n) => n.dynamicPrompts
			);
			for (const widget of widgets) {
				// Override the serialization of the value to resolve dynamic prompts for all widgets supporting it in this node
        const origSerializeValue = widget.serializeValue;
        widget.serializeValue = async function(workflowNode, widgetIndex) {
          let r = await origSerializeValue?.apply(this, arguments) ?? widget.value;

          // Bugfix: Custom-Script presetText.js has overwrite original dynamicPrompt
          if (Settings["EnableGlobalPrompts"]) {
            r = parseGlobalPrompt(r);
          }
          r = stripComments(r);
          r = parseDynamicPrompt(r);

          // Overwrite the value in the serialized workflow pnginfo
          if (workflowNode?.widgets_values) {
            workflowNode.widgets_values[widgetIndex] = r;
          }

          // Debug
          if (Settings["EnableLogging"]) {
            console.log(`[comfyui-garbage-shits][#${node.id}]`, r);
          }

          return r;
        }
			}
		}
	},
}