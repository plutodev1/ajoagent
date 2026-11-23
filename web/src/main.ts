import type { Circle, Round, Member } from "./types.js";
import {
  formatUsdt,
  formatCngn,
  shortAddr,
  celoscanTxUrl,
  celoscanAddrUrl,
  scan8004Url,
  formatDate,
} from "./format.js";

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadCircle(): Promise<Circle> {
  const res = await fetch("circle.json");
  if (!res.ok) throw new Error(`HTTP ${res.status} loading circle.json`);
  return res.json() as Promise<Circle>;
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (string | Node)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (typeof c === "string") e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

function link(
  href: string,
  text: string,
  title = ""
): HTMLAnchorElement {
  return el(
    "a",
    { href, target: "_blank", rel: "noopener noreferrer", ...(title ? { title } : {}) },
    text
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function walletToName(wallet: string, members: Member[]): string {
  const m = members.find(
    (m) => m.wallet.toLowerCase() === wallet.toLowerCase()
  );
  return m ? m.name : shortAddr(wallet);
}

function isOpen(round: Round): boolean {
  return !round.payout;
}

// ---------------------------------------------------------------------------
// Demo-data banner
// ---------------------------------------------------------------------------

function buildDemoBanner(): HTMLElement {
  const banner = el(
    "div",
    { class: "nb-demo-banner", role: "note" },
    "⚠ Demo data — transaction links will 404 on Celoscan. This is expected."
  );
  return banner;
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildHeader(c: Circle): HTMLElement {
  const header = el("header", { class: "nb-header" });

  const title = el("h1", { class: "nb-title" }, c.name);
  const meta = el("p", { class: "nb-meta" });

  const open = c.rounds.find(isOpen);
  const roundNo = open ? open.index + 1 : c.rounds.length;
  const totalRounds = c.members.length;

  meta.innerHTML =
    `Organiser: <strong>${c.organiser}</strong>&nbsp;&nbsp;` +
    `Contribution: <strong>${c.contributionUsdt} USD₮</strong>&nbsp;&nbsp;` +
    `Round: <strong>${roundNo} of ${totalRounds}</strong>`;

  header.appendChild(title);
  header.appendChild(meta);
  return header;
}

function buildCurrentRound(c: Circle): HTMLElement {
  const open = c.rounds.find(isOpen);
  if (!open) {
    // All rounds done
    const sec = el("section", { class: "nb-section" });
    sec.appendChild(el("h2", { class: "nb-section-title" }, "Current Round"));
    sec.appendChild(
      el("p", { class: "nb-complete" }, "🎉 All rounds complete!")
    );
    return sec;
  }

  const sec = el("section", { class: "nb-section" });
  sec.appendChild(
    el("h2", { class: "nb-section-title" }, `Round ${open.index + 1} — In Progress`)
  );

  const paidSet = new Set(open.contributions.map((ct) => ct.from.toLowerCase()));
  const allPaid = c.members.every((m) => paidSet.has(m.wallet.toLowerCase()));

  if (allPaid) {
    sec.appendChild(
      el("p", { class: "nb-pot-complete" }, "✓ Pot complete — payout pending")
    );
  }

  const table = el("table", { class: "nb-table" });
  const thead = el("thead");
  thead.appendChild(
    el(
      "tr",
      {},
      el("th", {}, "Member"),
      el("th", {}, "Status"),
      el("th", {}, "Tx")
    )
  );
  table.appendChild(thead);

  const tbody = el("tbody");
  for (const member of c.members) {
    const contribution = open.contributions.find(
      (ct) => ct.from.toLowerCase() === member.wallet.toLowerCase()
    );
    const paid = !!contribution;
    const isRecipient =
      open.recipient.toLowerCase() === member.wallet.toLowerCase();

    const tr = el(
      "tr",
      { class: isRecipient ? "nb-recipient-row" : "" }
    );

    const nameTd = el("td", { class: "nb-member-name" });
    nameTd.appendChild(link(celoscanAddrUrl(member.wallet), member.name, member.wallet));
    if (isRecipient) {
      nameTd.appendChild(document.createTextNode(" ★"));
    }
    tr.appendChild(nameTd);

    const statusTd = el(
      "td",
      { class: paid ? "nb-paid" : "nb-unpaid" },
      paid ? "✓ Paid" : "— Pending"
    );
    tr.appendChild(statusTd);

    const txTd = el("td", { class: "nb-tx" });
    if (contribution) {
      txTd.appendChild(
        link(
          celoscanTxUrl(contribution.txHash),
          shortAddr(contribution.txHash),
          `Block ${contribution.block}`
        )
      );
    }
    tr.appendChild(txTd);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  sec.appendChild(table);
  return sec;
}

function buildRotation(c: Circle): HTMLElement {
  const sec = el("section", { class: "nb-section" });
  sec.appendChild(el("h2", { class: "nb-section-title" }, "Rotation Order"));

  const open = c.rounds.find(isOpen);

  const ol = el("ol", { class: "nb-rotation" });
  for (const round of c.rounds) {
    const member = c.members.find(
      (m) => m.wallet.toLowerCase() === round.recipient.toLowerCase()
    );
    const name = member?.name ?? shortAddr(round.recipient);
    const done = !isOpen(round);
    const isCurrent = open && round.index === open.index;

    const li = el(
      "li",
      {
        class: [
          "nb-rotation-item",
          done ? "nb-rotation-done" : "",
          isCurrent ? "nb-rotation-current" : "",
        ]
          .filter(Boolean)
          .join(" "),
      }
    );

    if (isCurrent) {
      li.textContent = `Round ${round.index + 1}: ${name} ← current`;
    } else if (done) {
      li.textContent = `Round ${round.index + 1}: ${name} ✓`;
    } else {
      li.textContent = `Round ${round.index + 1}: ${name}`;
    }

    ol.appendChild(li);
  }
  sec.appendChild(ol);
  return sec;
}

function buildPayoutHistory(c: Circle): HTMLElement {
  const sec = el("section", { class: "nb-section" });
  sec.appendChild(el("h2", { class: "nb-section-title" }, "Payout History"));

  const paid = c.rounds.filter((r) => !isOpen(r));
  if (paid.length === 0) {
    sec.appendChild(el("p", { class: "nb-empty" }, "No payouts yet."));
    return sec;
  }

  for (const round of paid) {
    const p = round.payout!;
    const recipient = walletToName(round.recipient, c.members);

    const card = el("div", { class: "nb-payout-card" });

    const heading = el(
      "h3",
      { class: "nb-payout-heading" },
      `Round ${round.index + 1} — ${recipient}`
    );
    card.appendChild(heading);

    const details = el("dl", { class: "nb-payout-details" });

    function row(label: string, ...nodes: (string | Node)[]): void {
      const dt = el("dt", {}, label);
      const dd = el("dd", {});
      for (const n of nodes) {
        if (typeof n === "string") dd.appendChild(document.createTextNode(n));
        else dd.appendChild(n);
      }
      details.appendChild(dt);
      details.appendChild(dd);
    }

    row("Date", formatDate(p.at));
    row("USDT in", formatUsdt(p.usdtIn));
    row("cNGN out", formatCngn(p.cngnOut));
    row(
      "Swap tx",
      link(celoscanTxUrl(p.swapTx), shortAddr(p.swapTx), p.swapTx)
    );
    row(
      "Payout tx",
      link(celoscanTxUrl(p.payoutTx), shortAddr(p.payoutTx), p.payoutTx)
    );

    card.appendChild(details);
    sec.appendChild(card);
  }

  return sec;
}

function buildAgentPanel(c: Circle): HTMLElement {
  const sec = el("section", { class: "nb-section nb-agent-panel" });
  sec.appendChild(el("h2", { class: "nb-section-title" }, "Agent Identity"));

  const dl = el("dl", { class: "nb-payout-details" });

  function row(label: string, ...nodes: (string | Node)[]): void {
    const dt = el("dt", {}, label);
    const dd = el("dd", {});
    for (const n of nodes) {
      if (typeof n === "string") dd.appendChild(document.createTextNode(n));
      else dd.appendChild(n);
    }
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  row(
    "Agent wallet",
    link(celoscanAddrUrl(c.agent), c.agent, "View on Celoscan")
  );
  row(
    "Agent ID (ERC-8004)",
    link(
      scan8004Url(c.agentId),
      `#${c.agentId}`,
      "View on 8004scan"
    )
  );
  row("Chain", "Celo mainnet (42220)");

  sec.appendChild(dl);
  return sec;
}

function buildFooter(): HTMLElement {
  const footer = el("footer", { class: "nb-footer" });
  footer.appendChild(
    document.createTextNode("Read-only view · AjoAgent · Celo mainnet")
  );
  return footer;
}

// ---------------------------------------------------------------------------
// Error / loading states
// ---------------------------------------------------------------------------

function showError(app: HTMLElement, msg: string): void {
  app.innerHTML = "";
  const banner = el(
    "div",
    { class: "nb-error" },
    `⚠ Could not load circle data: ${msg}`
  );
  app.appendChild(banner);
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const app = document.getElementById("app")!;

  let circle: Circle;
  try {
    circle = await loadCircle();
  } catch (err) {
    showError(app, String(err));
    return;
  }

  app.innerHTML = "";
  if (circle._comment) {
    app.appendChild(buildDemoBanner());
  }
  app.appendChild(buildHeader(circle));
  app.appendChild(buildCurrentRound(circle));
  app.appendChild(buildRotation(circle));
  app.appendChild(buildPayoutHistory(circle));
  app.appendChild(buildAgentPanel(circle));
  app.appendChild(buildFooter());
}

main().catch(console.error);
