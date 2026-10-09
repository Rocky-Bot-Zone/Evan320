const axios = require("axios");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/exe/main/baseApiUrl.json");
        return base.data.mahmud69;
};

// Replace "MahMUD" (any font style) with "Rocky" in the caption
const replaceAdminName = (text) => {
        return String(text).replace(/\S+/g, (word) => {
                const plain = word.normalize("NFKC").toLowerCase();
                if (!plain.includes("mahmud")) return word;
                // styled (bold unicode) word -> styled Rocky, normal word -> normal Rocky
                const isStyled = word !== word.normalize("NFKC");
                return isStyled ? "𝐑𝐨𝐜𝐤𝐲" : word.replace(/mahmud/gi, "Rocky");
        });
};

module.exports = {
        config: {
                name: "alldl",
                aliases: ["download", "dl"],
                version: "3.7",
                author: "MahMUD",
                countDown: 10,
                role: 0,
                description: {
                        en: "Download videos from any social media",
                        vi: "Tải xuống video từ bất kỳ mạng xã hội nào"
                },
                category: "media",
                guide: {
                        en: '   {pn} <link>: Provide the video link'
                                + '\n   Or reply to a link with {pn}'
                                + '\n   {pn} list: Show all supported platforms'
                                + '\n\nSupported Platforms:\n• TikTok\n• YouTube / Shorts\n• Facebook / FB Watch\n• Instagram / Reels\n• Twitter (X)\n• Threads\n• Snapchat\n• Pinterest\n• Spotify\n• SoundCloud\n• Reddit\n• LinkedIn\n• CapCut\n• Dailymotion\n• Kwai / Kuaishou\n• Douyin\n• Bluesky\n• Tumblr\n• Terabox\n• Likee\n• Apple Music\n• SnackVideo',
                        vi: '   {pn} <link>: Cung cấp liên kết video'
                                + '\n   Hoặc trả lời một liên kết bằng {pn}'
                                + '\n   {pn} list: Hiển thị tất cả nền tảng được hỗ trợ'
                                + '\n\nSupported Platforms:\n• TikTok\n• YouTube / Shorts\n• Facebook / FB Watch\n• Instagram / Reels\n• Twitter (X)\n• Threads\n• Snapchat\n• Pinterest\n• Spotify\n• SoundCloud\n• Reddit\n• LinkedIn\n• CapCut\n• Dailymotion\n• Kwai / Kuaishou\n• Douyin\n• Bluesky\n• Tumblr\n• Terabox\n• Likee\n• Apple Music\n• SnackVideo'
                }
        },

        langs: {
                en: {
                        noLink: "× Baby, please provide a valid video link or reply to one!",
                        error: "× Download error: %1. Contact MahMUD for help.\n•WhatsApp: 01836298139"
                },
                vi: {
                        noLink: "× Bé ơi, vui lòng cung cấp liên kết video hợp lệ hoặc trả lời một liên kết!",
                        error: "× Lỗi tải xuống: %1. Liên hệ MahMUD để được giúp đỡ.\n•WhatsApp: 01836298139"
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                if (args[0] && args[0].toLowerCase() === "list") return message.reply((await axios.get(`${await baseApiUrl()}/api/download/list`)).data);

                const mahmud = args[0] || event.messageReply?.body;

                if (!mahmud || !mahmud.startsWith("http")) {
                        return message.reply(getLang("noLink"));
                }

                if (!(
                        mahmud.includes("tiktok.com") ||
                        mahmud.includes("youtube.com") || 
                        mahmud.includes("youtu.be") ||
                        mahmud.includes("twitter.com") || 
                        mahmud.includes("x.com") ||
                        mahmud.includes("facebook.com") || 
                        mahmud.includes("fb.com") ||
                        mahmud.includes("fb.watch") ||
                        mahmud.includes("instagram.com") ||
                        mahmud.includes("instagr.am") ||
                        mahmud.includes("tumblr.com") ||
                        mahmud.includes("threads.net") ||
                        mahmud.includes("threads.com") ||
                        mahmud.includes("spotify.com") ||
                        mahmud.includes("spotify.link") ||
                        mahmud.includes("soundcloud.com") ||
                        mahmud.includes("snapchat.com") ||
                        mahmud.includes("snap.com") ||
                        mahmud.includes("reddit.com") ||
                        mahmud.includes("redd.it") ||
                        mahmud.includes("pinterest.com") || 
                        mahmud.includes("pin.it") ||
                        mahmud.includes("linkedin.com") ||
                        mahmud.includes("lnkd.in") ||
                        mahmud.includes("kuaishou.com") || 
                        mahmud.includes("kwai.com") ||
                        mahmud.includes("douyin.com") ||
                        mahmud.includes("dailymotion.com") || 
                        mahmud.includes("dai.ly") ||
                        mahmud.includes("capcut.com") ||
                        mahmud.includes("capcut.net") ||
                        mahmud.includes("bsky.app") ||
                        mahmud.includes("bsky.social") ||
                        mahmud.includes("terabox.com") ||
                        mahmud.includes("likee.video") ||
                        mahmud.includes("music.apple.com") ||
                        mahmud.includes("snackvideo.com") ||
                        mahmud.includes("sck.io")
                )) {
                        return message.reply(getLang("noLink"));
                }

                try {
                        api.setMessageReaction("🐤", event.messageID, () => {}, true);
                        
                        const response = await axios.get(`${await baseApiUrl()}/api/download?url=${encodeURIComponent(mahmud)}`);
                        if (!response.data || !response.data.result) {
                                throw new Error("Failed to fetch video URL from API");
                        }

                        const videoUrl = response.data.result;
                        const caption = replaceAdminName(response.data.cp || "Downloaded Video");

                        const videoStream = await global.utils.getStreamFromURL(videoUrl, "video.mp4");

                        api.setMessageReaction("🪽", event.messageID, () => {}, true);
                        return message.reply({
                                body: caption,
                                attachment: videoStream
                        });

                } catch (err) {
                        console.error("Error in alldl command:", err);
                        api.setMessageReaction("❎", event.messageID, () => {}, true);
                        return message.reply(getLang("error", err.message));
                }
        }
};
