# 7tv-for-youtube
# 7TV for YouTube (Unofficial)

Renders 7TV emotes inside YouTube Live Chat. Unofficial and not affiliated
with 7TV, Twitch, or YouTube — built because 7TV doesn't support YouTube yet.

## What it does

- Loads the 7TV global emote set automatically.
- Lets you add extra emote sets (a streamer's channel set, your own
  personal set) by pasting their 7tv.app links in the popup.
- Watches YouTube's live chat and swaps matching emote names for images,
  live, as messages come in.

## Limitations (read before installing)

- Only visible to people who also install this extension — it can't make
  emotes appear for viewers who don't have it.
- 7TV has no single "download everything" library; you build your own
  emote list by adding specific channels' set IDs.
- Relies on YouTube's current chat DOM structure. If YouTube changes it,
  the extension may stop working until updated.
- Uses 7TV's public but undocumented 7tv.io/v3 API — this could change
  or rate-limit without notice.

## Install — Chrome / Edge / Brave (Chromium)

1. Download and unzip 7tv-for-youtube-chrome.zip.
2. Go to chrome://extensions.
3. Enable Developer mode (top right).
4. Click Load unpacked and select the unzipped folder.
5. Open the extension's popup icon to optionally add extra emote sets.

## Install — Firefox

1. Download and unzip 7tv-for-youtube-firefox.zip.
2. Go to about:debugging#/runtime/this-firefox.
3. Click Load Temporary Add-on and select manifest.json inside the
   unzipped folder.
4. Note: temporary add-ons are removed when Firefox restarts. For a
   permanent install, submit the same folder for signing at
   [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
   (unlisted distribution keeps it private, doesn't require public review).

## Adding more emotes

Open the extension popup and paste a 7tv.app emote set link (the URL
must contain /emote-sets/, not /users/) — a channel page, comma-separate
multiple. Put your own personal set last so its names win on conflicts.

## License

MIT — see LICENSE.
