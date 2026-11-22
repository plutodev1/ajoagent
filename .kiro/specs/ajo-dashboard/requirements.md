# Requirements: Ajo Dashboard

## Introduction
A read-only web page members open on their phones to see their circle: who has paid this round, whose turn is next, and proof of every payout. It is styled like the paper Ajo exercise book organisers already use.

## Requirements

### 1. Round overview
**User story:** As a member, I want to see this round's progress so I know if the pot is complete.
- WHEN the page loads THEN it SHALL show circle name, organiser, contribution amount and current round number.
- THE page SHALL list every member with a paid / not-yet-paid mark for the current round.
- WHEN all members have paid THEN it SHALL show "Pot complete, payout pending".

### 2. Rotation
**User story:** As a member, I want to know when it's my turn.
- THE page SHALL show the rotation order and highlight this round's recipient.

### 3. Proof of payout
**User story:** As a member, I want proof that past payouts happened.
- FOR each paid round THE page SHALL show the cNGN amount, date, and Celoscan links for the swap and payout transactions.

### 4. Agent identity
- THE page SHALL show the agent wallet address and its ERC-8004 agent ID with a link to 8004scan.

### 5. Constraints
- Read-only. No wallet connection, no keys.
- Loads `data/circle.json` (served statically or via a tiny endpoint).
- Usable on a low-end Android phone on 3G.
