import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const wait = (ms) => new Promise(r => setTimeout(r, ms));

await page.goto('http://localhost:5174');
await page.waitForLoadState('networkidle');
await wait(1500); // let getFiles() on App mount complete

// Go directly to Chat — skip Upload tab entirely
await page.click('nav button:has-text("Chat")');
await wait(800);
await page.screenshot({ path: '/tmp/fix_01_chat_direct.png' });

const body1 = await page.textContent('body');
console.log('hasIndexed state (no Upload visit):');
console.log('  Shows "Ready to answer":', body1.includes('Ready to answer'));
console.log('  Shows "Summarise" chips:', body1.includes('Summarise'));
console.log('  Shows "No documents indexed" (BUG):', body1.includes('No documents indexed'));

// Create a session and check empty state
await page.click('button:has-text("New Chat")');
await wait(1000);
await page.screenshot({ path: '/tmp/fix_02_new_session.png' });

const body2 = await page.textContent('body');
console.log('\nAfter New Chat:');
console.log('  Shows "Ready to answer":', body2.includes('Ready to answer'));
console.log('  Shows suggestion chips:', body2.includes('Summarise'));
console.log('  Input disabled:', await page.$eval('textarea', el => el.disabled));

await browser.close();
console.log('\n📸 Screenshots: /tmp/fix_01_chat_direct.png, /tmp/fix_02_new_session.png');
