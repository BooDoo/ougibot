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

const creds = require('./credentials');
const DISCORD_TOKEN = creds.discord.token;
const SAUCENAO_KEY = creds.saucenao.key;
const SAFEBOORU_ROOT = 'https://safebooru.org';
const SAUCENAO_ROOT = 'https://saucenao.com';
const PIXIV_ROOT = 'https://pixiv.net';
const OVERBUFF_ROOT = 'https://overbuff.com';

const COLORS = {
  "ok": 0x71cd40,
  "bad": 0xb00d00
};

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
  },
  "~overbuff": {
    embed: {
      color: null,
      provider: {
        name: "Overbuff",
        url: OVERBUFF_ROOT
      },
      image: {
        url: null
      },
      title: "See on Overbuff",
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

  "~overbuff": function(message, supplicant, channel) {
    let payload = message.content.split(' ').splice(1),
        [player, ...hero] = payload,
        userTag = parseBattletag(player, supplicant.id),
        overbuffTarget = `${OVERBUFF_ROOT}/players/pc/${userTag}`;

    hero = hero.join(' ').replace(/[^A-z0-9]/g,'').toLowerCase();

    return rp(overbuffTarget).
    then(res =>{

    let content = '',
        opts = _.cloneDeep(embedOpts['~overbuff']),
        $ = cheerio.load(res),
        context = hero ? `div.theme-hero-${hero}` : null,
        winSelector = `span.color-stat-win`,
        winLoss = $(winSelector, context).first().parent().text(),
        [wins, losses] = winLoss.split('-').map(_.parseInt),
        winRate = ((wins/(wins+losses))*100).toString().split('').splice(0,5).join('') + '%',
        imgUrl = $('img', context).first().attr('src');

        // Did we get fully qualified, or need to work with relative URL?
        if (imgUrl[0] == '/') {
          imgUrl = `${OVERBUFF_ROOT}${imgUrl}`;
        }

        opts.embed.color = COLORS.ok;
        opts.embed.title = "View on Overbuff";
        opts.embed.description = `${mentionString(supplicant)}`;
        opts.embed.description += ` ${winLoss} (${winRate}) as ${hero ? hero : 'all heroes'}`;
        opts.embed.description += `\nfor ${userTag}`;
        opts.embed.url = hero ? `${overbuffTarget}/heroes/${hero}` : overbuffTarget;
        opts.embed.image.url = imgUrl;

        return {content: content, opts: opts};
    });
  }
};
// set cmdProc aliases:
commandProcessors['~s'] = commandProcessors['~sb'] = commandProcessors['~safe'] = commandProcessors['~safebooru'];
commandProcessors['~source'] = commandProcessors['~sauce'] = commandProcessors['~src'] = commandProcessors['~saucenao'];
commandProcessors['~winloss'] = commandProcessors['~ratio'] = commandProcessors['~wl'] = commandProcessors['~overbuff'];
commandProcessors['~r'] = commandProcessors['~roles'] = commandProcessors['~role'];

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

function parseBattletag(player, supplicantId) {
  let user, battleTag;

  if (~player.indexOf('#')) {
    battleTag = player.replace('#', '-');
  } else {
    player = player.toLowerCase();
    user = userIDs[player] ? userIDs[player] : _.find(userIDs, {discord: supplicantId});
    battleTag = user.battlenet;
  }

  return battleTag
}

function rot13(input) {
  // thanks, "ESL": http://stackoverflow.com/a/41435838/1414079
  return input.
    replace(/[a-z]/gi,c=>String.fromCharCode((c=c.charCodeAt())+((c&95)>77?-13:13))).
    replace(/\d/gi,c=>(c>4?-5:5)+c*1);
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

// log in
ougi.login(DISCORD_TOKEN);
