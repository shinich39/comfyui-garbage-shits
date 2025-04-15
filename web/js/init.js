import { app } from "../../../scripts/app.js";
import { api } from "../../../scripts/api.js";

import metadata from "./metadata.js";
import action from "./action.js";
import image from "./image.js";
import random from "./random.js";
import power from "./power.js";
import run from "./run.js";
import civitai from "./civitai.js";

app.registerExtension(image);
app.registerExtension(random);
app.registerExtension(action);
app.registerExtension(metadata);
app.registerExtension(power);
app.registerExtension(civitai);
app.registerExtension(run);