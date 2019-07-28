// utility functions

function mentionString(user) {
  return `<@!${user.id}>`;
}


function parseCommand(message, commandProcessors) {
  // all commands start with ~
  if (message.content[0] !== '~') { return {proc: null, message} }
  // let's ignore case, for now
  // find processor function
  let proc = commandProcessors[msg.content.toLowerCase().split(' ')[0]],
      supplicant = message.author,
      channel = message.channel;

  return {proc, message, supplicant, channel};
}

module.exports = Object.freeze({
	mentionString, parseCommand
});