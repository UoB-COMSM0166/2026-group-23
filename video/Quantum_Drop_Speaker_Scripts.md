# Quantum Drop — Demo Video Speaker Scripts (final)

> Group 23 · COMSM0166 · v2.1 · **Total runtime ≈ 2 min 56 s** · 6 speakers (Liu and Li each speak twice)

Each speaker ends with a one-clause handoff so the cuts feel continuous; the next speaker opens by acknowledging the previous one. Numbers in brackets are target read-times — pace yourself against them.

---

## 1 · Yu Chengyin (于承印) · Presentation · ~22 s
**Slide:** Chapter 1 / Presentation · *Meet Quantum Drop*

> "Hi, we're Group 23. This is **Quantum Drop** — a tower-defence built in p5.js, with one twist: between waves you play a **Plinko-style mini-game** to earn your coins. Five sectors, eight towers, ten enemies. **Liu will walk you through what it looks like.**"

---

## 2 · Liu Bowen (刘博文) · Visual material · ~20 s
**Slide:** Chapter 2 / Visual Material

> "**Thanks Yu.** Everything you see is **drawn from code** — no sprite sheets. With six of us, that was the call that kept the cyberpunk look unified. Five sectors, each with its own palette and music. **The design idea behind all this — Zhu?**"

---

## 3 · Zhu Qihao (朱启昊) · Clarity of idea · ~22 s
**Slide:** Chapter 3 / Clarity of Idea

> "**One feedback loop, two genres.** Aim and drop balls through plus / minus / times gates; the count becomes coins; spend on towers; defend the wave; leftover coins carry into the next drop. So a great drop genuinely changes the wave that follows. **Here it is in action.**"

---

## ▶ Slide 5 — Demo voice-over · ~25 s
No on-camera presenter. Voice-over only, kept light so the gameplay carries the slide.

| 0:00 – 0:08 | "Balls bouncing through the gates — every gate adds, subtracts, or multiplies the running count." |
| 0:08 – 0:15 | "Settlement: final ball count becomes coin count, one to one." |
| 0:15 – 0:25 | "Build phase, the wave hits, towers engage. Coins, towers, wave clear — back at the launcher." |

---

## 4 · Zhang Xun (张洵) · Challenge 1 · ~20 s
**Slide:** Chapter 4 / Challenge 1 · *Fair economy, real variance*

> "**Welcome back.** The mini-game is the whole economy — **fair, but not boring**. Up to eighty balls bounce on screen at once; we tune the gate lattice per level so payouts stay within **±25 % of the design target**. **That's the design fight; the engineering fight was different — Zhenyu?**"

---

## 5 · Zhang Zhenyu (张震宇) · Challenge 2 · ~22 s
**Slide:** Chapter 5 / Challenge 2 · *v1.4 → v2.0: three god-files, one sprint*

> "**Right.** By v1.4, three files had grown into **god-classes** and parallel PRs were colliding every week. **One refactor sprint**: pure data into one folder, state into one file, monsters and towers and UI split by concern. Same gameplay before and after — by week 9, **zero merge conflicts**. **Liu, third one's yours.**"

---

## 6 · Liu Bowen (刘博文) · Challenge 3 · ~20 s    ← NEW
**Slide:** Chapter 6 / Challenge 3 · *Drawing with code, not pixels*

> "**Quick callback to chapter two** — that procedural look wasn't the plan. Two weeks in, hand-drawn sprites weren't matching across contributors. We pivoted: every entity drawn from primitives and trig. Cost us a week, but the aesthetic stayed unified the rest of the way. **Zhuolun?**"

---

## 7 · Li Zhuolun (李卓伦) · Process & Future · ~25 s
**Slides:** Chapter 7 / Process & Teamwork → Chapter 8 / Future Work → Closing

> "**Cheers.** Weekly demos, **ten-minute retros**, one owner per module on a trunk-based repo. **Two playtest rounds with strangers** — round one showed the economy loop wasn't readable, so we added the **BALLS → COINS** card and a tutorial; round two got the loop by wave 2. Looking ahead: star ratings, mobile, and long-term — **roguelite meta-progression and two-player co-op**. Thanks for watching."

---

## Time budget

| Segment | Speaker | Length |
|---|---|---:|
| Ch.1 Presentation | Yu Chengyin | 22 s |
| Ch.2 Visual material | Liu Bowen | 20 s |
| Ch.3 Clarity of idea | Zhu Qihao | 22 s |
| Slide 5 demo VO | (voice-over) | 25 s |
| Ch.4 Challenge 1 | Zhang Xun | 20 s |
| Ch.5 Challenge 2 | Zhang Zhenyu | 22 s |
| **Ch.6 Challenge 3** | **Liu Bowen** | **20 s** |
| Ch.7 + Ch.8 Process + Future | Li Zhuolun | 25 s |
| **Total** | | **≈ 2 min 56 s** |

Comfortably inside the 2-3 min window.

---

## Why this rewrite

We added **Challenge 3** because the course mark-sheet has a row called *"Three challenges"* — leaving it at two would have cost us a row of marks. The third challenge (procedural-art pivot) is a strong story: it's *both* a technical decision *and* a teamwork/coordination problem, so it pulls double duty across the rubric.

We also beefed Li Zhuolun's segment with **playtesting** — the *Process & Teamwork* row of the mark-sheet is partly about how the team responded to feedback. Round 1 / round 2 with the BALLS → COINS card is exactly that story.

Other small fixes: Slide 6 title softened (*"Fair economy, real variance"* instead of an engineering count), Slide 1 subtitle has a sharper hook (*"no idle seconds in a tower-defence"*), Slide 11 closing now shows the **real repo URL** instead of a placeholder, and Zhang Xun's spoken handoff no longer demotes Challenge 1 ("design fight" / "engineering fight" instead of "much bigger headache").

---

## Recording checklist

| Item | Done |
|---|---|
| Each speaker rehearses script ≤ 2× before recording | ☐ |
| Single-take handoff drills (1→2, 2→3, etc.) so the connecting clauses don't feel scripted | ☐ |
| Webcam corner overlay for chapters 1, 2, 3, 4, 5, 6, 7+8 | ☐ |
| Stitched gameplay cut (≈ 25 s) replaces the placeholder video on slide 5 | ☐ |
| Final video uploaded; link added to repo `README.md` | ☐ |
| Total runtime checked against 2 min – 3 min window | ☐ |
