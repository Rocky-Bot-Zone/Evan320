// ============================================================
//  bump.js  |  Messenger GoatBot Command
//  Reply to any text message with "bump" and the bot re-sends
//  that exact text as a reply to the original message.
//  Nothing else is sent.
//  Author: Rocky  (author lock enabled)
// ============================================================

const _a = [82, 111, 99, 107, 121]; // "Rocky"
const _AUTHOR = String.fromCharCode(..._a);

function isAuthorValid() {
	try {
		return module.exports.config.author === _AUTHOR;
	} catch (e) {
		return false;
	}
}

async function runBump({ api, event, message }) {
	// Author lock: if author is changed, the command does nothing
	if (!isAuthorValid()) return;

	// Must be a reply to another message
	const replied = event.messageReply;
	if (!replied) return;

	// Only text messages are bumped
	const text = replied.body;
	if (typeof text !== "string" || !text.trim()) return;

	// Bump it the same way users do: reply to the ORIGINAL message
	// with ONLY its text, no extra words
	// Keep the original @mentions as real tags, so the bump looks identical
	const mentions = [];
	const rawMentions = replied.mentions || {};
	let searchFrom = {};
	for (const id of Object.keys(rawMentions)) {
		const tag = String(rawMentions[id]);
		const from = searchFrom[tag] || 0;
		const idx = text.indexOf(tag, from);
		if (idx === -1) continue;
		searchFrom[tag] = idx + tag.length;
		mentions.push({ id, tag, fromIndex: idx });
	}

	const payload = mentions.length ? { body: text, mentions } : text;
	return api.sendMessage(payload, event.threadID, () => {}, replied.messageID);
}

module.exports = {
	config: {
		name: "bump",
		aliases: [],
		version: "1.0.0",
		author: "Rocky",
		countDown: 2,
		role: 0,
		description: {
			en: "Reply to a text with 'bump' to re-send that text"
		},
		category: "utility",
		guide: {
			en: "Reply to any text message and type: bump"
		}
	},

	// Works with prefix: reply to a message and type  {prefix}bump
	onStart: async function ({ api, event, message }) {
		return runBump({ api, event, message });
	},

	// Works without prefix: reply to a message and type  bump
	onChat: async function ({ api, event, message }) {
		if (!isAuthorValid()) return;
		const body = (event.body || "").trim().toLowerCase();
		if (body !== "bump") return;
		if (!event.messageReply) return;
		return runBump({ api, event, message });
	}
};
