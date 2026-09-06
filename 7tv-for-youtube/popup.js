const input = document.getElementById("emoteSetIds");
const status = document.getElementById("status");

chrome.storage.sync.get("emoteSetIds").then(({ emoteSetIds }) => {
  if (emoteSetIds) input.value = emoteSetIds;
});

function extractId(token) {
  token = token.trim();
  if (!token) return { ok: null };

  // Full URL to an emote set page, e.g. 7tv.app/emote-sets/<id>
  const setMatch = token.match(/emote-sets\/([A-Za-z0-9]+)/);
  if (setMatch) return { ok: setMatch[1] };

  // A channel/profile URL doesn't contain the set ID directly.
  if (/7tv\.app\/(users|@)/i.test(token)) {
    return { error: token };
  }

  // Otherwise assume it's already a bare ID.
  if (/^[A-Za-z0-9]{6,}$/.test(token)) return { ok: token };

  return { error: token };
}

document.getElementById("save").addEventListener("click", async () => {
  const tokens = input.value.split(",").map(t => t.trim()).filter(Boolean);
  const ids = [];
  const badLinks = [];

  for (const token of tokens) {
    const result = extractId(token);
    if (result.ok) ids.push(result.ok);
    else if (result.error) badLinks.push(result.error);
  }

  await chrome.storage.sync.set({ emoteSetIds: ids.join(",") });
  input.value = ids.join(", ");

  if (badLinks.length) {
    status.textContent =
      "Skipped a channel/profile link — open that channel's emote SET page " +
      "(click the active set, URL should contain /emote-sets/) and paste that instead.";
    status.style.color = "#b33";
  } else {
    status.textContent = `Saved ${ids.length} set ID(s). Reload your YouTube chat tab.`;
    status.style.color = "";
  }
});
