// A Link to the Past Randomizer module

// With thanks to @tcprescott for /pyz3r and /alttpr-discord-bot repos
// for guidance on endpoints, etc. All errors are my own.

var lastRandoDailyHash = '';

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
      embed.addField('Logic', meta.logic, true);
      embed.addField('Difficulty', meta.difficulty, true);
      embed.addField('Variation', meta.variation, true);
      embed.addField('State', meta.mode, true);
      embed.addField('Swords', meta.weapons, true);
      embed.addField('Goal', meta.goal, true);
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

let commandProcessors = {
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
}

// set aliases
commandProcessors['~daily'] = commandProcessors['~alttpr'] = commandProcessors['~seed'] = commandProcessors['~rando'];

module.exports = {
  lastRandoDailyHash, fetchRandoDailyHash, fetchRandoDailyJSON, makeRandoDailyEmbed, postRandoDaily, 
  checkRandoDaily, randoSchedule, commandProcessors
}