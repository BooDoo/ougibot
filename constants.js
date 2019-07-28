// Our shared constants module
const ALDONIRO_ID = '243090135120347136';
const CHEEKY_RANDOS_ID = '597536757105426432';
const DISCORD_TOKEN = creds.discord.token;
const SAUCENAO_KEY = creds.saucenao.key;
const SAFEBOORU_ROOT = 'https://safebooru.org';
const SAUCENAO_ROOT = 'https://saucenao.com';
const PIXIV_ROOT = 'https://pixiv.net';

const COLORS = {
  "ok": 0x71cd40,
  "mid": 0xffcc00,
  "bad": 0xb00d00
};

// Some stuff for ALTTPR Dailies
const RANDO_ICON_MAP = {
  0: 'Bow', 1: 'Boomerang', 2: 'Hookshot', 3: 'Bombs',
  4: 'Mushroom',  5: 'Magic Powder', 6: 'Ice Rod', 7: 'Pendant',
  8: 'Bombos', 9: 'Ether', 10: 'Quake', 11: 'Lamp',
  12: 'Hammer', 13: 'Shovel', 14: 'Flute', 15: 'Bugnet', 16: 'Book',
  17: 'Empty Bottle', 18: 'Green Potion', 19: 'Somaria', 20: 'Cape',
  21: 'Mirror', 22: 'Boots', 23: 'Gloves', 24: 'Flippers',
  25: 'Moon Pearl', 26: 'Shield', 27: 'Tunic', 28: 'Heart',
  29: 'Map', 30: 'Compass', 31: 'Big Key'
};

const RANDO_CODE_KEY = '1573397'; // find this value in patch data for "code" icon values
      RANDO_PROTOCOL = 'https',
      RANDO_DOMAIN = 'alttpr.com',
      RANDO_DAILY_PATH = 'daily',
      RANDO_HASH_ELEMENT = 'vt-hash-loader',
      RANDO_DAILY_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/${RANDO_DAILY_PATH}`,
      RANDO_SEED_HASH_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/hash/`,
      RANDO_PERMALINK_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/h/`;

// Hold my beer
Object.defineProperty(global,'ALDONIRO_ID',{value:ALDONIRO_ID,writable:false,configurable:false});
Object.defineProperty(global,'CHEEKY_RANDOS_ID',{value:CHEEKY_RANDOS_ID,writable:false,configurable:false});
Object.defineProperty(global,'DISCORD_TOKEN',{value:DISCORD_TOKEN,writable:false,configurable:false});
Object.defineProperty(global,'SAUCENAO_KEY',{value:SAUCENAO_KEY,writable:false,configurable:false});
Object.defineProperty(global,'SAFEBOORU_ROOT',{value:SAFEBOORU_ROOT,writable:false,configurable:false});
Object.defineProperty(global,'SAUCENAO_ROOT',{value:SAUCENAO_ROOT,writable:false,configurable:false});
Object.defineProperty(global,'PIXIV_ROOT',{value:PIXIV_ROOT,writable:false,configurable:false});
Object.defineProperty(global,'COLORS',{value:COLORS,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_ICON_MAP',{value:RANDO_ICON_MAP,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_CODE_KEY',{value:RANDO_CODE_KEY,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_PROTOCOL',{value:RANDO_PROTOCOL,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_DOMAIN',{value:RANDO_DOMAIN,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_DAILY_PATH',{value:RANDO_DAILY_PATH,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_HASH_ELEMENT',{value:RANDO_HASH_ELEMENT,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_DAILY_URL',{value:RANDO_DAILY_URL,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_SEED_HASH_URL',{value:RANDO_SEED_HASH_URL,writable:false,configurable:false});
Object.defineProperty(global,'RANDO_PERMALINK_URL',{value:RANDO_PERMALINK_URL,writable:false,configurable:false});