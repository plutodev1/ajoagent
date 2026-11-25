# Demo video script

Two cuts from mostly the same footage. Shoot once, edit twice.

- **Kiroween** (4 Dec) — judges want to see how Kiro was used. Section C is Kiro.
- **Celo AOFB** (7 Dec) — judges want the stablecoin corridor. Section C is the swap detail.

Target 3:00. Record at 1080p. **Terminal font size up to ~18pt** — judges watch on laptops and
hashes are unreadable at normal size.

---

## What to capture (do this before writing voiceover)

Record these as separate clips so you can cut freely:

1. **Terminal: `ajo status`** before payment — shows members pending
2. **Terminal: `ajo sync`** — contributions being credited as they land
3. **Terminal: `ajo payout`** — the live run. **This is your money shot.** Let it play out
   in real time: quote → approve → swap → settle → pay → rotate
4. **Celoscan**: the payout transaction page, scrolled to show the cNGN transfer
5. **Celoscan**: the input-data tab showing the attribution tag suffix
6. **8004scan**: https://8004scan.io/agents/celo/10105
7. **Dashboard**: https://ajoagent-dashboard.vercel.app — scroll slowly, top to bottom
8. **Kiro**: the spec files, and `tasks.md` with tasks checking off
9. **Phone**: dashboard on an actual phone screen, if you can

---

## A. Open — the problem (0:00–0:30)

**On screen:** You, talking. Or a photo of a real Ajo exercise book if you have one.

> "In Nigeria, millions of people save money in Ajo — esusu. Every week a group puts in a
> fixed amount, and each week one person takes the whole pot. My mother's traders' group
> runs one. It works on trust, and it's recorded in an exercise book.
>
> And it breaks the same way every time: somebody has to hold the money. When the organiser
> is careless, or just unlucky, the pot is gone and there's no record anybody can check."

*Adjust that second line to whatever is true for you — a real one-sentence story beats a
statistic here.*

---

## B. The agent (0:30–1:30)

**On screen:** Terminal, `ajo status`, then `ajo payout` running live.

> "AjoAgent is the organiser, as an agent on Celo.
>
> Members send a fixed amount of USD₮ to the agent's wallet. The agent watches the chain for
> those transfers and credits them to the round."

**[cut to `ajo status` — 3 of 3 paid in]**

> "When the pot is complete, the agent takes a firm quote from Textile FX, converts the
> whole pot from USD₮ to cNGN — naira, on-chain — pays the member whose turn it is, and
> rotates to the next person."

**[`ajo payout` runs. Don't talk over it. Let the hashes scroll.]**

> "That just happened on Celo mainnet. Real money, real transactions."

**[cut to Celoscan payout tx]**

> "Here's the payout. Anyone in the circle can check this — they don't need to trust me."

---

## C-KIROWEEN. How Kiro built it (1:30–2:20)

**On screen:** Kiro. Spec files, then `tasks.md`, then the dashboard appearing.

> "The member-facing side is where Kiro came in.
>
> I wrote three steering files first — who this is for, and the rules that aren't negotiable.
> Celo mainnet only. Every transaction carries an attribution tag. And no private keys in
> frontend code, ever."

**[show `.kiro/steering/tech.md`]**

> "Then a spec: five requirements with acceptance criteria, and eight tasks."

**[show `requirements.md`, then `tasks.md` with boxes checked]**

> "Six hundred words of spec became eight hundred lines of working frontend. Kiro checked off
> each task as it finished it.
>
> Two decisions I didn't make: it chose vanilla TypeScript over React, because my spec said
> this has to work on a low-end Android on 3G — the whole page is under four kilobytes
> gzipped. And when I asked it to reconsider the web font against that same requirement, it
> self-hosted the font. The deployed page makes zero third-party requests."

---

## C-CELO. The corridor (1:30–2:20)

**On screen:** Celoscan input data showing the tag, then 8004scan.

> "The corridor here is USD₮ to cNGN — dollars to naira, settled on-chain, inside a savings
> product people already use. Nobody in the circle has to think about stablecoins. They put
> in their contribution, and their turn comes around.
>
> Every transaction the agent sends carries an ERC-8021 attribution tag."

**[show the input data suffix on Celoscan]**

> "And the agent has its own on-chain identity — registered on the ERC-8004 identity
> registry as agent 10105."

**[show 8004scan page]**

> "That's not my claim. That's a third-party explorer reading the registry."

---

## D. The member view (2:20–2:50)

**On screen:** Dashboard, scrolling slowly. Phone footage if you have it.

> "And this is what a member actually sees."

**[let it breathe — 3 seconds of silence while it scrolls]**

> "It's styled like the exercise book they already use. Who's paid this round. Whose turn is
> next. And every payout, with a link to the transaction.
>
> No wallet connection. No app to install. It's a web page that works on a cheap phone — and
> every number on it can be checked on Celoscan."

---

## E. Close (2:50–3:00)

> "AjoAgent. Live on Celo mainnet today."

**[on screen, held: the two links]**

```
ajoagent-dashboard.vercel.app
8004scan.io/agents/celo/10105
```

---

## Notes

**Don't record until the real circle has run.** Section B is the whole video, and with fixture
data the Celoscan links 404 — which a judge will click. Everything else is already verifiable.

**The silence in section D is deliberate.** Most hackathon videos talk continuously and all
blur together. Three seconds of a well-made page scrolling, with no voiceover, will hold
attention better than another sentence.

**If `ajo payout` fails on camera, keep the footage.** The agent now writes the swap to disk
before settling, so re-running resumes instead of double-swapping. "It failed halfway and
recovered without losing anyone's money" is a *stronger* demo than a clean run — most
hackathon projects can't survive being interrupted. Only use this if it happens naturally.

**Shoot section A last.** You'll know what you're introducing by then and it'll be tighter.
