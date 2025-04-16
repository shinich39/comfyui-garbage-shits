import { app } from "../../../scripts/app.js";

import metadata from "./metadata.js";
import textarea from "./textarea.js";
import image from "./image.js";
import random from "./random.js";
import power from "./power.js";
import run from "./run.js";
import civitai from "./civitai.js";

app.registerExtension(image);
app.registerExtension(random);
app.registerExtension(textarea);
app.registerExtension(metadata);
app.registerExtension(power);
app.registerExtension(civitai);
app.registerExtension(run);