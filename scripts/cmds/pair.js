const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "pair",
    author: "Ew'r Saim X Ariyan and Charles MK",
    category: "love",
    version: "5.0"
  },

  onStart: async function ({ api, event, usersData }) {
    const { threadID, messageID, senderID } = event;
    const cachePath = path.join(__dirname, "cache", `pair_${senderID}.png`);

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const participantIDs = threadInfo.participantIDs.filter(id => id !== senderID && id !== api.getCurrentUserID());

      if (participantIDs.length === 0) return api.sendMessage("❌ Need more members!", threadID, messageID);

      const allUsers = await api.getUserInfo([...participantIDs, senderID]);
      const myGender = allUsers[senderID].gender;

      const opposites = participantIDs.filter(id => (myGender === 2 && allUsers[id].gender === 1) || (myGender === 1 && allUsers[id].gender === 2));
      const matchID = opposites.length > 0 ? opposites[Math.floor(Math.random() * opposites.length)] : participantIDs[Math.floor(Math.random() * participantIDs.length)];

      const canvas = createCanvas(800, 400);
      const ctx = canvas.getContext("2d");

      // 1. Load Background
      const background = await loadImage("https://i.postimg.cc/pdv5dFVX/611905695-855684437229208-8377464727643815456-n.png");
      ctx.drawImage(background, 0, 0, 800, 400);

      // 2. Load Avatars
      const avt1 = await loadImage(`https://graph.facebook.com/${senderID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);
      const avt2 = await loadImage(`https://graph.facebook.com/${matchID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`);

      const radius = 88;

      // --- UPPER FRAME (Your PFP) ---
      const upperCenterX = 471;
      const upperCenterY = 124;

      ctx.save();
      ctx.beginPath();
      ctx.arc(upperCenterX, upperCenterY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avt1, upperCenterX - radius, upperCenterY - radius, radius * 2, radius * 2);
      ctx.restore();

      // --- LOWER FRAME (Match PFP) ---
      const lowerCenterX = 673;
      const lowerCenterY = 276;

      ctx.save();
      ctx.beginPath();
      ctx.arc(lowerCenterX, lowerCenterY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avt2, lowerCenterX - radius, lowerCenterY - radius, radius * 2, radius * 2);
      ctx.restore();

      if (!fs.existsSync(path.join(__dirname, "cache"))) fs.mkdirSync(path.join(__dirname, "cache"));
      fs.writeFileSync(cachePath, canvas.toBuffer());

      // Generate match percentage
      const matchPercentage = Math.floor(Math.random() * 30) + 70; // Random between 70-99%

      // Array of romantic messages
      const messages = [
        `💕 Perfect Match Found! 💕\n━━━━━━━━━━━━━━━━━\n👤 ${allUsers[senderID].name}\n💖 ${matchPercentage}% Compatible 💖\n👤 ${allUsers[matchID].name}\n━━━━━━━━━━━━━━━━━\n✨ Love is in the air! ✨`,

        `💘 Cupid's Arrow Has Struck! 💘\n━━━━━━━━━━━━━━━━━\n${allUsers[senderID].name} 💞 ${allUsers[matchID].name}\n\n💯 Match Score: ${matchPercentage}%\n━━━━━━━━━━━━━━━━━\n🌹 A beautiful connection! 🌹`,

        `💓 Soulmate Alert! 💓\n━━━━━━━━━━━━━━━━━\n${allUsers[senderID].name}\n❤️ & ❤️\n${allUsers[matchID].name}\n\n✨ Compatibility: ${matchPercentage}% ✨\n━━━━━━━━━━━━━━━━━\nDestiny has spoken! 💫`,

        `🌸 Love Blossoms! 🌸\n━━━━━━━━━━━━━━━━━\n💝 ${allUsers[senderID].name}\n💕 perfectly matched with\n💝 ${allUsers[matchID].name}\n\n🎯 ${matchPercentage}% Love Score!\n━━━━━━━━━━━━━━━━━`,
      ];

      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      return api.sendMessage({
        body: randomMessage,
        attachment: fs.createReadStream(cachePath)
      }, threadID, () => {
        if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
      }, messageID);

    } catch (err) {
      console.error(err);
      return api.sendMessage("❌ Error during pairing. Ensure 'canvas' is installed.", threadID, messageID);
    }
  }
};
