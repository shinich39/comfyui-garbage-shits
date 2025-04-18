"use strict";

import { api } from "../../../scripts/api.js";

function wait(delay) {
  return new Promise(function (resolve) {
    return setTimeout(resolve, delay);
  });
}

async function send(id) {
  const response = await api.fetchApi(`/shinich39/comfyui-garbage-shits/${id}`);
  if (response.status !== 200) {
    throw new Error(response.statusText);
  }
}

export default {
	name: "shinich39.GarbageShits.PowerMode",
  settings: [
    {
      id: 'shinich39.GarbageShits.PowerMode.Mode',
      category: ['GarbageShits', 'PowerMode', 'Mode'],
      name: 'Mode',
      type: 'combo',
      options: ['None', 'Sleep', 'Screen Saver'],
      defaultValue: `None`,
      onChange: async (value) => {
        while(true) {
          try {
            switch(value) {
              case "Sleep": await send(`enable-system-sleep`); break;
              case "Screen Saver": await send(`enable-screen-saver`); break;
              default: await send(`disable-power-mode`); break;
            }
            break;
          } catch(err) {
            console.error(err.message);
            await wait(1024);
          }
        }
      }
    },
  ]
};