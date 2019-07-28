// our source/saucenao module
let embedOpts = {
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
}

let commandProcessors = {
  "~saucenao": async function(message, supplicant, channel) {
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
      let sauceRes = await rp({
        uri: `${SAUCENAO_ROOT}/search.php?api_key=${SAUCENAO_KEY}&db=999&output_type=2&numres=2&url=${encodedUrl}`,
        json: true
      });

      if (sauceRes.results.length && sauceRes.results[0].data.pixiv_id) {
          matches = sauceRes.results;
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
    }
    else {
      opts.embed.color = COLORS.bad;
      opts.embed.title = '';
      opts.embed.description = `${mentionString(supplicant)} Not sure what you want source for…`
    }

    return {content, opts};
  }
}

// set aliases
commandProcessors['~source'] = commandProcessors['~sauce'] = commandProcessors['~src'] = commandProcessors['~saucenao'];

module.exports = Object.freeze({
  embedOpts, commandProcessors
});