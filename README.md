# light

A black, terminal-style music player for your local MP3 files. Pick a folder once, then drive everything from the keyboard. Built with Electron for Windows.

Home:
<img width="1920" height="1038" alt="image" src="https://github.com/user-attachments/assets/12ef1307-910f-42b6-988a-018a39962377" />

Visualisers:
<img width="1168" height="655" alt="image" src="https://github.com/user-attachments/assets/589d9383-5b5f-4d6f-b245-271d3685b4d1" />
<img width="1171" height="651" alt="image" src="https://github.com/user-attachments/assets/87e54335-3d26-4a41-a896-859283213497" />
and 8 more....

Stats:
<img width="1920" height="1038" alt="image" src="https://github.com/user-attachments/assets/8d033c47-170c-4b08-beb2-578e076531fa" />

Player:
<img width="1920" height="1038" alt="image" src="https://github.com/user-attachments/assets/dc074b91-a20c-440c-bc67-a3da4a17c501" />


<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the next line -->
<!-- ![light](docs/screenshot.png) -->

## Download

Get the Windows installer from the [latest release](https://github.com/emsuregot/light/releases/latest): download `Light.Setup.1.2.0.exe` and run it.

Windows may show a "Windows protected your PC" screen because the installer is not code-signed. Click **More info**, then **Run anyway**.

SHA-256 of `Light.Setup.1.2.0.exe`:

```
sha256:66b4c1d6b613a6a3f581a51136d56232d4b1d89276ad7b1fd31c25ee106f450f
```

## Features

- Playlist from any folder (subfolders included), with shuffle and repeat (off / all / one)
- Album covers and full track details read from the file tags: title, artist, album, year, genre, track, codec, bitrate, sample rate, size
- Ten visualizers: bars, waveform, matrix, radial, spectrogram, particles, joy (ridgelines), tunnel, stars, radar
- Fullscreen visualizer mode
- Crossfade between tracks, with the next track preloaded
- Monochrome home screen with a pulsing icon, recent and most played tracks
- Listening stats: totals, last 7 days, top tracks and artists
- Four color themes: green, amber, cyan, white
- Search, remembers your folder, volume and settings
- Optional: download audio from a link to mp3 (see below)
- No mouse needed

## Run it

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm start
```

Build a Windows installer (output goes to `dist/`):

```bash
npm run dist
```


## First launch

Press **Enter** on the home screen, then **O** and choose the folder with your music. It is remembered next time.

## Download audio from a link (optional)

<img width="1920" height="1038" alt="image" src="https://github.com/user-attachments/assets/ff791751-6d79-4803-a906-216477ec770f" />


Press **d**, paste a link with `Ctrl+V`, press **Enter**. Light saves an mp3 (best quality) with tags and cover art into your music folder and adds it to the playlist.

- **Single song:** saved as `Title.mp3` in your music folder.
- **Playlist:** paste a playlist link and press Enter, or paste a song link that is inside a playlist and press **p** for the whole playlist. Songs go into a folder named after the playlist, numbered like `001 - Title.mp3`. Songs that fail are skipped.
- **Cookies:** Light uses your Firefox cookies by default, which avoids most "sign in / not a bot" blocks. Press **Tab** in the download screen to switch to Chrome, Edge, Brave or no cookies. If the chosen browser fails, Light automatically retries without cookies.
- **Update:** if downloads stop working, open the download screen with an empty link and press **u** to update yt-dlp.

This needs two free tools that are **not** bundled:

1. [yt-dlp](https://github.com/yt-dlp/yt-dlp/releases) (`yt-dlp.exe`)
2. [ffmpeg](https://ffmpeg.org/download.html) (`ffmpeg.exe`, from a Windows build)

Press **d**, then **b** to open the folder Light looks in, and drop both `.exe` files there. Or install them so they are on your `PATH` (for example `winget install yt-dlp.yt-dlp` and `winget install Gyan.FFmpeg`).

**Only download content you have the right to**: your own uploads, Creative Commons or public domain material, or content with the owner's permission. Downloading from YouTube is restricted by its Terms of Service, and you are responsible for how you use this feature.

## Keys

| Key | Action |
|---|---|
| `↑` `↓` / `j` `k` | move cursor |
| `PgUp` `PgDn` | move 10 |
| `Home` `End` / `g` `G` | first / last |
| `Enter` | play selected |
| `Space` | play / pause |
| `n` / `p` | next / previous |
| `←` `→` | seek 5 s (`Shift` = 30 s) |
| `+` `-` | volume |
| `m` | mute |
| `s` | shuffle |
| `r` | repeat: off / all / one |
| `x` | crossfade: off / 2 / 4 / 6 / 8 / 12 s |
| `v` / `V` | next / previous visualizer |
| `1`-`9`, `0` | pick a visualizer |
| `f` | fullscreen visualizer |
| `i` | listening stats |
| `d` | download audio from a link |
| `t` | color theme |
| `/` | search the playlist (`Esc` clears) |
| `o` | open music folder |
| `Tab` | home screen |
| `h` / `?` | help |

## Notes

- Playback formats: mp3, m4a, flac, wav, ogg, opus, aac.
- Listening stats and settings are stored locally in the app's data folder. Nothing is sent anywhere.

## Project layout

```
main.js       Electron main process: folder scan, tag reading, file loading
preload.js    safe bridge between main and the page
index.html    the whole UI, audio engine and visualizers
icon.png/.ico app icon
home.jpg     artwork shown on the home screen
```

## License

Code is MIT licensed, see [LICENSE](LICENSE). The app icon artwork is not covered by this license: it belongs to its original artist.
