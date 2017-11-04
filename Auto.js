const { AUTO_TOKEN, AUTO_COMMAND_PREFIX, OWNERS, INVITE } = process.env;
const path = require('path');
const { CommandoClient } = require('discord.js-commando');
const client = new CommandoClient({
	commandPrefix: AUTO_COMMAND_PREFIX,
	owner: OWNERS.split(','),
	invite: INVITE,
	disableEveryone: true,
	unknownCommandResponse: false,
	disabledEvents: ['TYPING_START']
});
const emoji = require('./assets/json/emoji');
const codeblock = /```(?:(js|javascript)\n)?\s*([^]+?)\s*```/i;
const runLint = (msg, updated = false) => {
	if (msg.channel.type !== 'text' || msg.author.bot) return;
	if (msg.channel.topic && msg.channel.topic.includes('<auto:block-all>')) return;
	if (!codeblock.test(msg.content) || msg.channel.topic.includes('<auto:no-scan>')) return;
	if (!msg.channel.permissionsFor(msg.client.user).has(['ADD_REACTIONS', 'READ_MESSAGE_HISTORY'])) return;
	const parsed = codeblock.exec(msg.content);
	const code = {
		code: parsed[2],
		lang: parsed[1]
	};
	msg.client.registry.resolveCommand('lint:default').run(msg, { code }, true, updated);
};

client.registry
	.registerDefaultTypes()
	.registerTypesIn(path.join(__dirname, 'types'))
	.registerGroups([
		['util', 'Utility'],
		['lint', 'Lint'],
		['other', 'Other']
	])
	.registerDefaultCommands({
		help: false,
		ping: false,
		prefix: false,
		commandState: false
	})
	.registerCommandsIn(path.join(__dirname, 'commands'));

client.on('message', runLint);

client.on('messageUpdate', (oldMsg, msg) => runLint(msg, true));

client.on('messageReactionAdd', (reaction, user) => {
	const msg = reaction.message;
	if (msg.author.id !== user.id) return;
	if (reaction.emoji.id !== emoji.failure.id) return;
	if (!msg.reactions.has(emoji.failure.id)) return;
	if (!msg.reactions.get(emoji.failure.id).users.has(client.user.id)) return;
	if (!codeblock.test(msg.content)) return;
	const parsed = codeblock.exec(msg.content);
	const code = {
		code: parsed[2],
		lang: parsed[1]
	};
	client.registry.resolveCommand('lint:default').run(msg, { code });
});

client.on('ready', () => {
	console.log(`[READY] Logged in as ${client.user.tag}! (${client.user.id})`);
	client.user.setActivity(`${AUTO_COMMAND_PREFIX} lint to scan!`);
});

client.on('disconnect', event => {
	console.error(`[DISCONNECT] Disconnected with code ${event.code}.`);
	process.exit(0);
});

client.on('error', err => console.error('[ERROR]', err));

client.on('warn', err => console.warn('[WARNING]', err));

client.dispatcher.addInhibitor(msg => {
	if (msg.channel.type !== 'text' || !msg.channel.topic) return false;
	if (msg.channel.topic.includes('<blocked>')) return 'topic blocked';
	return false;
});

client.login(AUTO_TOKEN);

process.on('unhandledRejection', err => {
	console.error('[FATAL] Unhandled Promise Rejection.', err);
	process.exit(1);
});
