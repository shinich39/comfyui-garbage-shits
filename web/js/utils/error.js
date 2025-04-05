import { app } from "../../../scripts/app.js";

function createNote(str, x, y, width, height) {
  const newNode = LiteGraph.createNode("Note");
  newNode.pos = [x, y];
  newNode.size = [width, height];
  newNode.widgets[0].value = str;
  app.canvas.graph.add(newNode, false);
  app.canvas.selectNode(newNode);
  return newNode;
}

export function showError(node, message) {
  const note = createNote(
    message,
    node.pos[0],
    node.pos[1],
    node.size[0],
    node.size[1],
  );
  note.bgcolor = "#c61010";
  note.color = "#da2424";
}