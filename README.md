# 🤖 Desea Check-in Bot

> Automated daily check-in bot for [Desea Airdrop](https://airdrop.desea.io?ref=DdLj0irjd0) — supports multiple accounts and rotating proxies.

> 🎁 Use my referral code to support me: **`DdLj0irjd0`**

**📌 Author:** [@mejri02](https://github.com/mejri02)  
**📦 Repo:** [desea-Bot](https://github.com/mejri02/desea-Bot)

---

## ✨ Features

- ✅ Multi-account support
- 🌐 Rotating proxy support with auto-anonymization
- 🔄 Auto-retry without proxy on connection failure
- 🧠 Random user-agent rotation
- 📊 Summary results after each run

---

## 📋 Requirements

Before running, make sure you have the following installed:

### Node.js Packages

```bash
npm install puppeteer-core proxy-chain
```

### Chromium Browser

The bot uses **Chromium** (not the full Chrome). Install it based on your OS:

**Ubuntu / Debian:**
```bash
sudo apt update && sudo apt install -y chromium-browser
```

**Arch Linux:**
```bash
sudo pacman -S chromium
```

**macOS (via Homebrew):**
```bash
brew install --cask chromium
```

> ⚠️ The bot looks for Chromium at `/usr/bin/chromium` by default. Update `executablePath` in `bot.js` if yours is installed elsewhere.

---

## 🚀 Setup

### 1. Clone the repo

```bash
git clone https://github.com/mejri02/desea-bot.git
cd desea-bot
```

### 2. Install dependencies

```bash
npm install puppeteer-core proxy-chain
```

### 3. Create `accounts.txt`

One account per line in `email:password` format:

```
user1@example.com:password123
user2@example.com:mypassword
```

### 4. Create `proxies.txt`

One proxy per line. Supported formats:

```
http://user:pass@host:port
socks5://user:pass@host:port
http://host:port
```

> Lines starting with `#` are treated as comments and ignored.

---

## ▶️ Run

```bash
node index.js
```

---

## 📊 Output Example

```
==================================================
🚀 Desea Check-in
📌 @mejri02
==================================================

📡 Setting up 3 proxies...
✅✅✅

✅ Ready: 3 proxies
📋 Processing 2 accounts...

▶️ user1@example.com
   🌐 proxy.example.com:8080
   📍 Going to check-in page...
   ✅ Button clicked
   ✨ Check-in successful!
   ✅ success

⏳ 6s...

▶️ user2@example.com
   ...

==================================================
📊 RESULTS
==================================================
✅ user1@example.com: success
⏭️ user2@example.com: already
==================================================
```

---

## ⚙️ Configuration

You can tweak settings inside `index.js`:

| Option | Default | Description |
|--------|---------|-------------|
| `headless` | `true` | Run browser in headless mode |
| `timeout` | `30000` | Page load timeout (ms) |
| `delayBetweenAccounts` | `5000` | Wait between accounts (ms) |
| `useProxy` | `true` | Enable proxy usage |
| `executablePath` | `/usr/bin/chromium` | Path to Chromium binary |

---

## 🔗 Support the Project

If this bot helped you, please register using the referral link below:

> 🎁 **[https://airdrop.desea.io?ref=DdLj0irjd0](https://airdrop.desea.io?ref=DdLj0irjd0)**  
> 🔑 **Referral Code:** `DdLj0irjd0`

---

## ⚠️ Disclaimer

This bot is intended for personal use only. Use responsibly and in accordance with Desea's Terms of Service. The author is not responsible for any account bans or loss of rewards.

---

## 📄 License

MIT © [@mejri02](https://github.com/mejri02)
