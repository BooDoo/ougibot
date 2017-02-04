#!/usr/bin/env node

const path = require('path');
const _ = require('lodash');
const rp = require('request-promise');
const Discord = require('discord.js');
const ougi = new Discord.Client();
const creds = require('./credentials');
const token = creds.discord.token;

const SAFEBOORU_ROOT = 'https://safebooru.org';
const COLORS = {
  "ok": 0x71cd40,
  "bad": 0xb00d00
};

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
      footer: {
        text:"Safebooru"
      },
      url: null
    }
  }
};

let commandProcessors = {
  "~safebooru": function(payload) {
    let tags = parseTags(payload);

    return rp({
      uri: `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${tags.join('+')}`,
      json: true
    }).then(res => {

      if (!res) {
        return {
          status: `Nothing found for ${tags.join(' ')}`,
          opts: {}
        };
      }

      let status = '',
          opts = _.cloneDeep(embedOpts['~safebooru']),
          resultCount = res ? res.length : 0,
          img = _.sample(res),
          directory = img.directory,
          base = img.image,
          imgUrl = `${SAFEBOORU_ROOT}/images/${directory}/${base}`
          sampleUrl = `${SAFEBOORU_ROOT}/samples/${directory}/sample_${base}`
          hasSample = img.sample;

      // console.log(`let's work with: ${imgUrl}`);

      if (resultCount === 0) {
        opts.embed.color = COLORS.bad;
        status = `Nothing found for ${tags.join(' ')}`;
      }
      else {
        opts.embed.color = COLORS.ok;
        status = `1 of ${resultCount}`;
        status += (resultCount === 100) ? '+' : '';
        status += ` for\n${tags.join(' ')}`;
        if (hasSample) {
          status += "\n(using resized sample)";
          opts.embed.url = imgUrl;
          opts.embed.image.url = sampleUrl;
        }
        else {
          opts.embed.url = imgUrl;
          opts.embed.image.url = imgUrl;
        }
      }

      // console.log(status);
      console.dir(opts);
      return {status: status, opts: opts};
    });
  }
};
// set cmdProc aliases:
commandProcessors['~s'] = commandProcessors['~sb'] = commandProcessors['~safe'] = commandProcessors['~safebooru'];

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
    tags = tagString.split(/ ?, ?/).map(tag => tag.replace(/ +/, '_'));
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
  if (msg.content[0] !== '~') { return {proc: null, payload: msg} }

  // let's ignore case, for now
  msg.content = msg.content.toLowerCase();

  // find processor function and store additional payload of the message
  let proc = commandProcessors[msg.content.split(' ')[0]],
      payload = msg.content.split(' ').splice(1).join(' ');

  return {proc: proc, payload: payload};
}

ougi.on('ready', () => {
  console.log('Ougibot is ready!');
});

// create an event listener for messages
ougi.on('message', message => {
  let command = parseCommand(message);

  if (command.proc) {
    let toReply = command.proc(command.payload);
    toReply.then(response => message.reply(response.status, response.opts)).catch(err => {console.error(err)})
  }
});

// log in
ougi.login(token);
