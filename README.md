# light

A black, terminal-style music player for your local mp3 files. Pick a folder once, then drive everything from the keyboard. Built with Electron for Windows.

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the next line -->
<!-- ![light](docs/screenshot.png) -->

## Download

Get the Windows installer from the [latest release](https://github.com/emsuregot/light/releases/latest): download `Light_Setup_1_1_0.exe` and run it.

Windows may show a "Windows protected your PC" screen because the installer is not code-signed. Click **More info**, then **Run anyway**.

SHA-256 of `Light_Setup_1_1_0.exe`:

```
0b8c2ac3754126b5dfd367b6750c29304a62fe29cc2aab814e64b78e9c7ddeb0
```

## Features

- Playlist from any folder (subfolders included), with shuffle and repeat (off / all / one)
- Album covers and full track details read from the file tags: title, artist, album, year, genre, track, codec, bitrate, sample rate, size
- Six visualizers: bars, waveform, matrix, radial, spectrogram, particles
- Fullscreen visualizer mode
- Crossfade between tracks, with the next track preloaded
- Monochrome home screen with a pulsing icon, recent and most played tracks
- Listening stats: totals, last 7 days, top tracks and artists
- Four color themes: green, amber, cyan, white
- Search, remembers your folder, volume and settings
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

Pushing a tag such as `v1.1.0` also builds the installer on GitHub Actions and attaches it to a release.

## First launch

Press **Enter** on the home screen, then **O** and choose the folder with your music. It is remembered next time.

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
| `v` or `1`-`6` | visualizer |
| `f` | fullscreen visualizer |
| `i` | listening stats |
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
