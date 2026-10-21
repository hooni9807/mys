# SPP — Snap Ping Pong prologue

## Gameplay preview (2026-10-21)

The introduction renders Casanova Yun and Jongryeong with the same `person`, `withFit`, `racket`, `project`, `arenaBg`, and `drawTable` code used by the game. Yun wears the arcade outfit; Jongryeong wears the club outfit. No external character art or video is embedded.

`prologue-match.js` choreographs a continuous exhibition rally: a service toss and two service bounces, then alternating drives/backhands and periodic smashes. Ball endpoints use the real arm-length-clamped racket position via the renderer's non-drawing `measureOnly` argument. Characters shuffle and recover between strokes. The counter is a demo rally count; 08–08 is a decorative exhibition scoreboard, not a live ranked match.

The preview has its own canvas and temporary render state, restored in `finally`. It never starts a game or updates rankings, inventory, score, auth, or saves. Rendering of the covered main court is suspended while the dialog is open. Existing login/entry behavior is retained.

SPP, Snap Ping Pong, the headline, score overlay, chapter copy, footer and color palette now use a consistent dark violet / lime treatment. The inline first-paint guard remains in place. Motion can be paused or replayed; hidden tabs stop animation. Reduced-motion users see a static rally frame, including after images finish loading.

## References

- [PingSkills — Forehand & Backhand Counterhit (YouTube)](https://www.youtube.com/watch?v=iYRJ2YV3PGY): alternating rally rhythm and stroke variety, consulted via the video's indexed description.
- [ITTF Education — Footwork and balance](https://www.ittfeducation.com/joze-urh-impact-footwork-balance-making-contact-ball/): coordination of foot positioning, balance, and contact.
- [web.dev — Animation and motion](https://web.dev/learn/accessibility/motion): reduced-motion and explicit pause controls.

These are movement and accessibility references, not copied assets. The demo is choreographed using game renderers rather than a recording or an autonomous competitive match.

## Verification

Run from the repository root with Playwright installed:

```sh
node tests/prologue-preview.cjs
```

`PLAYWRIGHT_MODULE` can point to an existing Playwright installation; `CHROME_PATH` optionally selects an installed browser. The smoke check covers desktop/mobile width, exact rally contact counters, restored game state, no page errors, reduced motion and entering the main screen. It blocks external requests and does not test Google login or multiplayer. Visual captures were also inspected at service, contact and follow-through.
