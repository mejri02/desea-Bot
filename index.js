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
            jitterPercent: 0.2
        };
        
        // 10 random user agents
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

    // ========== UTILITY FUNCTIONS ==========
    
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

    // ========== PROXY FUNCTIONS ==========
    
    async loadProxies() {
        try {
            const proxyData = await fs.readFile('proxies.txt', 'utf8');
            const rawProxies = proxyData.split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => line.trim());
            
            if (rawProxies.length === 0) {
                console.log('ℹ️ No proxies found, running without proxies');
                return;
            }
            
            console.log(`📡 Loading ${rawProxies.length} proxies for multi-accounts...`);
            
            for (const proxy of rawProxies) {
                try {
                    const anonymized = await proxyChain.anonymizeProxy(proxy);
                    this.anonymizedProxies.push(anonymized);
                    this.proxies.push(proxy);
                    process.stdout.write('✅');
                } catch (e) {
                    process.stdout.write('❌');
                }
            }
            
            console.log('\n');
            
            if (this.proxies.length > 0) {
                this.useProxy = true;
                console.log(`✅ Proxy mode: ENABLED (${this.proxies.length} working proxies)`);
                process.on('exit', this.closeProxyServers.bind(this));
            } else {
                console.log('ℹ️ No working proxies, running without proxies');
            }
            
        } catch (e) {
            console.log('ℹ️ No proxies.txt found, running without proxies');
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

    // ========== ACCOUNT FUNCTIONS ==========
    
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

    // ========== BROWSER FUNCTIONS ==========
    
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
            console.log(`   🌐 Proxy ${accountIndex + 1}/${this.proxies.length}: ${proxy.raw.split('@').pop() || proxy.raw}`);
        } else {
            console.log(`   🔌 Direct connection`);
        }

        return await puppeteer.launch({
            executablePath: this.config.executablePath,
            headless: this.config.headless,
            args: args
        });
    }

    // ========== LOGIN ==========
    
    async login(page, email, password) {
        console.log(`   🔑 Logging in...`);
        
        try {
            // Click Log In button
            await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('button, a'));
                const loginBtn = elements.find(el => el.textContent?.trim() === 'Log In');
                if (loginBtn) loginBtn.click();
            });

            await this.sleep(3000);

            // Fill login form
            await page.waitForSelector('#username', { timeout: 10000 });
            await page.type('#username', email, { delay: this.randomInt(30, 70) });
            await this.sleep(500);
            await page.type('#password', password, { delay: this.randomInt(30, 70) });

            await this.sleep(1000);

            // Submit
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const submitBtn = buttons.find(b => b.textContent?.trim() === 'Log In' || b.type === 'submit');
                if (submitBtn) submitBtn.click();
            });

            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
            
            console.log(`   ✅ Login successful`);
            return true;

        } catch (error) {
            console.log(`   ❌ Login failed: ${error.message}`);
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
        
        console.log(`   ✅ Already logged in`);
        return true;
    }

    // ========== CHECK-IN ONLY ==========
    
    async doCheckin(page) {
        console.log(`   📍 Check-in...`);
        
        await page.goto('https://airdrop.desea.io/checkin', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        await this.sleep(3000);

        const result = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            
            // Look for check-in button
            const checkinBtn = buttons.find(b => 
                b.textContent?.trim() === 'Check-in Now' && !b.disabled
            );
            
            if (checkinBtn) {
                checkinBtn.click();
                return { status: 'clicked' };
            }
            
            // Check if already checked in
            const bodyText = document.body.innerText;
            if (bodyText.includes('already checked') || 
                bodyText.includes('checked in today') ||
                bodyText.includes('already claimed')) {
                return { status: 'already' };
            }
            
            // Check if button exists but is disabled
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
            
            // Verify success
            const success = await page.evaluate(() => {
                const text = document.body.innerText;
                return text.includes('success') || text.includes('claimed') || text.includes('+');
            });
            
            return success ? 'success' : 'already';
        }
        
        return result.status;
    }

    // ========== PROCESS ACCOUNT ==========
    
    async processAccount(account, index) {
        console.log(`\n▶️ ${account.email}`);
        
        let browser = null;
        try {
            browser = await this.launchBrowser(index);
            const page = await browser.newPage();

            // Go to site
            await page.goto('https://airdrop.desea.io', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Login
            const loggedIn = await this.ensureLoggedIn(page, account.email, account.password);
            if (!loggedIn) {
                return { 
                    email: account.email, 
                    status: 'login_failed'
                };
            }

            // Check-in only
            const checkinStatus = await this.doCheckin(page);

            return { 
                email: account.email, 
                status: checkinStatus
            };

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            return { 
                email: account.email, 
                status: 'error'
            };
        } finally {
            if (browser) await browser.close();
        }
    }

    // ========== CYCLE MANAGEMENT ==========
    
    async runCycle() {
        this.runCount++;
        const startTime = new Date();
        
        console.log('\n' + '='.repeat(70));
        console.log(`🔄 RUN #${this.runCount} - ${startTime.toLocaleString()}`);
        console.log('='.repeat(70));

        const accounts = await this.loadAccounts();
        console.log(`\n📋 Processing ${accounts.length} accounts...`);
        console.log(`🌐 Proxy mode: ${this.useProxy ? 'ON' : 'OFF'}`);
        if (this.useProxy) console.log(`🔄 Rotating through ${this.proxies.length} proxies`);

        const cycleResults = [];

        for (let i = 0; i < accounts.length; i++) {
            const result = await this.processAccount(accounts[i], i);
            cycleResults.push(result);
            
            if (i < accounts.length - 1) {
                const waitTime = 5000 + Math.random() * 3000;
                console.log(`\n⏳ ${Math.round(waitTime/1000)}s until next account...`);
                await this.sleep(waitTime);
            }
        }

        // Save results
        await fs.writeFile(`cycle_${this.runCount}.json`, JSON.stringify({
            run: this.runCount,
            timestamp: startTime.toISOString(),
            proxyMode: this.useProxy,
            proxyCount: this.proxies.length,
            results: cycleResults
        }, null, 2));

        // Summary with proper emojis
        console.log('\n' + '='.repeat(70));
        console.log(`📊 CYCLE #${this.runCount} SUMMARY`);
        console.log('='.repeat(70));
        
        let success = 0, already = 0, notfound = 0, loginFailed = 0, error = 0;
        
        for (const r of cycleResults) {
            let emoji = '❓';
            let statusText = r.status;
            
            if (r.status === 'success') {
                emoji = '✅';
                success++;
            } else if (r.status === 'already') {
                emoji = '⏭️';
                already++;
            } else if (r.status === 'notfound') {
                emoji = '🔍';
                notfound++;
            } else if (r.status === 'login_failed') {
                emoji = '🔒';
                loginFailed++;
            } else {
                emoji = '❌';
                error++;
            }
            
            const proxyIcon = this.useProxy ? '🌐' : '🔌';
            console.log(`${emoji}${proxyIcon} ${r.email}: ${statusText}`);
        }
        
        console.log('='.repeat(70));
        console.log(`✅ Success: ${success}`);
        console.log(`⏭️ Already checked: ${already}`);
        console.log(`🔍 Not found: ${notfound}`);
        console.log(`🔒 Login failed: ${loginFailed}`);
        console.log(`❌ Error: ${error}`);
        if (this.useProxy) console.log(`🌐 Proxies: ${this.proxies.length}`);
        console.log('='.repeat(70));

        return cycleResults;
    }

    // ========== MAIN LOOP ==========
    
    async run() {
        console.log('='.repeat(70));
        console.log('🚀 Desea Check-in Bot');
        console.log('📌 @mejri02');
        console.log('='.repeat(70));

        // Load proxies (optional)
        await this.loadProxies();
        
        const accounts = await this.loadAccounts();
        console.log(`📋 Loaded ${accounts.length} accounts`);
        console.log(`⏰ Runs every ${this.config.sleepHours}h with ±${this.config.jitterPercent*100}% jitter`);
        console.log(`📱 User Agents: ${this.userAgents.length} random`);
        console.log('='.repeat(70));

        while (true) {
            try {
                await this.runCycle();

                const { sleepTime, hours, minutes } = this.calculateSleepTime();
                const nextRun = new Date(Date.now() + sleepTime);
                
                console.log(`\n😴 Sleeping ${hours}h ${minutes}m until ${nextRun.toLocaleString()}`);
                await this.sleep(sleepTime);

            } catch (error) {
                console.error(`\n❌ Error: ${error.message}`);
                console.log('🔄 Restarting in 5 minutes...');
                await this.sleep(5 * 60 * 1000);
            }
        }
    }
}

// Start the bot
new DeseaCheckinBot().run().catch(console.error);
