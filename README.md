# Crosscourt Sports Club - landing page

Plain HTML/CSS/JS (GSAP + Lenis vendored in `vendor/`).
Open `index.html`, or serve the folder (`npx serve .`) for best results.

## Leo Cal (booking)

Booking is Leo Cal's, as a drop-in: the site only carries its snippet, and Leo Cal draws everything. The
`embed.js` script in each page's `<head>` loads it from `cal.turfleo.com`:

- **The hero card** is `<div class="bk-leo" data-leo-cal-inline>` in `#bookCard`. Leo Cal fills it with its booking card
  (branch, sport, court, date, duration, free times, price), and "Confirm & Pay" opens its pop-up for the visitor's
  details and the payment. Where the card sits, its width and its shadow are this site's CSS (`.booking`, `.bk-leo`).
- **Every "Book a court" link** has `data-leo-cal` and opens Leo Cal's pop-up: the full booking panel on a desktop,
  the whole screen on a phone. `data-sport="Tennis"` opens it on that sport, matched to Leo Cal's sports by name
  (`cricket` → "Box Cricket"). The hero button and the phone bar follow the carousel's sport.
- **The card follows the carousel too** (`CARD_FOLLOWS_SLIDES` in `js/main.js`; `false` leaves it on Leo Cal's own
  default): each slide sets the card's `data-sport`. Once the visitor picks a sport in the card themselves, Leo Cal stops
  following and fires `leo-cal:change`; the carousel then goes to that sport's slide and stops advancing.
- **Phones** don't get the card over the hero (`.bk-leo` is hidden under 900px, and Leo Cal doesn't load it there);
  the lime "Tap to book" bar (`.bk-toggle`) opens the pop-up instead.
- While the pop-up is open the page holds still: Leo Cal fires `leo-cal:open` / `leo-cal:close` on `window`, and
  `js/main.js` / `js/shell.js` stop Lenis, the carousel and the hero video in between. `leo-cal:booked` fires on a
  confirmed booking, for analytics.

How it looks and what it offers (branches, courts, durations, prices, peak hours, two weeks of dates) is changed in
Leo Cal and the club's dashboard, not here.

The pages only carry the placeholder `data-key="gxp_YOUR_KEY"`, so the real key never goes into git. The one build step,
`node tools/build.mjs`, copies the site to `dist/` (gitignored) with the key from the `LEO_CAL_KEY` env var filled in;
Vercel runs it and serves `dist/` (`vercel.json`).

- Vercel: Project → Settings → Environment Variables → `LEO_CAL_KEY` (Production + Preview), then redeploy.
- Local: put `LEO_CAL_KEY=gxp_…` in `.env.local` (gitignored), then `node tools/build.mjs && npx serve dist`.
  Opening the source pages directly still works, but the booking card stays empty (placeholder key).

The key still reaches every visitor's browser, so it is not a secret: what protects it is the allowed origins for the key
in Leo Cal. The API only answers websites on that list, so add the production domain there, plus localhost / preview
domains if you test on them — otherwise the booking card shows "Couldn't reach the booking system".

## Hero videos (14s per sport)

Drop MP4s here and they fade in over the placeholder scene automatically:

```
assets/video/tennis.mp4
assets/video/pickleball.mp4
assets/video/cricket.mp4
assets/video/football.mp4
assets/video/swimming.mp4
```

Tips: 16:9, ~14s, H.264, no audio, under ~6 MB each (1080p, ~3 Mbps) so they load fast.
A slide with a video stays as long as the video lasts (any length); `SLIDE_SECONDS` only sets how long slides WITHOUT a video stay. Change it at the top of `js/main.js`.

## Photos (`assets/img/`)

Hero slides use the drawn placeholder scenes (or your videos, see above). Photos appear in the sections below:

- `tennis.jpg`, `pickleball.jpg`, `football.jpg`, `track.jpg` → Facilities cards (shown uncropped, caption as a bottom-gradient overlay)
- `gameready.jpg` → Coaching band
- `court-aerial.jpg` (rotated landscape) / `court-aerial-portrait.jpg` (phones) → pinned story section

To put a photo on a hero slide later, set `img` / `pos` on that sport in `SPORTS` (`js/main.js`).

## Story section

`#story` is pinned for ~4 screens of scroll: the four lines fade in one by one, then the frame zooms through and fades out
with echo frames trailing it. Change the words in `index.html` (`.st` lines); timing is in `js/main.js` ("Story").

## Fonts

Bricolage Grotesque (display), Manrope (UI), DM Sans (text), Pinyon Script (story script lines) - loaded from Google Fonts, so the page needs internet.

## Ribbon section (`#ribbon`)

Pinned, scroll-scrubbed: gradient ribbon loops behind/in front of the athlete → tip swells → lime floods the window → copy fades in → page scrolls on.

- `js/ribbon.js` (+ `css/ribbon.css`) - self-contained; ribbon is drawn on canvas in a 1600×900 "design space" that the athlete image is placed in.
- Images: `assets/img/athlete.webp` (transparent cut-out) and `assets/img/athlete-bg.jpg`. If you swap the athlete, update the `<image>` x/y/width/height in `index.html` and the ribbon control points in `controlPoints()`.
- Speed: `end: '+=900%'` in `js/ribbon.js` (bigger = slower). Phase timings are in `render()`.
- Tuning: open `index.html?ribp=0.6` to freeze the section at 60%.

## Gallery page (`gallery.html`)

Hero → Facilities (photo tiles) → Premium → Moments (masonry) → Why Crosscourt (stats) → About the founder (last). Styles `css/gallery.css`, script `js/gallery.js` (reveals, counters, lightbox over every `[data-lb]` photo).
Photos: `assets/img/venue/` (cut from the venue shoot), `assets/img/moments/`, `assets/img/founder.webp`.
**Founder section copy is generic placeholder** (no name/quote supplied) — see the TODO in `gallery.html`. The tournaments page keeps its own "Moments" gallery.

## Menu photos

Each menu link has `data-scene` (a key) and `data-img` (its photo in `assets/img/menu/`, 16:10). Hovering a link fades its photo in on the right (`js/main.js` / `js/shell.js`). To change one, replace the file or the `data-img` on that link (both pages have the menu).
The photos were cut from the venue shoot (`XCS Venue images`; the `.dng` RAWs need `rawpy` to convert).

## Sports list (8)

Tennis, Pickleball, Swimming, Gym, Table Tennis, Box Cricket, Football, Foosball.
- Carousel slides = the 5 entries in `SPORTS` (`js/main.js`) without `extra: true` (they have hero media).
- Gym / Table Tennis / Foosball are `extra: true`: no carousel slide (no hero photo/video yet — add one, drop `extra`, and it becomes a slide), but their Facilities links still book them.
- What can be booked — courts, hours, durations, prices — comes from Leo Cal. A slide's or a link's `data-sport` is matched to Leo Cal's sport by name (`cricket` → "Box Cricket"); a sport Leo Cal doesn't offer opens on its first one.
- Tournaments page still lists 6 competitive sports (no gym / foosball events yet).

## Branches

Leo Cal's: its card and pop-up have a branch picker, with each branch's distance once the visitor's location is known.
They open on the branch nearest the visitor, so long as two or more branches have a **map position** in the dashboard
(Settings → Branches → a branch → Map position; on Google Maps, right-click the branch and copy the first line of the
menu). Gandipet's old position here was approximately `17.392, 78.318`.

Leo Cal asks for location when its pop-up opens, or on the first tap on the hero card — never on page load — and uses it
straight away if the visitor already allowed it. Until then, or if it's refused, the first branch that can take a payment
is used; the branch menu also has "Find my nearest branch". A branch picked by hand wins and is kept for the visit,
across pages, and so does `data-branch="Gandipet"` on the card's div or a link.

Note: nothing on the page may use `id="book"` (the hero card is `#bookCard`) — a native anchor jump into the overflow-hidden hero breaks its layout. `index.html#book` (from another site) opens Leo Cal's pop-up.

## Tournaments hero video

`tournaments.html` hero plays `assets/video/tournaments-hero.mp4` on loop (1080p re-encode of the 720p original `gemini_generated_video_75a98830.mp4` - lanczos upscale + light sharpen/denoise so the browser doesn't have to stretch it) (`js/vhero.js`). It tries to start with sound; browsers usually block that on a first visit, so it starts muted and unmutes on the visitor's first click / tap / key press (button bottom-right toggles it). It pauses when scrolled out of view.

## 3D trophy (currently unused)

Not loaded by any page right now (it was the tournaments hero before the video). Real-time three.js render (chrome cup, gold band/star, glass plinth, studio reflections) in `#trophyCv`. The old SVG trophy stays in the markup as a no-WebGL fallback.
- Source: `js/src/trophy3d.src.js` → bundled to `vendor/trophy3d.min.js` (single file, works from `file://`).
- Rebuild: `npm i three esbuild`, then `esbuild js/src/trophy3d.src.js --bundle --minify --format=iife --target=es2019 --outfile=vendor/trophy3d.min.js`.
- Look is tuned in the file: `silver` / `gold` materials, the `studio()` environment (softboxes/flags = the reflections), cup shape in `cupR()`.

## Things to confirm with the club

- **Leo Cal setup** - branches, courts, durations, prices and peak hours all come from the club's Leo Cal account; the site's domains must be in the key's allowed origins.
- Dummy copy: Facilities, Why Crosscourt, Membership blurbs, promo-card text, footer email.

## Structure

- `js/scenes.js` - procedural SVG placeholder scenes
- `js/main.js` - carousel, menu, scroll reveals (the booking card is Leo Cal's)
- `css/styles.css` - all styling (tokens at top)
#   x c o u r t w e b 
 
 

## Tournaments page (`tournaments.html`)

Linked from the menu on both pages. Files: `css/tournaments.css`, `js/tournaments.js`, `js/shell.js` (shared menu/nav/smooth-scroll), `js/badges.js` (enamel + gold sport badges).

- **Trophy story** - pinned for ~6 screens: spotlight → glass/chrome trophy → "Do you have what it takes to be a champion?" → the six sport badges fly in. Timings are in the `tl` timeline in `js/tournaments.js`; the trophy is inline SVG in the page.
- **Upcoming / Ongoing** - *sample data* at the top of `js/tournaments.js` (`UPCOMING`, `LIVE`). Dates are generated relative to today. Replace with real fixtures / an API.
- **Account** - a demo: the profile, registrations and badges are saved in this browser's `localStorage` only (no server, no password). Registering opens a form and confirms over WhatsApp (`+91 80197 65511`) - hook the club's real API in the `regF` submit handler.
- **Moments** - gallery from `assets/img/` with a lightbox; edit the `SHOTS` list.

## Adding hero videos (same quality settings for all)

```
python tools/enhance-video.py path/to/original.mp4 tennis      # or pickleball / cricket / football / swimming
```

Writes `assets/video/<sport>.mp4` (centre-cropped to 1920x1080, very light denoise + sharpen, source frame rate kept, full length kept (`--trim N` cuts to the first N seconds), small contrast/saturation lift, H.264 CRF 18 capped at 9 Mbps, audio kept, fast-start). The original is never touched. Needs ffmpeg (`pip install imageio-ffmpeg` is enough). Standard settings live at the top of the script.

The hero overlay (`.hero-shade` in `css/styles.css`) is shared by every slide, so new videos automatically get the same light overlay. Sound is on by default; browsers only allow that after the visitor's first click/tap/key press, so until then the clip plays muted. The speaker button next to the arrows toggles it.
