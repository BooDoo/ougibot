#!/usr/bin/env node

// Replace Math.random() with MT-based substitute:
const MersenneTwister = require('mersenne-twister');
const rng = new MersenneTwister();
Math.random = rng.random.bind(rng);

// Then go ahead and set up rest as normal
const path = require('path');
const _ = require('lodash');
const rp = require('request-promise');
const Discord = require('discord.js');
const ougi = new Discord.Client();
const creds = require('./credentials');
const token = creds.discord.token;

const SAFEBOORU_ROOT = 'https://safebooru.org';
const SAUCENAO_ROOT = 'http://saucenao.com';
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
      // footer: {
      //   text:"Safebooru"
      // },
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
      title: "Check SauceNAO",
      description: null,
      url: null
    }
  }
};

let commandProcessors = {
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
          opts: {embed: {color: COLORS.bad, description: `${mentionString(supplicant)} Nothing found for ${tags.join(' ')}`} }
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
      opts.embed.description += ` for\n${tags.join(' ')}`;
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
        srcUrl, encodedUrl;

    if (message.content.match(urlsTest)) {
      srcUrl = message.content.match(urlsTest)[0];
    }
    else if (message.embeds.length) {
      console.dir(message.embeds);
      let imgEmbeds = _.filter(message.embeds, {type: 'image'});
      if (imgEmbeds) {
        srcUrl = imgEmbeds[0].url;
      }
    }
    else if (message.attachments.array().length) {
      console.dir(message.attachments.array());
      srcUrl = message.attachments.map(attach=>attach.url)[0];
    }

    if (srcUrl) {
      console.log(`SauceNAO for ${srcUrl}`);
      encodedUrl = encodeURIComponent(srcUrl);
      opts.embed.color = COLORS.ok;
      opts.embed.title = "Check SauceNAO";
      opts.embed.url = `${SAUCENAO_ROOT}/search.php?db=999&url=${encodedUrl}`;
      opts.embed.description = `${mentionString(supplicant)} Good luck!`;
    }
    else {
      opts.embed.color = COLORS.bad;
      opts.embed.title = '';
      opts.embed.description = `${mentionString(supplicant)} Not sure what you want source for…`
    }

    return Promise.resolve({content: content, opts: opts});
  }
};
// set cmdProc aliases:
commandProcessors['~s'] = commandProcessors['~sb'] = commandProcessors['~safe'] = commandProcessors['~safebooru'];
commandProcessors['~source'] = commandProcessors['~sauce'] = commandProcessors['~src'] = commandProcessors['~saucenao'];

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

ougi.on('ready', () => {
  console.log('Ougibot is ready!');
});

// create an event listener for messages
ougi.on('message', message => {
  let command = parseCommand(message);

  if (command.proc) {
    let toReply = command.proc(command.message, command.supplicant, command.channel);
    toReply.then(response => {
      console.dir(response.opts);
      return command.channel.sendMessage(response.content, response.opts);
    }).catch(err => {console.error(err)})
  }
});

// log in
ougi.login(token);
