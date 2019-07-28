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
const cheerio = require('cheerio');
const schedule = require('node-schedule');

const creds = require('./credentials');
require('./constants');
const ougi = new Discord.Client();
const {mentionString, parseCommand} = require('./lib/util');
const rot13 = require('./lib/rot13');
const twitterImageCount = require('./lib/imagecount');
const {hasAdmin, notAdmin, isAssignable, formatRoles,
       findRole, checkMemberByName, getGuildMember, adjustRole} = require('./lib/roles');

const {parseTags, joinInParens, tagReturn} = require('./lib/safebooru');

const {lastRandoDailyHash, fetchRandoDailyHash, fetchRandoDailyJSON, makeRandoDailyEmbed,
       postRandoDaily, checkRandoDaily, randoSchedule,} = require('./lib/alttpr');

const {} = require('./lib/saucenao');


// Collect default embed object values where available 
let embedOpts = ['safebooru', 'saucenao'].reduce(
  (res, lib)=>_.assign(res, require(`./lib/${lib}`).commandProcessors),
  {}
);

let commandProcessors = ['safebooru', 'alttpr', 'roles', 'saucenao'].reduce(
  (res, lib)=>_.assign(res, require(`./lib/${lib}`).commandProcessors),
  {}
);

ougi.on('ready', () => {
  console.log('Ougibot is ready!');
});

// create an event listener for messages
ougi.on('message', message => {
  // General command/utility interpretation for non-DM
  let command = parseCommand(message, commandProcessors);
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

// log in
ougi.login(DISCORD_TOKEN);
