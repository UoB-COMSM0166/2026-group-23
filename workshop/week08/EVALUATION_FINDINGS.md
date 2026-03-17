# User Evaluation Findings — Quantum Drop

**Module:** Games Development Project  
**Evaluation period:** [Insert dates]  
**Total participants:** 12 (6 × Condition A, 6 × Condition B)  
**Evaluators:** [Insert team names]

---

## 1. Study Design

### 1.1 Objective

The evaluation aimed to assess three dimensions of the Quantum Drop experience:

- **Learnability** — how quickly new players can understand and operate the core game loop
- **Usability** — ease and efficiency of the interface (menus, tower placement, upgrade system)
- **Engagement / fun** — subjective enjoyment, challenge balance, and desire to continue playing

### 1.2 Counterbalancing

A **within-subjects, counterbalanced design** was used to control for learning effects. Participants were randomly assigned to one of two conditions:

| Condition | Order | n |
|-----------|-------|---|
| A | Easy difficulty first → Difficult difficulty second | 6 |
| B | Difficult difficulty first → Easy difficulty second | 6 |

Counterbalancing ensures that any improvement in performance on the second session can be attributed to learning the game mechanics rather than systematically favouring one difficulty level. Without it, a design that always presents Easy before Difficult would conflate "game is easier" with "player has already learned the controls."

### 1.3 Tasks

Each participant completed five observed tasks per condition:

| ID | Task |
|----|------|
| T1 | Navigate to the correct level and start the game |
| T2 | Place at least three towers before wave 1 begins |
| T3 | Upgrade one existing tower |
| T4 | Complete (or attempt) the assigned level |
| T5 | Navigate to the contrasting level and start |

### 1.4 Measures

| Measure | Instrument | Items |
|---------|-----------|-------|
| Usability | System Usability Scale (SUS) | 10 Likert items (1–5) |
| Fun / Engagement | Custom GEQ-inspired scale | 5 Likert items (1–5) |
| Recommendation | Net Promoter Score (NPS) | Single 0–10 item |
| Learnability | Task completion time (T1, T2, T3) | Seconds |
| Error rate | Observer count of misclicks / wrong navigations | Count |
| Qualitative | Open questions Q1–Q3 | Free text |

---

## 2. Participants

| # | Age | Gaming freq. | TD experience | Condition |
|---|-----|-------------|---------------|-----------|
| P01 | 21 | Daily | Experienced | A |
| P02 | 19 | Weekly | Some | B |
| P03 | 22 | Weekly | None | A |
| P04 | 20 | Daily | Some | B |
| P05 | 23 | Monthly | None | A |
| P06 | 21 | Rarely | None | B |
| P07 | 24 | Daily | Experienced | A |
| P08 | 20 | Weekly | Some | B |
| P09 | 22 | Monthly | None | A |
| P10 | 19 | Daily | Experienced | B |
| P11 | 21 | Weekly | Some | A |
| P12 | 23 | Rarely | None | B |

> **Note:** Replace placeholder data above with real participant data after conducting sessions. All participants gave informed verbal consent. No personally identifying data was recorded.

---

## 3. Quantitative Results

### 3.1 SUS Scores

SUS is scored on a 0–100 scale. Scores ≥ 68 are considered above average; ≥ 80.3 is "Excellent."

**Scoring formula:** For odd items (U1,U3,U5,U7,U9): `score = response − 1`. For even items (U2,U4,U6,U8,U10): `score = 5 − response`. Sum all 10 converted scores × 2.5.

| Participant | Condition | SUS Score |
|-------------|-----------|-----------|
| P01 | A | 82.5 |
| P02 | B | 70.0 |
| P03 | A | 75.0 |
| P04 | B | 77.5 |
| P05 | A | 65.0 |
| P06 | B | 62.5 |
| P07 | A | 87.5 |
| P08 | B | 72.5 |
| P09 | A | 67.5 |
| P10 | B | 80.0 |
| P11 | A | 72.5 |
| P12 | B | 60.0 |
| **Mean** | | **72.7** |
| **SD** | | **8.4** |

> A mean SUS of **72.7** falls in the **"Good"** band (Bangor et al., 2009). This indicates the interface is broadly usable, though the two participants who scored below 68 (P06, P12) both belonged to Condition B (Difficult first) and reported being disoriented by the high initial challenge.

**Condition comparison:**

| Condition | Mean SUS | SD |
|-----------|----------|----|
| A (Easy→Difficult) | 75.0 | 8.3 |
| B (Difficult→Easy) | 70.4 | 7.9 |

The 4.6-point difference suggests a modest learning effect: players who started on Easy had already internalised the interface when they encountered the harder level, producing slightly higher usability ratings overall.

---

### 3.2 Fun & Engagement Scores

Mean scores per item (1–5 scale):

| Item | Statement | Mean | SD |
|------|-----------|------|----|
| F1 | I found the game enjoyable | 4.1 | 0.7 |
| F2 | I felt engaged while playing | 3.9 | 0.8 |
| F3 | The difficulty felt appropriately challenging | 3.4 | 1.0 |
| F4 | I wanted to keep playing after the session | 3.7 | 0.9 |
| F5 | The visual style made the game more immersive | 4.3 | 0.6 |

**Composite fun score (mean of F1–F5):** **3.88 / 5.00**

F5 received the highest rating, indicating the sci-fi visual design was a standout strength. F3 (difficulty balance) showed the most variance (SD = 1.0), reflecting the divergent experiences between conditions and experience levels.

---

### 3.3 Net Promoter Score

| Score range | Label | Count |
|-------------|-------|-------|
| 9–10 | Promoters | 5 |
| 7–8 | Passives | 4 |
| 0–6 | Detractors | 3 |

**NPS = % Promoters − % Detractors = 41.7% − 25.0% = +16.7**

An NPS of +17 is positive for a student prototype. For context, typical commercial games aim for +30 to +50. The detractors were predominantly inexperienced players (None TD experience) who found the minigame mechanic unintuitive without a tutorial.

---

### 3.4 Task Performance

Mean task completion times (seconds):

| Task | Mean time (s) | SD | Notes |
|------|--------------|-----|-------|
| T1 — Navigate & start | 18.3 | 9.1 | Condition B 31% slower on first attempt |
| T2 — Place 3 towers | 42.7 | 14.2 | No significant difference by condition |
| T3 — Upgrade tower | 28.1 | 12.8 | Higher error rate for players with no TD experience |
| T4 — Complete level | — | — | Pass rate: 100% Easy, 58% Difficult |
| T5 — Switch level | 11.4 | 5.2 | Much faster on second navigation (learning effect) |

**Error counts (navigation / misclicks):**

| Condition | Mean errors (T1–T3) |
|-----------|---------------------|
| A | 1.3 |
| B | 2.8 |

This confirms the learning effect hypothesis: players starting on Difficult made over twice as many errors on early tasks, supporting the choice to default players to Easy first.

---

## 4. Qualitative Findings

### 4.1 Thematic Summary

Open responses (Q1–Q3) were coded into themes. Frequency = number of participants raising that theme.

| Theme | Freq | Representative quote |
|-------|------|---------------------|
| **Positive: Visual design** | 9/12 | *"The space map and planet animations look really cool"* |
| **Positive: Tower variety** | 7/12 | *"Lots of tower types to experiment with"* |
| **Positive: Satisfying progression** | 6/12 | *"Beating a wave feels rewarding"* |
| **Negative: Minigame unclear** | 5/12 | *"I didn't understand what the gate numbers meant"* |
| **Negative: No tutorial** | 4/12 | *"Wasn't sure what to do first"* |
| **Negative: Difficulty spike** | 3/12 | *"Level 3 felt like a wall compared to Level 1"* |
| **Suggestion: Tower tooltips** | 4/12 | *"Would be helpful to see what each tower does before buying"* |
| **Suggestion: Undo placement** | 3/12 | *"Placed a tower wrong and couldn't move it"* |

### 4.2 Key Insights

**Strength — Visual polish:** The sci-fi aesthetic (3D star map, planet animations, particle effects) was consistently praised and contributed to high F5 scores. This was the single most mentioned positive across both conditions.

**Weakness — Minigame onboarding:** Five participants did not understand the ball-drop minigame operator gates on first encounter. This is a significant learnability issue and the most actionable finding.

**Weakness — No tutorial:** Four participants expressed a desire for some form of guided first-play. This disproportionately affected inexperienced players and drove the lower SUS scores in Condition B.

**Condition effect confirmed:** Condition B (Difficult first) produced more errors, lower SUS scores, and more frustration-themed open responses. This validates the counterbalanced design and suggests the default game flow (Easy → Difficult) is appropriate.

---

## 5. Discussion

### 5.1 Interpretation

The overall evaluation paints a positive picture for a prototype: a SUS of 72.7, a composite fun score of 3.88/5, and a positive NPS of +17 all indicate the game is broadly enjoyable and usable. The visual design is a clear asset.

The primary areas for improvement cluster around **new-player onboarding**. The minigame and the first-time player experience lack sufficient affordances. This is a common challenge in complex games but is addressable through targeted design changes.

### 5.2 Limitations

- **Sample size:** 12 participants is adequate for a student project but too small to draw statistically significant conclusions. Effect sizes should be interpreted as indicative only.
- **Sample composition:** Participants were primarily university-age; findings may not generalise to broader populations.
- **Demand characteristics:** Participants knew this was a student project, which may have inflated positive scores.
- **Single-session measurement:** Learnability data reflects only the first exposure; longitudinal learning curves were not measured.

### 5.3 Recommended Design Changes

| Priority | Change | Rationale |
|----------|--------|-----------|
| High | Add a brief minigame tutorial overlay on first encounter | 5/12 participants confused by gates |
| High | Add tower tooltip on hover (name, range, damage, cost) | 4/12 requested this explicitly |
| Medium | Soften Easy→Difficult progression curve | Difficulty spike noted by 3/12 |
| Medium | Add tower relocation / sell-and-replace shortcut | 3/12 requested undo functionality |
| Low | Add a short animated first-play guide (≤ 30 seconds) | 4/12 wanted clearer first steps |

---

## 6. References

- Bangor, A., Kortum, P., & Miller, J. (2009). Determining what individual SUS scores mean: Adding an adjective rating scale. *Journal of Usability Studies, 4*(3), 114–123.
- Brooke, J. (1996). SUS: A 'quick and dirty' usability scale. In P. Jordan, B. Thomas, & B. Weerdmeester (Eds.), *Usability Evaluation in Industry*. Taylor & Francis.
- IJsselsteijn, W., de Kort, Y., Poels, K., Jurgelionis, A., & Bellotti, F. (2007). Characterising and measuring user experiences in digital games. *International Conference on Advances in Computer Entertainment Technology.*

---

*Document prepared for repository submission. Replace all placeholder data with real participant results before final submission.*
