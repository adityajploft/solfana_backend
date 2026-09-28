import fs from 'fs';
import path from 'path';

const cache = {};

function loadLang(lang, file) {
  const key = `${lang}:${file}`;
  if (cache[key]) return cache[key];

  const filePath = path.join(process.cwd(), 'src', 'lang', lang, `${file}.json`);

  if (!fs.existsSync(filePath)) {
    console.warn('Lang file not found:', filePath);
    return {};
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  cache[key] = data;
  return data;
}

export function t(lang = 'fr', file = 'common', key) {
  const dict = loadLang(lang, file);
  return dict[key] || key;
}
