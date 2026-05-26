import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5174';
const BACKEND = 'http://localhost:8000';
const SS = (name) => `/tmp/ss_${name}.png`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

async function shot(name) {
  await page.screenshot({ path: SS(name), fullPage: false });
  console.log(`📸 ${name} → ${SS(name)}`);
}

async function wait(ms) { await new Promise(r => setTimeout(r, ms)); }

// ── 1. Load app ──────────────────────────────────────────────────────────────
await page.goto(BASE);
await page.waitForLoadState('networkidle');
await shot('01_initial_upload_tab');

// ── 2. Check header branding & step nav ──────────────────────────────────────
const brand = await page.textContent('h1');
console.log('Brand:', brand);

const steps = await page.$$eval('nav button', els => els.map(el => el.textContent?.trim()));
console.log('Nav steps:', steps);
await shot('02_header_steps');

// ── 3. Upload tab empty state ─────────────────────────────────────────────────
const uploadHeading = await page.textContent('h2');
console.log('Upload heading:', uploadHeading);

// ── 4. Switch to Chat tab — no session empty state ────────────────────────────
await page.click('nav button:has-text("Chat")');
await wait(600);
await shot('03_chat_no_session');
const noSessionText = await page.textContent('body');
console.log('No-session state includes "Start a conversation":', noSessionText.includes('Start a conversation'));

// ── 5. Create new chat session ────────────────────────────────────────────────
await page.click('button:has-text("New Chat")');
await wait(800);
await shot('04_new_session_empty_state');

// Check empty state with indexed docs (files already indexed from backend)
const bodyText = await page.textContent('body');
const hasIndexed = bodyText.includes('Ready to answer') || bodyText.includes('Summarise');
const hasNotIndexed = bodyText.includes('No documents indexed') || bodyText.includes('Upload Docs');
console.log('Has indexed empty state:', hasIndexed);
console.log('Has not-indexed empty state:', hasNotIndexed);
console.log('Has suggestion chips:', bodyText.includes('Summarise the document'));

// ── 6. Check session title in header ─────────────────────────────────────────
const sessionTitle = await page.$('text=New Chat');
console.log('Session title visible:', sessionTitle !== null);

// ── 7. Send a chat message ────────────────────────────────────────────────────
const textarea = await page.$('textarea');
await textarea?.fill('What is BFSI?');
await page.keyboard.press('Enter');
await wait(500);
await shot('05_message_sent_loading');

// Wait up to 30s for response
let responded = false;
for (let i = 0; i < 30; i++) {
  await wait(1000);
  const msgs = await page.$$('[class*="rounded-2xl"]');
  if (msgs.length >= 2) { responded = true; break; }
}

if (responded) {
  await shot('06_response_received');

  // ── 8. Check markdown rendering ──────────────────────────────────────────
  const hasStrong = await page.$('strong') !== null;
  const hasList = await page.$('ul, ol') !== null;
  const hasRawAsterisks = (await page.textContent('body')).includes('**');
  console.log('Markdown <strong> rendered:', hasStrong);
  console.log('Markdown <ul>/<ol> rendered:', hasList);
  console.log('Raw ** visible (BAD):', hasRawAsterisks);

  // ── 9. Check timestamp ────────────────────────────────────────────────────
  const bodyAfter = await page.textContent('body');
  const hasTimestamp = bodyAfter.includes('just now') || bodyAfter.includes('m ago');
  console.log('Timestamp visible:', hasTimestamp);

  // ── 10. Check copy button on hover ───────────────────────────────────────
  const assistantMsg = await page.$('[class*="rounded-bl-sm"]');
  if (assistantMsg) {
    await assistantMsg.hover();
    await wait(300);
    await shot('07_hover_copy_button');
    const copyBtn = await page.$('button[title="Copy"]');
    console.log('Copy button present:', copyBtn !== null);
  }

  // ── 11. Check session title updated in sidebar and chat header ───────────
  await wait(500);
  await shot('08_session_title_updated');
  const titleArea = await page.textContent('body');
  console.log('Title shows "What is BFSI":', titleArea.includes('What is BFSI'));

  // ── 12. Source citation ───────────────────────────────────────────────────
  const sourcesBtn = await page.$('text=source');
  console.log('Sources toggle present:', sourcesBtn !== null);
  if (sourcesBtn) {
    await sourcesBtn.click();
    await wait(300);
    await shot('09_sources_expanded');
    const srcText = await page.textContent('body');
    const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}/.test(srcText.split('source')[1] || '');
    console.log('Sources show UUID filenames (BAD):', hasUUID);
    const hasRealName = srcText.includes('.pdf') || srcText.includes('.xlsx');
    console.log('Sources show real filenames:', hasRealName);
  }
} else {
  console.log('⚠️  Response timed out (rate limit or model issue)');
  await shot('06_timeout');
}

// ── 13. Probe: small talk ─────────────────────────────────────────────────────
const textarea2 = await page.$('textarea');
await textarea2?.fill('hi there');
await page.keyboard.press('Enter');
await wait(500);
await shot('10_small_talk_sent');

// ── 14. Step nav — switch to Upload, check step styling ──────────────────────
await page.click('nav button:has-text("Upload")');
await wait(300);
await shot('11_upload_tab_step_nav');

// Check step indicators
const stepButtons = await page.$$eval('nav button', els =>
  els.map(el => ({ text: el.textContent?.trim(), class: el.className }))
);
console.log('Step buttons:', JSON.stringify(stepButtons, null, 2));

// ── 15. Knowledge Base tab ────────────────────────────────────────────────────
await page.click('nav button:has-text("Index")');
await wait(400);
await shot('12_knowledge_base_tab');

await browser.close();
console.log('\n✅ Playwright run complete');
