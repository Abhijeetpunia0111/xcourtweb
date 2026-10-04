#!/usr/bin/env python3
"""
Prepare a hero-banner video with the site's standard quality settings.

    python tools/enhance-video.py <input.mp4> <sport> [--trim SECONDS] [--restore]

<sport> is one of: tennis, pickleball, cricket, football, swimming
The result is written to assets/video/<sport>.mp4 (the file the home hero carousel looks for).
The input file is never modified.

What it does (same settings for every video, so all banner clips look consistent):
  - scales + centre-crops to exactly 1920x1080 (Lanczos). Ultra-wide footage loses its far left/right edges, which the
    page would crop on a normal screen anyway; 1080p also decodes smoothly on every laptop (ultra-wide is much heavier).
  - keeps the clip's full length (the carousel shows each slide for as long as its video lasts). Optional --trim 12
    keeps only the first 12 seconds.
  - very light denoise + gentle sharpen
  - keeps the source frame rate (no forced 24 fps: converting 30 fps to 24 fps makes motion judder)
  - tiny contrast + saturation lift
  - H.264 High profile, CRF 18 capped at 9 Mbps (smooth streaming), slow preset, keyframe every ~2 s, faststart
  - keeps the audio track (AAC 192 kbps) because the hero plays with sound by default

--restore is for soft / low-resolution / blocky sources (e.g. a 480p clip upscaled to 1080p): it adds a deblock,
a stronger denoise and a firmer sharpen (and a 6 Mbps cap, since soft footage needs fewer bits). It cannot invent detail that was never filmed, but it removes the blocky
compression noise and makes edges crisper. Use a better source file if you have one.

Needs ffmpeg: either on PATH, or `pip install imageio-ffmpeg` (used automatically if ffmpeg is not found).
"""
import os, shutil, subprocess, sys

SPORTS = {"tennis", "pickleball", "cricket", "football", "swimming"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- the standard settings (edit here to change them for every future video) ----
WIDTH, HEIGHT = 1920, 1080
CRF = "18"                 # lower = better quality / bigger file
MAXRATE, BUFSIZE = "9M", "18M"   # bitrate ceiling so the clip streams without stalling
PRESET = "slow"
GOP = "48"                 # keyframe interval (frames): quick start, quick loop
RESTORE_FILTERS = ",".join([
    f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos",
    f"crop={WIDTH}:{HEIGHT}",
    "deblock=filter=weak:block=8",
    "hqdn3d=2.5:2:6:5",
    "cas=0.6",
    "unsharp=5:5:0.5:5:5:0.0",
    "eq=contrast=1.05:saturation=1.1",
    "format=yuv420p",
])
VIDEO_FILTERS = ",".join([
    f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos",
    f"crop={WIDTH}:{HEIGHT}",
    "hqdn3d=0.8:0.6:3:2.5",             # very light denoise
    "unsharp=5:5:0.45:5:5:0.0",         # gentle luma sharpen
    "eq=contrast=1.04:saturation=1.08",  # subtle lift
    "format=yuv420p",
])


def find_ffmpeg():
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg not found. Install it, or run: pip install imageio-ffmpeg")


def main():
    args, trim = sys.argv[1:], None
    restore = "--restore" in args
    args = [a for a in args if a != "--restore"]
    if "--trim" in args:
        k = args.index("--trim")
        try:
            trim = float(args[k + 1])
        except (IndexError, ValueError):
            sys.exit("--trim needs a number of seconds")
        del args[k:k + 2]
    if len(args) != 2 or args[1] not in SPORTS:
        sys.exit(__doc__)
    src, sport = os.path.abspath(args[0]), args[1]
    if not os.path.isfile(src):
        sys.exit(f"input not found: {src}")
    out_dir = os.path.join(ROOT, "assets", "video")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, sport + ".mp4")
    if os.path.exists(out) and os.path.samefile(src, out):
        sys.exit("the input is already assets/video/%s.mp4; give the original file instead" % sport)

    cmd = [find_ffmpeg(), "-y", "-hide_banner", "-loglevel", "error", "-stats", "-i", src]
    if trim:
        cmd += ["-t", str(trim)]
    cmd += ["-vf", RESTORE_FILTERS if restore else VIDEO_FILTERS,
           "-c:v", "libx264", "-profile:v", "high", "-level", "4.1", "-preset", PRESET, "-crf", CRF,
           "-maxrate", "6M" if restore else MAXRATE, "-bufsize", "12M" if restore else BUFSIZE, "-g", GOP, "-bf", "2",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-movflags", "+faststart", out]
    subprocess.run(cmd, check=True)
    print(f"\nwrote {out}  ({os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
