# Head-only character portraits

Edited with the built-in image generation tool on 2026-10-21. Source portraits are the existing project assets; the replacements retain transparent backgrounds.

Assets: `yunhwan-face.png`, `jongryeong-face.png`, `ajae-face.png`, `sleepy-face.png`, `hyde-face.png`, `jekyll-hyde-face.png`, `percival-face.png`, `adam-face.png`, `minhee-serve.png` (repository root).

Prompt set: remove neck and shoulders below the natural jaw, preserve the original face identity, expression, angle, hair, glasses, photographic texture and transparency. Preserve the monochrome/color split and scars for Jekyll/Hyde. For the serve portrait also remove the blue background and shirt. Keep the full head uncropped; do not beautify or redesign.

`HEAD_FITS` in `index.html` sets image-specific size and chin anchors for these cutouts, including the alternate Hyde and serve images. The shared game and fitting-room head pivots now sit at the collar: every photo face connects to the torso in the same place during idle poses, swings and victory animations. A removed Smashman photo reference was also cleared so the original drawn face remains visible.

Verification: rendered every character's outfit preview plus serve, swing and victory poses, with no page errors. Gameplay and account testing are left to the user.
