// twitter image counter
// ty @jhayley

async function twitterImageCount(message, match) {
  // There could be more than one match! Discord embeds all of them
  // Unfortunately we can't use more than one of the same reaction
  // So just choose the last one i guess :(
  let link = match[match.length - 1]
  // console.log(`Going to ${link}`)
  let res = await rp({
    uri: link,
    json: false
  })

  // We look for both og:image and /media/ because videos also have an og:image
  // Also to make this more annoying for people (joel) to try and cheese this
  let picMatch = res.match(/meta\s+property="og:image"\s+content="https:\/\/[a-z\.]+\/media/gi)

  // Up to four images, if we get more do nothing
  if (picMatch !== null && picMatch.length <= 4) {
    let numbers = ['1⃣', '2⃣', '3⃣', '4⃣'];
    // React in order
    return message.react(numbers[picMatch.length - 1]).then(react => {
      react.message.react('🖼');
    });
  }
}

module.exports = twitterImageCount;