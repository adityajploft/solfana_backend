import constants from "./constants.config.js"

const configs  = { constants};

export function config(path) {
  const keys = path.split(".");
  let result = configs;

  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      throw new Error(`Config key "${path}" not found`);
    }
  }

  return result;
}

export default configs;