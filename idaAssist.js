var Slack = require('slack-client');
var request = require('request');
var tokens = require('./tokens');


// EXPORT: motd
var motd = function (slack) {

  var channels = Object.keys(slack.channels)
                .map(function (k) { return slack.channels[k]; })
                .filter(function (c) { return c.is_member; })
                .map(function (c) { return c.name; });

  var groups = Object.keys(slack.groups)
                .map(function (k) { return slack.groups[k]; })
                .filter(function (g) { return g.is_open && !g.is_archived; })
                .map(function (g) { return g.name; });

  console.log(slack.self.name + ' joining ' + slack.team.name);

  console.log((channels.length > 0)
              ? 'Channels: ' + channels.join(', ')
              : 'You are not in any channels.');

  console.log((groups.length > 0)
              ? 'Groups: ' + groups.join(', ')
              : 'You are not in any groups.');
};


// EXPORT: handleMessage
var handleMessage = function(slack, inputMsg) {

  var channel = slack.getChannelGroupOrDMByID(inputMsg.channel),
      user = slack.getUserByID(inputMsg.user),
      command = '';

  if (inputMsg.type === 'message' && isDirect(slack.self.id, inputMsg.text)) {

    command = inputMsg.text.split((inputMsg.text.indexOf(':') > -1) ? ': ' : '> ').pop();

    switch(command) {

      case 'help':
        sendHelpReply(user, channel); break;

      case 'rots':
        sendRotsReply(user, channel); break;

      case 'rain':
        sendRainReply(user, channel); break;

      default:
        channel.send(makeMention(user.id) + ' ' + 'sorry, I don\'t know that command');
    }
  }
};


// EXPORT: makeMention
var makeMention = function(userId) {
  return '<@' + userId + '>';
};


// EXPORT: isDirect
var isDirect = function(userId, messageText) {
  var userTag = makeMention(userId);
  return messageText &&
  messageText.length >= userTag.length &&
  messageText.substr(0, userTag.length) === userTag;
};


// EXPORT: getOnlineHumansForChannel
var getOnlineHumansForChannel = function(channel) {
  if (!channel) return [];

  return (channel.members || [])
  .map(function(id) { return slack.users[id]; })
  .filter(function(u) { return !!u && !u.is_bot && u.presence === 'active'; });
};


// EXPORT: syncApiCalls
var syncApiCalls = function(urls, channel, user, results) {

  var url = urls.pop();

  console.log('calling ' + url);
  request(url, function(error, response, champion) {

    if (!error && response.statusCode == 200) {
      console.log('parsing ' + JSON.stringify(champion));
      champion = JSON.parse(champion);
      var blurb = '';
      blurb += '*' + champion.name + ', ' + champion.title + ' [' + champion.tags.join(', ') + ']*\r\n';
      blurb += 'http://gameinfo.na.leagueoflegends.com/en/game-info/champions/' + champion.name.replace(/'/g, '').toLowerCase() + '\r\n';
      blurb += '\r\n' + champion.blurb + '\r\n\r\n';
      blurb += 'attack:\t' + champion.info.attack;
      blurb += '\tdefense:\t' + champion.info.defense;
      blurb += '\tmagic:\t' + champion.info.magic;
      blurb += '\tdifficulty:\t' + champion.info.difficulty;
      blurb += '\r\n\r\n';
      results.push(blurb);
    } else {
      console.log(error);
    }

    if(urls.length){
      syncApiCalls(urls, channel, user, results);
    } else {
      channel.send(makeMention(user.id) + ', here\'s the rotation list you requested:\r\n\r\n' + results.join('\r\n'));
    };
  });
};


// INTERNAL: sendHelpReply
var sendHelpReply = function(user, channel) {
  channel.send(makeMention(user.id) + ' fine, I\'ll help you this one time. Here\'s what I know:'
               + '\nrots - fetch a summary list of LoL rotations'
               + '\nrain - see if Gilbert should have his windows closed today');
};


// INTERNAL: sendRotsReply
var sendRotsReply = function(user, channel) {

  var urls = [];

  channel.send(makeMention(user.id) + ' ' + 'Ok, one second while I look that up...');

  request('https://na.api.pvp.net/api/lol/na/v1.2/champion?freeToPlay=true&api_key=' + tokens.key, function(error, response, payload) {

    if (!error && response.statusCode == 200) {

      var json = JSON.parse(payload),
      champList = json.champions;

      for (var i = 0; i < champList.length; i++) {
        urls.push('https://global.api.pvp.net/api/lol/static-data/na/v1.2/champion/' + champList[i].id + '?champData=altimages,blurb,image,info,stats,tags&api_key=' + tokens.key);
      }
      syncApiCalls(urls, channel, user, []);

    } else {
      channel.send(makeMention(user.id) + ' ' + 'uh oh, something went wrong hitting the API for list');
    }
  });
};


// INTERNAL:
var sendRainReply = function(user, channel) {

};


// INTERNAL:

// *********** EXPORT LIST ***********
module.exports = {
  Slack: Slack,
  request: request,
  tokens: tokens,
  motd: motd,
  handleMessage: handleMessage,
  makeMention: makeMention,
  isDirect: isDirect,
  getOnlineHumansForChannel: getOnlineHumansForChannel,
  syncApiCalls: syncApiCalls
}
// *********** END EXPORTS ***********
