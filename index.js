const puppeteer = require('puppeteer-core');
const fs = require('fs').promises;
const proxyChain = require('proxy-chain');

class DeseaCheckinBot {
    constructor() {
        this.config = {
            headless: true,
            timeout: 30000,
            delayBetweenAccounts: 5000,
            executablePath: '/usr/bin/chromium',
            sleepHours: 24,
            jitterPercent: 0.2,
            useProxy: false
        };
        
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0'
        ];
        
        this.proxies = [];
        this.anonymizedProxies = [];
        this.results = [];
        this.runCount = 0;
        this.useProxy = false;
    }
    
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    calculateSleepTime() {
        const baseSleep = this.config.sleepHours * 60 * 60 * 1000;
        const jitter = baseSleep * this.config.jitterPercent * (Math.random() * 2 - 1);
        const sleepTime = baseSleep + jitter;
        const hours = Math.floor(sleepTime / (60 * 60 * 1000));
        const minutes = Math.floor((sleepTime % (60 * 60 * 1000)) / (60 * 1000));
        return { sleepTime, hours, minutes };
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    showBanner() {
        console.clear();
        console.log('\x1b[36m%s\x1b[0m', '╔═══════════════════════════════════════════════════════════════════════╗');
        console.log('\x1b[36m%s\x1b[0m', '║                                                                       ║');
        console.log('\x1b[36m%s\x1b[0m', '║                    🚀 DESEA CHECK-IN BOT v2.0                          ║');
        console.log('\x1b[36m%s\x1b[0m', '║                                                                       ║');
        console.log('\x1b[36m%s\x1b[0m', '║                        🔥 @mejri02                                     ║');
        console.log('\x1b[36m%s\x1b[0m', '║                                                                       ║');
        console.log('\x1b[36m%s\x1b[0m', '╚═══════════════════════════════════════════════════════════════════════╝');
        console.log('\n');
    }

    async loadConfig() {
        try {
            const configData = await fs.readFile('config.json', 'utf8');
            const userConfig = JSON.parse(configData);
            this.config = { ...this.config, ...userConfig };
            this.useProxy = this.config.useProxy;
            console.log('\x1b[32m%s\x1b[0m', '✅ Config loaded successfully');
        } catch (e) {
            console.log('\x1b[33m%s\x1b[0m', '⚠️ Using default configuration');
        }
    }
    
    async loadProxies() {
        if (!this.useProxy) {
            console.log('\x1b[33m%s\x1b[0m', 'ℹ️ Proxy disabled in config');
            return;
        }
        
        try {
            const proxyData = await fs.readFile('proxies.txt', 'utf8');
            const rawProxies = proxyData.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.trim());
            
            if (rawProxies.length === 0) {
                console.log('\x1b[33m%s\x1b[0m', 'ℹ️ No proxies found');
                return;
            }
            
            process.stdout.write('\x1b[36m📡 Loading proxies: \x1b[0m');
            
            for (const proxy of rawProxies) {
                try {
                    const anonymized = await proxyChain.anonymizeProxy(proxy);
                    this.anonymizedProxies.push(anonymized);
                    this.proxies.push(proxy);
                    process.stdout.write('\x1b[32m✅\x1b[0m');
                } catch (e) {
                    process.stdout.write('\x1b[31m❌\x1b[0m');
                }
            }
            
            console.log('\n');
            
            if (this.proxies.length > 0) {
                console.log(`\x1b[32m✅ Proxy mode: ENABLED (${this.proxies.length} working proxies)\x1b[0m`);
                process.on('exit', this.closeProxyServers.bind(this));
            } else {
                console.log('\x1b[33mℹ️ No working proxies found\x1b[0m');
                this.useProxy = false;
            }
            
        } catch (e) {
            console.log('\x1b[33mℹ️ No proxies.txt found\x1b[0m');
        }
    }

    async closeProxyServers() {
        for (const proxy of this.anonymizedProxies) {
            try {
                await proxyChain.closeAnonymizedProxy(proxy, true);
            } catch (e) {}
        }
    }

    getProxyForIndex(index) {
        if (!this.useProxy || this.anonymizedProxies.length === 0) {
            return null;
        }
        const proxyIndex = index % this.anonymizedProxies.length;
        return {
            raw: this.proxies[proxyIndex],
            anonymized: this.anonymizedProxies[proxyIndex]
        };
    }
    
    async loadAccounts() {
        const data = await fs.readFile('accounts.txt', 'utf8');
        return data.split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(line => {
                const [email, password] = line.split(':').map(s => s.trim());
                return { email, password };
            })
            .filter(acc => acc.email && acc.password);
    }
    
    async launchBrowser(accountIndex) {
        const userAgent = this.getRandomUserAgent();
        const proxy = this.getProxyForIndex(accountIndex);
        
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,800',
            '--disable-blink-features=AutomationControlled',
            `--user-agent=${userAgent}`
        ];

        if (proxy) {
            args.push(`--proxy-server=${proxy.anonymized}`);
            const proxyDisplay = proxy.raw.split('@').pop() || proxy.raw;
            console.log(`   \x1b[36m🌐 Proxy: ${proxyDisplay}\x1b[0m`);
        }

        return await puppeteer.launch({
            executablePath: this.config.executablePath,
            headless: this.config.headless,
            args: args
        });
    }
    
    async login(page, email, password) {
        console.log(`   \x1b[33m🔑 Logging in...\x1b[0m`);
        
        try {
            await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, a'));
                const loginBtn = elements.find(el => el.textContent?.trim() === 'Log In');
                if (loginBtn) loginBtn.click();
            });

            await this.sleep(3000);
            await page.waitForSelector('#username', { timeout: 10000 });
            await page.type('#username', email, { delay: this.randomInt(30, 70) });
            await this.sleep(500);
            await page.type('#password', password, { delay: this.randomInt(30, 70) });
            await this.sleep(1000);

            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const submitBtn = buttons.find(b => b.textContent?.trim() === 'Log In' || b.type === 'submit');
                if (submitBtn) submitBtn.click();
            });

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            console.log(`   \x1b[32m✅ Login successful\x1b[0m`);
            return true;

        } catch (error) {
            console.log(`   \x1b[31m❌ Login failed\x1b[0m`);
            return false;
        }
    }

    async ensureLoggedIn(page, email, password) {
        await page.goto('https://airdrop.desea.io', { waitUntil: 'networkidle2', timeout: 30000 });

        const needsLogin = await page.evaluate(() => {
            return document.body.innerText.includes('Log In');
        });

        if (needsLogin) {
            return await this.login(page, email, password);
        }
        
        console.log(`   \x1b[32m✅ Already logged in\x1b[0m`);
        return true;
    }
    
    async doCheckin(page) {
        console.log(`   \x1b[36m📍 Checking in...\x1b[0m`);
        
        await page.goto('https://airdrop.desea.io/checkin', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await this.sleep(3000);

        const result = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const checkinBtn = buttons.find(b => 
                b.textContent?.trim() === 'Check-in Now' && !b.disabled
            );
            
            if (checkinBtn) {
                checkinBtn.click();
                return { status: 'clicked' };
            }
            
            const bodyText = document.body.innerText;
            if (bodyText.includes('already checked') || 
                bodyText.includes('checked in today') ||
                bodyText.includes('already claimed')) {
                return { status: 'already' };
            }
            
            const disabledBtn = buttons.find(b => 
                b.textContent?.trim() === 'Check-in Now' && b.disabled
            );
            
            if (disabledBtn) {
                return { status: 'already' };
            }
            
            return { status: 'notfound' };
        });

        if (result.status === 'clicked') {
            await this.sleep(3000);
            const success = await page.evaluate(() => {
                const text = document.body.innerText;
                return text.includes('success') || text.includes('claimed') || text.includes('+');
            });
            
            return success ? 'success' : 'already';
        }
        
        return result.status;
    }
    
    async processAccount(account, index) {
        console.log(`\n\x1b[36m▶️ Account ${index + 1}: ${account.email}\x1b[0m`);
        
        let browser = null;
        try {
            browser = await this.launchBrowser(index);
            const page = await browser.newPage();

            await page.goto('https://airdrop.desea.io', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            const loggedIn = await this.ensureLoggedIn(page, account.email, account.password);
            if (!loggedIn) {
                return { 
                    email: account.email, 
                    status: 'login_failed'
                };
            }

            const checkinStatus = await this.doCheckin(page);
            return { email: account.email, status: checkinStatus };

        } catch (error) {
            return { email: account.email, status: 'error' };
        } finally {
            if (browser) await browser.close();
        }
    }
    
    showDashboard(stats) {
        console.log('\n\x1b[36m╔═══════════════════════════════════════════════════════════════════════╗\x1b[0m');
        console.log('\x1b[36m║                       📊 LIVE DASHBOARD                               ║\x1b[0m');
        console.log('\x1b[36m╠═══════════════════════════════════════════════════════════════════════╣\x1b[0m');
        
        const total = stats.success + stats.already + stats.notfound + stats.loginFailed + stats.error;
        const successRate = total > 0 ? ((stats.success / total) * 100).toFixed(1) : 0;
        
        console.log(`\x1b[36m║  \x1b[32m✅ Success:\x1b[0m       ${stats.success.toString().padEnd(5)}            \x1b[36m│\x1b[0m  \x1b[36m📊 Rate:\x1b[0m       ${successRate}%        \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║  \x1b[33m⏭️ Already:\x1b[0m       ${stats.already.toString().padEnd(5)}            \x1b[36m│\x1b[0m  \x1b[36m🌐 Proxy:\x1b[0m      ${this.useProxy ? 'ON' : 'OFF'}        \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║  \x1b[35m🔍 Not Found:\x1b[0m     ${stats.notfound.toString().padEnd(5)}            \x1b[36m│\x1b[0m  \x1b[36m📱 UA:\x1b[0m         ${this.userAgents.length}         \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║  \x1b[31m🔒 Login Failed:\x1b[0m  ${stats.loginFailed.toString().padEnd(5)}            \x1b[36m│\x1b[0m  \x1b[36m🔄 Run:\x1b[0m        #${this.runCount}        \x1b[36m║\x1b[0m`);
        console.log(`\x1b[36m║  \x1b[31m❌ Error:\x1b[0m         ${stats.error.toString().padEnd(5)}            \x1b[36m│\x1b[0m  \x1b[36m👥 Accounts:\x1b[0m   ${total}         \x1b[36m║\x1b[0m`);
        
        console.log('\x1b[36m╚═══════════════════════════════════════════════════════════════════════╝\x1b[0m');
    }
    
    async runCycle() {
        this.runCount++;
        const startTime = new Date();
        
        const accounts = await this.loadAccounts();
        const cycleResults = [];

        for (let i = 0; i < accounts.length; i++) {
            const result = await this.processAccount(accounts[i], i);
            cycleResults.push(result);
            
            const stats = {
                success: cycleResults.filter(r => r.status === 'success').length,
                already: cycleResults.filter(r => r.status === 'already').length,
                notfound: cycleResults.filter(r => r.status === 'notfound').length,
                loginFailed: cycleResults.filter(r => r.status === 'login_failed').length,
                error: cycleResults.filter(r => r.status === 'error').length
            };
            
            this.showDashboard(stats);
            
            if (i < accounts.length - 1) {
                const waitTime = 5000 + Math.random() * 3000;
                console.log(`\n\x1b[33m⏳ Waiting ${Math.round(waitTime/1000)}s before next account...\x1b[0m`);
                await this.sleep(waitTime);
                this.showBanner();
            }
        }

        await fs.writeFile(`cycle_${this.runCount}.json`, JSON.stringify({
            run: this.runCount,
            timestamp: startTime.toISOString(),
            proxyMode: this.useProxy,
            proxyCount: this.proxies.length,
            results: cycleResults
        }, null, 2));

        return cycleResults;
    }
    
    async run() {
        this.showBanner();
        await this.loadConfig();
        
        const accounts = await this.loadAccounts();
        console.log(`\x1b[36m📋 Loaded ${accounts.length} accounts\x1b[0m`);
        
        await this.loadProxies();
        
        console.log(`\x1b[36m⏰ Schedule: Every ${this.config.sleepHours}h ±${this.config.jitterPercent*100}%\x1b[0m`);
        console.log('\x1b[36m' + '─'.repeat(70) + '\x1b[0m');

        while (true) {
            try {
                await this.runCycle();

                const { sleepTime, hours, minutes } = this.calculateSleepTime();
                const nextRun = new Date(Date.now() + sleepTime);
                
                console.log(`\n\x1b[35m😴 Sleeping ${hours}h ${minutes}m until ${nextRun.toLocaleString()}\x1b[0m\n`);
                await this.sleep(sleepTime);
                this.showBanner();

            } catch (error) {
                console.error(`\n\x1b[31m❌ Error: ${error.message}\x1b[0m`);
                console.log('\x1b[33m🔄 Restarting in 5 minutes...\x1b[0m');
                await this.sleep(5 * 60 * 1000);
                this.showBanner();
            }
        }
    }
}

new DeseaCheckinBot().run().catch(console.error);
