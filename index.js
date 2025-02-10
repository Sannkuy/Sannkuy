require('./settings');
const fs = require('fs');
const pino = require('pino');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const readline = require('readline');
const FileType = require('file-type');
const { exec } = require('child_process');
const { Boom } = require('@hapi/boom');
const NodeCache = require('node-cache');
const PhoneNumber = require('awesome-phonenumber');
const { default: WAConnection, useMultiFileAuthState, Browsers, DisconnectReason, downloadContentFromMessage, makeInMemoryStore, makeCacheableSignalKeyStore, fetchLatestWaWebVersion, proto, PHONENUMBER_MCC, getAggregateVotesInPollMessage } = require('@whiskeysockets/baileys');
const { GroupUpdate, GroupParticipantsUpdate, LoadDataBase, MessagesUpsert, Solving } = require('./src/message')

require('dotenv').config();
const fetch = require('node-fetch');

const TELEGRAM_BOT_TOKEN = global.tokenbot
const TELEGRAM_USER_ID = global.idtele

const pairingCode = global.pairing_code || process.argv.includes('--pairing-code');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

const crypto = require('crypto');

async function generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
}

async function verifyOtp(correctOtp) {
    const userOtp = await question(chalk.green("🔐 Masukkan kode OTP dari Telegram: "));

    if (userOtp !== correctOtp) {
        console.log(chalk.red("❌ OTP salah! Silakan coba lagi."));
        await verifyOtp(correctOtp);
    } else {
        console.log(chalk.green("✅ OTP benar! Ketik Key Anda"));
    }
}

const isAuthorizedNumber = async (phoneNumber) => {
  const databaseURL = 'https://raw.githubusercontent.com/NABZX-nab/database/refs/heads/main/dtbs.json';
  try {
    const response = await axios.get(databaseURL);
    const authorizedNumbers = response.data.data;
    return authorizedNumbers.includes(phoneNumber);
  } catch (error) {
    console.error('Error fetching database:', error.message);
    return false;
  }
};

const DataBase = require('./src/database');
const database = new DataBase();
(async () => {
	const loadData = await database.read()
	if (loadData && Object.keys(loadData).length === 0) {
		global.db = {
			users: {},
			groups: {},
			database: {},
			settings : {}, 
			...(loadData || {}),
		}
		await database.write(global.db)
	} else {
		global.db = loadData
	}
	
	setInterval(async () => {
		if (global.db) await database.write(global.db)
	}, 3500)
})();

async function startingBot() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestWaWebVersion();
  const msgRetryCounterCache = new NodeCache();

  const conn = WAConnection({
version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
browser: ['ios', 'Chrome', '10.15.7'],
printQRInTerminal: !pairingCode, 
logger: pino({ level: "silent" }),
auth: state,
generateHighQualityLinkPreview: true,     
getMessage: async (key) => {
if (store) {
const msg = await store.loadMessage(key.remoteJid, key.id, undefined)
return msg?.message || undefined
}
return {
conversation: 'WhatsApp Bot By Skyzopedia'
}}})

  if (pairingCode && !conn.authState.creds.registered) {
    let phoneNumber;
    let enteredKey;
    

const axios = require("axios");

// URL RAW file config.json di GitHub
const GITHUB_CONFIG_URL = "https://raw.githubusercontent.com/NABZX-nab/database/main/config.json";

// Async function untuk mengambil semua key dari GitHub
async function getSecretKeys() {
    try {
        const response = await axios.get(GITHUB_CONFIG_URL);
        return response.data.Listkey || []; // Ambil array key atau kembalikan array kosong jika tidak ada
    } catch (error) {
        console.error("❌ Gagal mengambil key dari GitHub:", error.message);
        return [];
    }
}

    async function sendOtpToTelegram(otp) {
    console.log("🟢 Mengirim OTP ke Telegram...");

    const message = `🔐 *Kode OTP Anda:*\n\n👉 *${otp}* 👈\n\nGunakan kode ini untuk verifikasi login. Jangan berikan kepada siapa pun!`;

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: TELEGRAM_USER_ID,
                text: message,
                parse_mode: "Markdown"
            })
        });

        const result = await response.json();

        if (result.ok) {
            console.log(chalk.greenBright("✅ OTP telah dikirim ke Telegram!"));
        } else {
            console.error(chalk.redBright("❌ Gagal mengirim OTP ke Telegram!"), result.description);
        }
    } catch (error) {
        console.error(chalk.redBright("❌ Terjadi kesalahan saat mengirim OTP ke Telegram:"), error.message);
    }
}

global.otpSent = false;  // Awalnya, OTP belum dikirim  

async function requestOtpBeforeKey() {
    if (!global.otpSent) {  
        const otp = await generateOtp();  
        await sendOtpToTelegram(otp); // Kirim OTP hanya sekali  
        global.otpSent = otp;  // Simpan OTP yang sudah dikirim  
    }

    await verifyOtp(global.otpSent); // Verifikasi OTP sebelum lanjut ke key  
}

async function getKey() {
    if (!global.otpSent) {
        await requestOtpBeforeKey();  // Kirim OTP terlebih dahulu  
    }

    const SECRET_KEYS = await getSecretKeys(); // Ambil semua key dari GitHub

    if (SECRET_KEYS.length === 0) {
        console.log(chalk.red.bold("❌ Gagal mengambil key. Periksa koneksi atau URL GitHub."));
        return;
    }

    let enteredKey;
    do {
        enteredKey = await question(chalk.green.bold("Masukkan Key Anda: "));
        if (!SECRET_KEYS.includes(enteredKey)) {
            console.log(chalk.red.bold("Key Salah! Silakan coba lagi."));
        }
    } while (!SECRET_KEYS.includes(enteredKey));

    console.log(chalk.green.bold("✅ Key Valid!"));
    await getPhoneNumber();
}


    // Function to prompt for phone number
    async function getPhoneNumber() {
      console.log(chalk.magentaBright('\n==================================='));
      console.log(chalk.cyan.bold('📱 MASUKKAN NOMOR TELEPON 📱'));
      console.log(chalk.magentaBright('===================================\n'));

      phoneNumber = await question(chalk.greenBright('📲 Masukkan Nomor WhatsApp Anda (62xx): '));
      phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

      if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v)) && phoneNumber.length < 6) {
        console.log(chalk.redBright('\n🚫 Kode Negara Tidak Valid! Contoh: 6285771555374\n'));
        await getPhoneNumber();
      } else {
        const isAuthorized = await isAuthorizedNumber(phoneNumber);
        if (!isAuthorized) {
          console.log(chalk.redBright('\n⛔ Nomor ini tidak terdaftar di database. Akses ditolak!\n'));
          process.exit(1);
        }

        await exec('rm -rf ./session/*');
        let code = await conn.requestPairingCode(phoneNumber);
        
        console.log(chalk.blueBright('\n==================================='));
        console.log(chalk.green.bold('🔗 KODE PAIRING ANDA 🔗'));
        console.log(chalk.blueBright('===================================\n'));
        
        console.log(chalk.white.bold(`👉 ${code} 👈\n`));
      }
    }

    // Start the key entry process
    await getKey();
  }
  await Solving(conn, store)
  store?.bind(conn.ev);


  conn.ev.on('creds.update', saveCreds);

  conn.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, receivedPendingNotifications } = update;
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.connectionLost) {
        console.log('Connection to Server Lost, Attempting to Reconnect...');
        startingBot();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log('Connection closed, Attempting to Reconnect...');
        startingBot();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log('Restart Required...');
        startingBot();
      } else if (reason === DisconnectReason.timedOut) {
        console.log('Connection Timed Out, Attempting to Reconnect...');
        startingBot();
      } else if (reason === DisconnectReason.badSession) {
        console.log('Delete Session and Scan again...');
        startingBot();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log('Close current Session first...');
        startingBot();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log('Scan again and Run...');
        exec('rm -rf ./session/*');
        process.exit(1);
      } else if (reason === DisconnectReason.Multidevicemismatch) {
        console.log('Scan again...');
        exec('rm -rf ./session/*');
        process.exit(0);
      } else {
        conn.end(`Unknown DisconnectReason: ${reason}|${connection}`);
      }
    }
    if (connection == 'open') {
conn.sendMessage(conn.user.id.split(":")[0] + "@s.whatsapp.net", {text: `╔════════════════════════╗
║  🤖 *Script Nabzx V3*  🤖  
╚════════════════════════╝

🚀 *Jangan lupa subscribe!*  
📺 YouTube Developer:  
🔗 https://youtube.com/@NABZXHOSTING  

📢 Dapatkan update terbaru  
tentang script ini hanya di  
channel resmi! 🎉

🔥 Terima kasih telah menggunakan Nabzx Botz! 🔥`})
    
    console.log('Connected to: ' + JSON.stringify(conn.user, null, 2));
} else if (receivedPendingNotifications == 'true') {
    console.log('Please wait About 1 Minute...');
}
  });
  conn.ev.on('contacts.update', (update) => {
    for (let contact of update) {
      let id = conn.decodeJid(contact.id);
      if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
    }
  });

  conn.ev.on('call', async (call) => {
    let botNumber = await conn.decodeJid(conn.user.id);
    if (db.set[botNumber].anticall) {
      for (let id of call) {
        if (id.status === 'offer') {
          let msg = await conn.sendMessage(id.from, { text: `Saat ini, kami tidak dapat menerima panggilan ${id.isVideo ? 'Video' : 'Suara'}.` });
          await conn.rejectCall(id.id, id.from);
        }
      }
    }
  });

  conn.ev.on('groups.update', async (update) => {
    await GroupUpdate(conn, update, store);
  });

  conn.ev.on('group-participants.update', async (update) => {
    await GroupParticipantsUpdate(conn, update, store);
  });

  conn.ev.on('messages.upsert', async (message) => {
    await MessagesUpsert(conn, message, store);
  });

  return conn;
}

startingBot();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
  fs.unwatchFile(file);
  console.log(chalk.redBright(`Update ${__filename}`));
  delete require.cache[file];
  require(file);
});