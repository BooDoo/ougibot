// roles module

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
  "~role": async function(message, supplicant, channel) {
    let payload = message.content.toLowerCase().split(' ').splice(1);
    let defaultAction = channel.type == "dm" ? 'mine' : 'list';
    let action = payload.shift() || defaultAction;
    let role = payload.join(' ');
    let supplicantMember = message.member || getGuildMember(supplicant.id);

    let guild = supplicantMember.guild;
    let ougiPosition = guild.roles.find('name', 'ougibot').position;

    let actions = {
      "list": (member) => {
        return {
          content: `Available roles: ${formatRoles(member.guild.roles.filter(isAssignable))}`
        };
      },
      "mine": (member) => {
        return {
          content: `Your roles: ${formatRoles(member.roles.filter(isAssignable))}`
        };
      },
      "add": (member, role) => {
        return adjustRole("add", member, role);
      },
      "remove": (member, role) => {
        return adjustRole("remove", member, role);
      }
    }

    return actions[action](supplicantMember, role);
  }
};

// set aliases
commandProcessors['~r'] = commandProcessors['~roles'] = commandProcessors['~role'];

module.exports = Object.freeze({
  hasAdmin, notAdmin, isAssignable, formatRoles, findRole,
  checkMemberByName, getGuildMember, adjustRole, commandProcessors
});

