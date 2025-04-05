"use strict";

import { api } from "../../../scripts/api.js";
import { app } from "../../../scripts/app.js";

async function send(id) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/${id}`);
  if (response.status !== 200) {
    throw new Error(response.statusText);
  }
}

export default {
	name: "shinich39.GarbageShits.Power",
  settings: [
    {
      id: 'shinich39.GarbageShits.Power.DisableScreenSaver',
      category: ['GarbageShits', 'Power', 'DisableScreenSaver'],
      name: 'Prevent Screen Saver',
      // tooltip: '',
      type: 'boolean',
      defaultValue: false,
      onChange: async (value) => {
        try {
          if (app.ui.settings.getSettingValue("shinich39.GarbageShits.Power.DisableSystemSleep")) {
            await app.ui.settings.setSettingValueAsync("shinich39.GarbageShits.Power.DisableSystemSleep", false);
          }
        } catch(err) {
          // Error with ComfyUI initialization 
          // console.error(err);
        }
        await send(value ? "disable-screen-saver" : "enable-screen-saver");
      }
    },
    {
      id: 'shinich39.GarbageShits.Power.DisableSystemSleep',
      category: ['GarbageShits', 'Power', 'DisableSystemSleep'],
      name: 'Prevent System Sleep',
      // tooltip: '',
      type: 'boolean',
      defaultValue: false,
      onChange: async (value) => {
        try {
          if (app.ui.settings.getSettingValue("shinich39.GarbageShits.Power.DisableScreenSaver")) {
            await app.ui.settings.setSettingValueAsync("shinich39.GarbageShits.Power.DisableScreenSaver", false);
          }
        } catch(err) {
          // Error with ComfyUI initialization 
          // console.error(err);
        }
        await send(value ? "disable-system-sleep" : "enable-system-sleep");
      }
    },
  ]
};