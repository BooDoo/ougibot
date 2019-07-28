// safebooru module

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

function tagReturn(tags) {
  let toEscape = /([\*\_])/g;
  return `${tags.join(' ').replace(toEscape,"\\$1")}`;
}

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
  }
};

let commandProcessors = {
  "~safebooru": async function(message, supplicant, channel) {
    let payload = message.content.toLowerCase().split(' ').splice(1).join(' '),
        tags = parseTags(payload);

    let res = await rp({
      uri: `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&limit=100&tags=${tags.join('+')}`,
      json: true
    });

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
    
    return {content, opts};
  }
};

//set aliases
commandProcessors['~s'] = commandProcessors['~sb'] = commandProcessors['~safe'] = commandProcessors['~safebooru'];

module.exports = Object.freeze({
  parseTags, joinInParens, tagReturn, embedOpts, commandProcessors
});