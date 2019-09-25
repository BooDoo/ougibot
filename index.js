#!/usr/bin/env node

// Replace Math.random() with MT-based substitute:
const MersenneTwister = require('mersenne-twister');
const rng = new MersenneTwister();
Math.random = rng.random.bind(rng);

// Then go ahead and set up rest as normal
const path = require('path');
const _ = require('lodash');
const P = require('bluebird');
const rp = require('request-promise');
const Discord = require('discord.js');
const ougi = new Discord.Client();
const cheerio = require('cheerio');
const schedule = require('node-schedule');

const creds = require('./credentials');
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
const RANDO_PROTOCOL = 'https',
      RANDO_DOMAIN = 'alttpr.com',
      RANDO_DAILY_PATH = 'daily',
      RANDO_HASH_ELEMENT = 'Hashloader',
      RANDO_DAILY_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/${RANDO_DAILY_PATH}`,
      RANDO_SEED_HASH_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/hash/`,
      RANDO_PERMALINK_URL = `${RANDO_PROTOCOL}://${RANDO_DOMAIN}/h/`,
      ALDONIRO_ID = '243090135120347136',
      CHEEKY_RANDOS_ID = '597536757105426432';
let lastRandoDailyHash = '';

let userIDs = creds.identities;
// Create some convenience aliases:
userIDs.drew = userIDs.alix = userIDs.alixnovosi = userIDs.shelur = userIDs.andrew;
userIDs.boodoo = userIDs.boodooperson = userIDs.gm = userIDs.joel;
userIDs.nixed = userIDs.nickisnixed = userIDs.humble = userIDs.nick;
userIDs.tsiro = userIDs.orist = userIDs.richard;
userIDs.nate = userIDs.lentilstew = userIDs.lentil = userIDs.nathaniel;
userIDs.webber = userIDs.weebs;

let embedOpts = {
  "~safebooru": {
    embed: {
      color: null,
      provider: {
        name: "Safebooru",
        url: SAFEBOORU_ROOT
      },
      image: {
        url: null
      },
      title: null,
      description: null,
      url: null
    }
  },
  "~saucenao": {
    embed: {
      color: null,
      provider: {
        name: "SauceNAO",
        url: SAUCENAO_ROOT
      },
      image: {
        url: null
      },
      title: "Check SauceNAO",
      description: null,
      url: null
    }
  }
};

function hasAdmin(role) {
  return role.hasPermission(Discord.Permissions.FLAGS.ADMINISTRATOR);
}

function notAdmin(role) {
  return !hasAdmin(role)
}

function isAssignable(role) {
  // return !hasAdmin(role) && role.position > 0;
  // Ugggh, let's just take anything under 'ougibot' that isn't @everyone:
  let ougiPosition = role.guild.roles.find('name', 'ougibot').position;
  return ougiPosition > role.position && role.position > 0;
}

function formatRoles(rolesCol) {
  return rolesCol.map(r=>r.name).join(' | ');
}

function findRole(query, roles) {
  roles = roles || ougi.guilds.first().roles;
  return roles.find(r=> ~r.name.toLowerCase().indexOf(query))
}

function checkMemberByName(member, query) {
  let username = member.user.username.toLowerCase();
  query = query.toLowerCase();
  return ~username.indexOf(query);
}

function getGuildMember(query) {
  let guild = ougi.guilds.first();
  let member;

  // did we pass an id? or a username?
  member = guild.members.get(query) || guild.members.find(m=>checkMemberByName(m, query));

  console.log(`and we got: ${member}`);
  return member;
}

function adjustRole(action, member, role) {
  member = member.constructor.name == "GuildMember" ? member : getGuildMember(member);
  role = role.constructor.name == "Role" ? role : findRole(role);
  if (!isAssignable(role)) {
    return P.resolve({content: `No role found to change`});
  }
  action = (action || 'add').toLowerCase() + "Role";
  return member[action](role, "spooky ougi").
      then(m=>{ return {content: `Your roles: ${formatRoles(member.roles.filter(isAssignable))}`} });
}

let commandProcessors = {
  "~role": function(message, supplicant, channel) {
    let payload = message.content.toLowerCase().split(' ').splice(1);
    let defaultAction = channel.type == "dm" ? 'mine' : 'list';
    let action = payload.shift() || defaultAction;
    let role = payload.join(' ');
    let supplicantMember = message.member || getGuildMember(supplicant.id);

    let guild = supplicantMember.guild;
    let ougiPosition = guild.roles.find('name', 'ougibot').position;

    let actions = {
      "list": (member) => {
        return P.resolve({
          content: `Available roles: ${formatRoles(member.guild.roles.filter(isAssignable))}`
        });
      },
      "mine": (member) => {
        return P.resolve({
          content: `Your roles: ${formatRoles(member.roles.filter(isAssignable))}`
        });
      },
      "add": (member, role) => {
        return adjustRole("add", member, role);
      },
      "remove": (member, role) => {
        return adjustRole("remove", member, role);
      }
    }

    return actions[action](supplicantMember, role);

  },
  "~safebooru": function(message, supplicant, channel) {
    let payload = message.content.toLowerCase().split(' ').splice(1).join(' '),
        tags = parseTags(payload);

    return rp({
      uri: `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${tags.join('+')}`,
      json: true
    }).then(res => {

      if (!res) {
        return {
          content: '',
          opts: {embed: {color: COLORS.bad, description: `${mentionString(supplicant)} Nothing found for ${tagReturn(tags)}` }}
        };
      }

      let content = '',
          opts = _.cloneDeep(embedOpts['~safebooru']),
          resultCount = res ? res.length : 0,
          img = _.sample(res),
          directory = img.directory,
          base = img.image,
          id = img.id,
          pageUrl = `${SAFEBOORU_ROOT}/index.php?page=post&s=view&id=${id}`,
          imgUrl = `${SAFEBOORU_ROOT}/images/${directory}/${base}`,
          sampleUrl = `${SAFEBOORU_ROOT}/samples/${directory}/sample_${base}`,
          hasSample = img.sample;

      // console.log(`let's work with: ${imgUrl}`);
      opts.embed.color = COLORS.ok;
      opts.embed.title = "View on Safebooru";
      opts.embed.description = `${mentionString(supplicant)}`;
      opts.embed.description += ` 1 of ${resultCount}`;
      opts.embed.description += (resultCount === 100) ? '+' : '';
      opts.embed.description += ` for\n${tagReturn(tags)}`;
      if (hasSample) {
        opts.embed.description += "\n(using resized sample)";
        opts.embed.url = pageUrl;
        opts.embed.image.url = sampleUrl;
      }
      else {
        opts.embed.url = pageUrl;
        opts.embed.image.url = imgUrl;
      }

      return {content: content, opts: opts};
    });
  },

  "~saucenao": function(message, supplicant, channel) {
    let content = '',
        opts = _.cloneDeep(embedOpts['~saucenao']),
        urlsTest = /https?:\/\/\S{2,}\.\S{2,}/ig,
        srcUrl, encodedUrl, matches, topMatch;

    // console.log(`Working on ~src for ${message.id} from ${supplicant.username} in ${channel}`);

    if (message.content.match(urlsTest)) {
      srcUrl = message.content.match(urlsTest)[0];
    }
    else if (message.embeds.length) {
      // console.dir(message.embeds);
      let imgEmbeds = _.filter(message.embeds, {type: 'image'});
      if (imgEmbeds) {
        srcUrl = imgEmbeds[0].url;
      }
    }
    else if (message.attachments.array().length) {
      // console.dir(message.attachments.array());
      srcUrl = message.attachments.map(attach=>attach.url)[0];
    }

    if (srcUrl) {
      encodedUrl = encodeURIComponent(srcUrl);
      return rp({
        uri: `${SAUCENAO_ROOT}/search.php?api_key=${SAUCENAO_KEY}&db=999&output_type=2&numres=2&url=${encodedUrl}`,
        json: true
      }).then(res => {
        if (res.results.length && res.results[0].data.pixiv_id) {
          matches = res.results;
          topMatch = matches[0];
          opts.embed.color = COLORS.ok;
          opts.embed.title = `${topMatch.data.title} by ${topMatch.data.member_name || topMatch.data.creator}`;
          opts.embed.url = `${PIXIV_ROOT}/member_illust.php?mode=medium&illust_id=${topMatch.data.pixiv_id}`;
          opts.embed.description = `${mentionString(supplicant)} Found on Pixiv!`;
          opts.embed.image.url = topMatch.header.thumbnail;
        }
        else {
          opts.embed.color = COLORS.bad;
          opts.embed.title = 'Check SauceNAO';
          opts.embed.url = `${SAUCENAO_ROOT}/search.php?db=999&url=${encodedUrl}`;
          opts.embed.description = `${mentionString(supplicant)} I didn't find any Pixiv matches…good luck!`
        }

        // console.log(`SRC: Ready to return with ${content} and`);
        // console.dir(opts);
        return {content: content, opts: opts};
      });
    }

    else {
      opts.embed.color = COLORS.bad;
      opts.embed.title = '';
      opts.embed.description = `${mentionString(supplicant)} Not sure what you want source for…`
      return Promise.resolve({content: content, opts: opts});
    }
  },

  "~rando": async function(message, supplicant, channel) {
    let payload = message.content.split(' ').splice(1);
    let hash;

    if (_.isEmpty(payload) || payload[0] == "daily") {
      hash = lastRandoDailyHash || await fetchRandoDailyHash();
    } else {
      hash = payload[0];
    }

    let embed = await makeRandoDailyEmbed(hash);
    return {content: '', opts: embed};
  }
};
// set cmdProc aliases:
commandProcessors['~s'] = commandProcessors['~sb'] = commandProcessors['~safe'] = commandProcessors['~safebooru'];
commandProcessors['~source'] = commandProcessors['~sauce'] = commandProcessors['~src'] = commandProcessors['~saucenao'];
commandProcessors['~r'] = commandProcessors['~roles'] = commandProcessors['~role'];
commandProcessors['~daily'] = commandProcessors['~alttpr'] = commandProcessors['~seed'] = commandProcessors['~rando'];

function tagReturn(tags) {
  let toEscape = /([\*\_])/g;
  return `${tags.join(' ').replace(toEscape,"\\$1")}`;
}

function mentionString(user) {
  return `<@!${user.id}>`;
}

function joinInParens(text) {
  let inP = false,
      newText = _.map(text, c => {
        if (c === '(') { inP = true}
        else if (c === ')') {inP = false}

        if (inP && c === ' ') {return '_'}
        else {return c}
  }).join('');

  return newText;
};

function parseTags(payload) {
  // let's start simple.
  let tags,
      beforeParens = /.\(/g,
      tagString = payload;

  // if there's a comma, assuming CSV and all spaces can be replaced
  if (~tagString.indexOf(',')) {
    tags = tagString.split(/ ?, ?/).map(tag => tag.replace(/ +/g, '_'));
  }
  else {
      // force underscore before open parens
      tagString = tagString.replace(beforeParens, '_(');
      // now join words within parens using underscores
      tagString = joinInParens(tagString);
      // and split tags at any remaining space(s), plus(es) or comma(s)
      tags = tagString.split(/[ ,+]+/);
  }
  return tags;
}

function parseCommand(msg) {
  // all commands start with ~
  if (msg.content[0] !== '~') { return {proc: null, message: msg} }
  // let's ignore case, for now
  // find processor function
  let proc = commandProcessors[msg.content.toLowerCase().split(' ')[0]],
      supplicant = msg.author,
      channel = msg.channel;

  return {proc: proc, message: msg, supplicant: supplicant, channel: channel};
}

function rot13(input) {
  // thanks, "ESL": http://stackoverflow.com/a/41435838/1414079
  return input.
    replace(/[a-z]/gi,c=>String.fromCharCode((c=c.charCodeAt())+((c&95)>77?-13:13))).
    replace(/\d/gi,c=>(c>4?-5:5)+c*1);
}

function twitterImageCount(message, match) {
  // There could be more than one match! Discord embeds all of them
  // Unfortunately we can't use more than one of the same reaction
  // So just choose the last one i guess :(
  link = match[match.length - 1]
  // console.log(`Going to ${link}`)
  rp({
    uri: link,
    json: false
  }).then(res => {
    // We look for both og:image and /media/ because videos also have an og:image
    // Also to make this more annoying for people (joel) to try and cheese this
    picMatch = res.match(/meta\s+property="og:image"\s+content="https:\/\/[a-z\.]+\/media/gi)

    // Up to four images, if we get more do nothing
    if (picMatch !== null && picMatch.length <= 4) {
      numbers = ['1⃣', '2⃣', '3⃣', '4⃣'];
      // React in order
      message.react(numbers[picMatch.length - 1]).then(react => {
        react.message.react('🖼');
      });
    }
  }).catch(err => {
    console.error(err);
  })
}



ougi.on('ready', () => {
  console.log('Ougibot is ready!');
});

// create an event listener for messages
ougi.on('message', message => {
  // General command/utility interpretation for non-DM
  let command = parseCommand(message);
  if (command.proc) {
    let toReply = command.proc(command.message, command.supplicant, command.channel);
    toReply.then(response => {
      // console.dir(response.opts);
      return command.channel.send(response.content, response.opts);
    }).catch(err => {
      console.error(err);
      return command.channel.send('', {embed: {
          color: COLORS.bad,
          description: `${mentionString(command.supplicant)} Oh no I hecked up`
        }
      });
    });
  }
  // return DMs as ROT13(/5):
  else if (message.channel.type == "dm" && !message.author.bot) {
    return message.reply(rot13(message.content));
  }
  else {
    // Twitter link?
    match = message.content.match(/https:\/\/twitter.com\/[a-z_0-9]+\/status\/[0-9]+/gi)
    if (match !== null) {
      twitterImageCount(message, match);
    }
  }
});

ougi.on('messageReactionAdd', (msgReaction, user) => {
  // console.log(`I saw a reaction, using ${msgReaction.emoji.name}, from ${user.username}`);
  let rotTriggers = ['🔃','🔄'],
      srcTriggers = ['ℹ'];

  // If the reaction is :arrows_clockwise: or :arrows_counterclockwise:
  if (~_.indexOf(rotTriggers, msgReaction.emoji.name)) {
      let originalContent = msgReaction.message.content,
          rotContent = rot13(originalContent);

    if (rotContent) {
      // DM the user, with ROT13 of the message body.
      return user.createDM().then(dm => dm.send(rotContent)).catch(console.error);
    } else {
      return Promise.resolve('ROT13: nothing to decode');
    }

  }

  // ELSE: If the reaction is :information_source:
  else if (~_.indexOf(srcTriggers, msgReaction.emoji.name)) {
    // act like ~src command, but reply by DM
    let dm = user.createDM(),
        toReply = commandProcessors["~saucenao"](msgReaction.message, user, null);

    return P.all([dm, toReply]).
      then(([dm, toReply]) => dm.send(toReply.content, toReply.opts)).
      catch(console.error);
  }
});


/*
/   _|_|    _|    _|_|_|_|_|  _|_|_|_|_|  _|_|_|    _|_|_|    
/ _|    _|  _|        _|          _|      _|    _|  _|    _|  
/ _|_|_|_|  _|        _|          _|      _|_|_|    _|_|_|    
/ _|    _|  _|        _|          _|      _|        _|    _|  
/ _|    _|  _|_|_|_|  _|          _|      _|        _|    _| 
*/
// With thanks to @tcprescott for /pyz3r and /alttpr-discord-bot repos
// for guidance on endpoints, etc. All errors are my own.

async function fetchRandoDailyHash() {
  const dailyHTML = await rp(RANDO_DAILY_URL),
        dailyDOM = cheerio.load(dailyHTML),
        dailyHash = dailyDOM(RANDO_HASH_ELEMENT)[0].attribs.hash;

  if (dailyHash) {
    // console.log(`Got hash: ${dailyHash}`);
    return dailyHash;
  } else {
    return new Error("No hash found/parsed");
  }
}

async function fetchRandoDailyJSON(hash) {
  if (hash) {
    const seedUrl = `${RANDO_SEED_HASH_URL}${hash}`;
    // console.dir(`Fetching ${seedUrl}`);
    const seedJson = await rp({url: seedUrl, json: true});
    // console.dir(seedJson.spoiler.meta.name);
    return seedJson;
  } else {
    return new Error("No hash provided");
  }
}
async function makeRandoDailyEmbed(hash) {
    const seed = await fetchRandoDailyJSON(hash),
          meta = seed.spoiler.meta,
          permalinkUrl = `${RANDO_PERMALINK_URL}${hash}`;

    let descriptionString = `This is a summary of seed ${hash}`;
    let itemCode = _.find(seed.patch, RANDO_CODE_KEY);

    let embed = new Discord.RichEmbed();
      embed.setTitle(meta.name || `Custom Seed ${hash}`);
      embed.setDescription(descriptionString); // also be more clever here
      embed.setColor(COLORS.ok); // base this on difficulty, mode, etc.
      embed.setURL(permalinkUrl);

      embed.addField('Item Placement',
`**Glitches Required:** ${meta.logic}
**Item Placement:** ${meta.item_placement}
**Dungeon Items:** ${meta.dungeon_items}
**Accessibility:** ${meta.accessibility}`,
      true);

      embed.addField('Goal',
`**Goal:** ${meta.goal}
**Open Tower:** ${meta.entry_crystals_tower}
**Ganon Vulnerable:** ${meta.entry_crystals_ganon}`,
      true);

      embed.addField('Gameplay',
`**World State:** ${meta.mode}
**Entrance Shuffle:** ${meta.shuffle || "None"}
**Boss Shuffle:** ${meta["enemizer.boss_shuffle"]}
**Enemy Shuffle:** ${meta["enemizer.enemy_shuffle"]}
**Hints:** ${meta.hints}`,
      true);

      embed.addField('Difficulty',
`**Swords:** ${meta.weapons}
**Item Pool:** ${meta.item_pool}
**Item Functionality:** ${meta.item_functionality}
**Enemy Damage:** ${meta["enemizer.enemy_damage"]}
**Enemy Health:** ${meta["enemizer.enemy_health"]}`,
      true);

      if (itemCode) {
        itemCode = itemCode[RANDO_CODE_KEY].map(n=>RANDO_ICON_MAP[n]).join(", ")
        embed.addField('File Select Code', itemCode, false);
      }
      // embed.addField('Permalink', permalinkUrl, false);

    // console.dir(embed);
    return embed;
}

async function postRandoDaily(hash, channel, guild) {
  guild = guild || ougi.guilds.get(ALDONIRO_ID),
  channel = channel || guild.channels.get(CHEEKY_RANDOS_ID);

  let embed = await makeRandoDailyEmbed(hash);
  return channel.send('', embed);
}

async function checkRandoDaily(retry=true) {
  let newHash = await fetchRandoDailyHash();

  if (_.isError(newHash)) {
    // Error fetching; server problem?
    return ougi.setTimeout(checkRandoDaily, 90000, true);
  }
  else if (newHash !== lastRandoDailyHash) {
    // Got a new hash! Post about the seed.
    console.log(`New daily! ${newHash}`)
    lastRandoDailyHash = newHash;
    return postRandoDaily(newHash);
  }
  else if (retry) {
    // No error, same hash. Not generated yet? Try once more.
    return ougi.setTimeout(checkRandoDaily, 90000, false);
  }
}

// At one minute past midnight UTC, check for a new ALTTPR Daily Challenge
let randoSchedule = schedule.scheduleJob(
    { rule: "1    0    *    *    *", tz: "UTC" },
    checkRandoDaily
);


// log in
ougi.login(DISCORD_TOKEN);
