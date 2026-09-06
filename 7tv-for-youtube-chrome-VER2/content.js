// 7TV for YouTube (unofficial) — content script
// Runs inside the YouTube live_chat iframe.

const SEVEN_TV_API = "https://7tv.io/v3";

let emoteMap = null;   // name -> image url
let emoteRegex = null; // compiled once the map is ready

function buildEmoteUrl(host, files) {
  // Prefer a small static webp/png for inline chat rendering.
  const pick =
    files.find(f => f.name === "2x.webp") ||
    files.find(f => f.format === "WEBP") ||
    files[0];
  if (!pick) return null;
  const base = host.url.startsWith("//") ? "https:" + host.url : host.url;
  return `${base}/${pick.name}`;
}

async function loadEmoteSet(emoteSetId) {
  const res = await fetch(`${SEVEN_TV_API}/emote-sets/${emoteSetId}`);
  if (!res.ok) throw new Error(`7TV API error: ${res.status}`);
  const data = await res.json();

  const map = new Map();
  for (const emote of data.emotes || []) {
    const host = emote.data?.host;
    if (!host) continue;
    const url = buildEmoteUrl(host, host.files || []);
    if (url) map.set(emote.name, url);
  }
  return map;
}

function compileRegex(map) {
  // Longest names first so overlapping names don't shadow each other.
  const names = [...map.keys()].sort((a, b) => b.length - a.length);
  if (names.length === 0) return null;
  const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // \w in JS only covers [A-Za-z0-9_] — it doesn't know Cyrillic, Greek,
  // etc. are "letters" too, so "ок" would wrongly match inside "роблокс".
  // \p{L}/\p{N} with the "u" flag make the boundary Unicode-aware.
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(${escaped.join("|")})(?![\\p{L}\\p{N}_])`,
    "gu"
  );
}

function replaceInMessageNode(node) {
  if (!emoteMap || !emoteRegex) return;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let n;
  while ((n = walker.nextNode())) textNodes.push(n);

  for (const textNode of textNodes) {
    const text = textNode.nodeValue;
    if (!text || !emoteRegex.test(text)) continue;
    emoteRegex.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = emoteRegex.exec(text))) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const img = document.createElement("img");
      img.src = emoteMap.get(match[1]);
      img.alt = match[1];
      img.title = match[1];
      img.className = "seventv-emote";
      frag.appendChild(img);
      lastIndex = match.index + match[1].length;
    }
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode.replaceChild(frag, textNode);
  }
}

function scanExistingMessages() {
  document
    .querySelectorAll("yt-live-chat-text-message-renderer #message")
    .forEach(replaceInMessageNode);
}

function startSafetyNet() {
  // MutationObserver should catch every rewrite, but YouTube's chat
  // internals are undocumented — this fallback re-applies emotes to any
  // message that lost them, in case a mutation slips past the observer.
  setInterval(scanExistingMessages, 1000);
}

function closestMessage(node) {
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  return el?.closest ? el.closest("#message") : null;
}

function observeChat() {
  const target = document.querySelector("#items") || document.body;
  const observer = new MutationObserver(mutations => {
    const toProcess = new Set();

    for (const m of mutations) {
      // Text inside a message was rewritten by YouTube — reprocess it.
      if (m.type === "characterData") {
        const msg = closestMessage(m.target);
        if (msg) toProcess.add(msg);
        continue;
      }
      // A whole message (or a chat item wrapping one) was added/rebuilt.
      for (const added of m.addedNodes) {
        if (!(added instanceof HTMLElement)) continue;
        const msg = added.matches?.("#message") ? added : added.querySelector?.("#message");
        if (msg) toProcess.add(msg);
      }
    }

    for (const msg of toProcess) replaceInMessageNode(msg);
  });
  observer.observe(target, { childList: true, subtree: true, characterData: true });
}

function showBadge(text, isError) {
  let badge = document.getElementById("seventv-debug-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "seventv-debug-badge";
    badge.style.cssText =
      "position:fixed;bottom:4px;right:4px;z-index:99999;" +
      "background:rgba(0,0,0,0.75);color:#fff;font:11px sans-serif;" +
      "padding:3px 6px;border-radius:4px;pointer-events:none;";
    document.body.appendChild(badge);
  }
  badge.textContent = "7TV: " + text;
  badge.style.color = isError ? "#ff8080" : "#a0ffa0";
}

const GLOBAL_EMOTE_SET_ID = "global";

async function init() {
  showBadge("script loaded, fetching…");
  console.log("[7TV for YouTube] content script running on", location.href);

  const { emoteSetIds } = await chrome.storage.sync.get("emoteSetIds");
  const extraIds = (emoteSetIds || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const merged = new Map();

  // Global set loads by default so the standard 7TV picks render.
  try {
    const globalMap = await loadEmoteSet(GLOBAL_EMOTE_SET_ID);
    for (const [name, url] of globalMap) merged.set(name, url);
  } catch (err) {
    console.warn("[7TV for YouTube] failed to load global set", err);
    showBadge("global set failed: " + err.message, true);
  }

  // Extra sets load in the order given, so a set added later (e.g. your
  // own personal one) can override a name from an earlier one.
  for (const id of extraIds) {
    try {
      const map = await loadEmoteSet(id);
      for (const [name, url] of map) merged.set(name, url);
    } catch (err) {
      console.warn(`[7TV for YouTube] failed to load set ${id}`, err);
    }
  }

  if (merged.size === 0) {
    showBadge("0 emotes loaded (see console)", true);
    return;
  }

  emoteMap = merged;
  emoteRegex = compileRegex(emoteMap);
  if (!emoteRegex) return;
  scanExistingMessages();
  observeChat();
  startSafetyNet();
  showBadge(`${merged.size} emotes ready`);
}

init();

// Re-init if the user changes the emote set IDs from the popup.
chrome.storage.onChanged.addListener(changes => {
  if (changes.emoteSetIds) location.reload();
});
