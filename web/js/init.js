import { app } from "../../../scripts/app.js";

import metadataLoaders from "./metadata-loaders.js";
import textarea from "./textarea.js";
import imageLoaders from "./image-loaders.js";
import randomRoutes from "./random-routes.js";
import powerMode from "./power-mode.js";
import runJavascript from "./run-javascript.js";
import searchTarget from "./search-target.js";
import civitai from "./civitai.js";

app.registerExtension(imageLoaders);
app.registerExtension(randomRoutes);
app.registerExtension(textarea);
app.registerExtension(metadataLoaders);
app.registerExtension(powerMode);
app.registerExtension(searchTarget);
app.registerExtension(civitai);
app.registerExtension(runJavascript);