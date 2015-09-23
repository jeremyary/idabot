// champio detail
// item detail
// spell detail
// show my last matches
// featured games right now
// search by champio attribs


var assist = require('./idaAssist');

var slack = new assist.Slack(assist.tokens.token, true, true);

slack.on('open', assist.motd());
slack.on('message', assist.handleMessage(message));

slack.login();
