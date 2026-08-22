"""Render the golden-batch evaluation as a single self-contained page.

The point of the page is ADJACENCY. A finished panel read on its own tells you
whether it sounds plausible, which is precisely what a fluent model supplies
without necessarily being right. Every shipped gloss is therefore printed
directly above the source glosses it was written from, so "is this faithful?"
is a glance rather than an investigation.

Run from translate/:  uv run python -m word_enrichment.render_eval --out <path.html>
"""

from __future__ import annotations

import argparse
import html
import json
from collections import Counter
from pathlib import Path

BASE = Path(__file__).resolve().parent

CSS = """
:root{
  --paper:#FAFAF9; --raised:#FFFFFF; --sunk:#F2F2EF;
  --ink:#1A1D21; --ink-soft:#565B63; --ink-faint:#878D96;
  --rule:#E2E2DD; --rule-firm:#CFCFC8;
  --lapis:#2D4A8A; --lapis-wash:#E8ECF5;
  --ok:#3F6B4F; --ok-wash:#E7EFE9;
  --warn:#8A6A2D; --warn-wash:#F4EEE1;
  --bad:#8A3D3D; --bad-wash:#F5E8E8;
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --paper:#131518; --raised:#1B1E22; --sunk:#0E1013;
    --ink:#E9E9E4; --ink-soft:#A6ABB3; --ink-faint:#767C85;
    --rule:#2A2E34; --rule-firm:#3A3F47;
    --lapis:#8AA6E0; --lapis-wash:#1C2432;
    --ok:#8FC4A1; --ok-wash:#18241C;
    --warn:#D8B472; --warn-wash:#241F14;
    --bad:#DB9797; --bad-wash:#2A1919;
  }
}
:root[data-theme="dark"]{
  --paper:#131518; --raised:#1B1E22; --sunk:#0E1013;
  --ink:#E9E9E4; --ink-soft:#A6ABB3; --ink-faint:#767C85;
  --rule:#2A2E34; --rule-firm:#3A3F47;
  --lapis:#8AA6E0; --lapis-wash:#1C2432;
  --ok:#8FC4A1; --ok-wash:#18241C;
  --warn:#D8B472; --warn-wash:#241F14;
  --bad:#DB9797; --bad-wash:#2A1919;
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:15px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
.wrap{max-width:940px; margin:0 auto; padding:40px 20px 96px}

header.top{border-bottom:2px solid var(--ink); padding-bottom:20px; margin-bottom:28px}
.eyebrow{
  font-size:11px; letter-spacing:.13em; text-transform:uppercase;
  color:var(--ink-faint); font-weight:600; margin:0 0 10px;
}
h1{
  font-family:Spectral,Georgia,serif; font-weight:600; font-size:clamp(30px,5vw,42px);
  line-height:1.1; margin:0 0 10px; text-wrap:balance; letter-spacing:-.01em;
}
.lede{margin:0; color:var(--ink-soft); max-width:62ch; font-size:16px}

.summary{
  display:grid; grid-template-columns:repeat(auto-fit,minmax(128px,1fr));
  gap:1px; background:var(--rule); border:1px solid var(--rule);
  margin:28px 0; border-radius:3px; overflow:hidden;
}
.stat{background:var(--raised); padding:14px 16px}
.stat .n{
  font-family:"IBM Plex Mono",monospace; font-size:26px; font-weight:500;
  font-variant-numeric:tabular-nums; line-height:1.1; display:block;
}
.stat .k{font-size:11px; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-faint); margin-top:4px; display:block}
.stat.ok .n{color:var(--ok)} .stat.warn .n{color:var(--warn)} .stat.bad .n{color:var(--bad)}

.filters{display:flex; flex-wrap:wrap; gap:8px; margin:0 0 26px}
.chip{
  font:inherit; font-size:12.5px; cursor:pointer;
  background:var(--raised); color:var(--ink-soft);
  border:1px solid var(--rule-firm); border-radius:999px; padding:5px 13px;
}
.chip:hover{border-color:var(--lapis); color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--ink); color:var(--paper); border-color:var(--ink)}
.chip:focus-visible{outline:2px solid var(--lapis); outline-offset:2px}

article.root{
  background:var(--raised); border:1px solid var(--rule);
  border-radius:4px; margin-bottom:18px; overflow:hidden;
}
article.root[hidden]{display:none}
.rhead{
  display:flex; flex-wrap:wrap; align-items:baseline; gap:10px 16px;
  padding:16px 20px; border-bottom:1px solid var(--rule); background:var(--sunk);
}
.radicals{
  font-family:Amiri,"Noto Naskh Arabic",serif; font-size:30px; line-height:1;
  direction:rtl; letter-spacing:.16em; color:var(--lapis);
}
.rtranslit{font-family:"IBM Plex Mono",monospace; font-size:13px; color:var(--ink-faint)}
.rmeaning{font-family:Spectral,Georgia,serif; font-size:19px; font-style:italic; flex:1 1 200px}
.rmeta{font-size:11.5px; color:var(--ink-faint); font-variant-numeric:tabular-nums}

.verdict{
  font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase;
  padding:3px 9px; border-radius:3px; white-space:nowrap;
}
.verdict.publish{background:var(--ok-wash); color:var(--ok)}
.verdict.revise{background:var(--warn-wash); color:var(--warn)}
.verdict.skip,.verdict.error{background:var(--bad-wash); color:var(--bad)}

.note{padding:16px 20px; color:var(--ink-soft); border-bottom:1px solid var(--rule); max-width:66ch}
.reason{
  padding:10px 20px; font-size:13px; background:var(--lapis-wash);
  border-bottom:1px solid var(--rule); color:var(--ink-soft);
}
.reason b{color:var(--ink); font-weight:600}

.member{padding:14px 20px; border-bottom:1px solid var(--rule)}
.member:last-child{border-bottom:0}
.mtop{display:flex; flex-wrap:wrap; align-items:baseline; gap:8px 14px}
.arabic{
  font-family:Amiri,"Noto Naskh Arabic",serif; font-size:27px; line-height:1.5;
  direction:rtl; min-width:110px;
}
.mtranslit{font-family:"IBM Plex Mono",monospace; font-size:12.5px; color:var(--ink-faint)}
.gloss{font-size:15.5px; flex:1 1 180px}
.wazn{
  font-family:"IBM Plex Mono",monospace; font-size:12px; color:var(--ink-faint);
  direction:rtl; unicode-bidi:isolate; background:var(--sunk);
  padding:2px 7px; border-radius:3px;
}
.sources{
  margin-top:7px; padding-left:12px; border-left:2px solid var(--rule-firm);
  font-size:12.5px; color:var(--ink-faint); max-width:70ch;
}
.sources .lbl{font-weight:600; color:var(--ink-soft)}
.flags{display:flex; flex-wrap:wrap; gap:5px; margin-top:7px}
.flag{
  font-size:10.5px; letter-spacing:.04em; text-transform:uppercase; font-weight:600;
  padding:2px 7px; border-radius:3px; background:var(--warn-wash); color:var(--warn);
}
.flag.bad{background:var(--bad-wash); color:var(--bad)}
.flag.mute{background:var(--sunk); color:var(--ink-faint)}
.flag.new{background:var(--lapis-wash); color:var(--lapis)}
.plural{
  font-family:Amiri,"Noto Naskh Arabic",serif; font-size:17px; direction:rtl;
  unicode-bidi:isolate; color:var(--ink-soft); background:var(--sunk);
  padding:1px 8px; border-radius:3px;
}
.was{
  margin-top:5px; font-size:12.5px; color:var(--ink-faint);
  padding-left:12px; border-left:2px solid var(--lapis); max-width:70ch;
}
.was b{color:var(--lapis); font-weight:600}

footer{margin-top:44px; padding-top:18px; border-top:1px solid var(--rule); font-size:12.5px; color:var(--ink-faint)}
@media (max-width:560px){ .arabic{font-size:24px} .radicals{font-size:26px} }
"""

JS = """
const chips=[...document.querySelectorAll('.chip')];
const cards=[...document.querySelectorAll('article.root')];
const count=document.getElementById('shown');
function apply(f){
  let n=0;
  for(const c of cards){
    const show = f==='all' || c.dataset.flags.split(' ').includes(f);
    c.hidden=!show; if(show) n++;
  }
  count.textContent=n;
}
for(const chip of chips){
  chip.addEventListener('click',()=>{
    chips.forEach(c=>c.setAttribute('aria-pressed', String(c===chip)));
    apply(chip.dataset.filter);
  });
}
apply('all');
"""


def esc(text) -> str:
    return html.escape(str(text or ""))


def member_html(m: dict) -> str:
    flags = []
    if m.get("_new_word"):
        flags.append(('new', 'word swapped in'))
    elif m.get("_gloss_changed"):
        flags.append(('new', 'gloss rewritten'))
    if m.get("verbatim_lane"):
        flags.append(('bad', "Lane's wording unchanged"))
    if m.get("duplicate_link"):
        flags.append(('bad', 'same link as another row'))
    if m.get("repeated_gloss"):
        flags.append(('', 'gloss repeats'))
    if m.get("no_wazn"):
        flags.append(('mute', 'no pattern'))
    if m.get("unlinked"):
        flags.append(('mute', 'not in dictionary'))

    sources = []
    if m.get("camel_gloss"):
        sources.append(f'<span class="lbl">modern</span> {esc(m["camel_gloss"].replace("_", " ").replace(";", ", "))}')
    if m.get("lane_gloss"):
        sources.append(f'<span class="lbl">Lane</span> {esc(m["lane_gloss"])}')

    flag_html = "".join(
        f'<span class="flag {k}">{esc(v)}</span>' for k, v in flags
    )
    source_html = " &nbsp;&middot;&nbsp; ".join(sources)
    morph = []
    if m.get("wazn"):
        morph.append(f'<span class="wazn">{esc(m["wazn"])}</span>')
    elif m.get("verb_form"):
        morph.append(f'<span class="wazn">form {esc(m["verb_form"])}</span>')
    if m.get("plural"):
        morph.append(f'<span class="plural">pl. {esc(m["plural"])}</span>')
    wazn_html = "".join(morph)

    return f"""<div class="member">
  <div class="mtop">
    <span class="arabic">{esc(m.get('letters'))}</span>
    <span class="mtranslit">{esc(m.get('transliteration'))}</span>
    <span class="gloss">{esc(m.get('meaning'))}</span>
    {wazn_html}
  </div>
  {f'<div class="was"><b>was</b> {esc(m["_was"])}</div>' if m.get("_was") else ''}
  {f'<div class="sources">{source_html}</div>' if sources else ''}
  {f'<div class="flags">{flag_html}</div>' if flags else ''}
</div>"""


def card_html(r: dict) -> str:
    v = r.get("verdict") or {}
    verdict = v.get("verdict", "ungraded")
    flags = []
    if verdict in ("revise", "skip"):
        flags.append("judge-" + verdict)
    if r.get("any_duplicate_link"):
        flags.append("duplicate")
    if r.get("any_verbatim_lane"):
        flags.append("verbatim")
    if r.get("dead_panel"):
        flags.append("dead")
    if any(m.get("_gloss_changed") or m.get("_new_word") for m in r.get("members", [])):
        flags.append("changed")
    if not v.get("usage_note_ok", True) or not v.get("root_meaning_ok", True):
        flags.append("judge-revise")

    reason = v.get("reason", "")
    return f"""<article class="root" data-flags="{esc(' '.join(sorted(set(flags))))}">
  <div class="rhead">
    <span class="radicals">{esc(r.get('triliteral_root'))}</span>
    <span class="rtranslit">{esc(r.get('root_transliteration'))}</span>
    <span class="rmeaning">{esc(r.get('root_meaning'))}</span>
    <span class="rmeta">{r.get('headword_count', 0)} headwords · {r.get('linked', 0)}/5 linked · pool {r.get('pool_size', 0)}</span>
    <span class="verdict {esc(verdict)}">{esc(verdict)}</span>
  </div>
  <p class="note">{esc(r.get('usage_note'))}</p>
  {f'<div class="reason"><b>Judge</b> — {esc(reason)}</div>' if reason else ''}
  {''.join(member_html(m) for m in r.get('members', []))}
</article>"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(BASE / "golden_eval.json"))
    ap.add_argument("--out", required=True)
    ap.add_argument("--baseline", default=None,
                    help="a previous batch's .jsonl; changed rows get marked")
    args = ap.parse_args()

    records = json.loads(Path(args.data).read_text(encoding="utf-8"))

    if args.baseline:
        prior = {}
        for line in Path(args.baseline).open(encoding="utf-8"):
            if line.strip():
                rec = json.loads(line)
                prior[rec["root_key"]] = {m["letters"]: m["meaning"]
                                          for m in rec.get("word_family", [])}
        for r in records:
            before = prior.get(r["root_key"], {})
            for m in r.get("members", []):
                was = before.get(m.get("letters"))
                if was is None:
                    m["_new_word"] = bool(before)
                elif was != m.get("meaning"):
                    m["_gloss_changed"] = True
                    m["_was"] = was
    tally = Counter((r.get("verdict") or {}).get("verdict", "ungraded") for r in records)
    unfaithful = sum(1 for r in records for m in (r.get("verdict") or {}).get("members", [])
                     if not m.get("faithful", True))
    dup = sum(1 for r in records if r.get("any_duplicate_link"))
    verbatim = sum(1 for r in records if r.get("any_verbatim_lane"))
    dead = sum(1 for r in records if r.get("dead_panel"))
    linked = sum(r.get("linked", 0) for r in records)
    total_members = sum(len(r.get("members", [])) for r in records)

    filters = [
        ("all", f"All {len(records)}"),
        ("judge-revise", f"Judge: revise ({tally.get('revise', 0)})"),
        ("judge-skip", f"Judge: skip ({tally.get('skip', 0)})"),
        ("verbatim", f"Lane's wording kept ({verbatim})"),
        ("duplicate", f"Duplicate link ({dup})"),
        ("dead", f"No linkable row ({dead})"),
    ]
    changed_panels = sum(1 for r in records
                         if any(m.get("_gloss_changed") or m.get("_new_word")
                                for m in r.get("members", [])))
    if changed_panels:
        filters.insert(1, ("changed", f"Changed since v1 ({changed_panels})"))
    chips = "".join(
        f'<button class="chip" data-filter="{esc(k)}" aria-pressed="{"true" if k == "all" else "false"}">{esc(lab)}</button>'
        for k, lab in filters)

    page = f"""<title>Golden 40 Root Review</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">
<style>{CSS}</style>
<div class="wrap">
<header class="top">
  <p class="eyebrow">Root explanation pipeline · evaluation batch</p>
  <h1>Forty roots, and what each was built from</h1>
  <p class="lede">Every gloss below sits directly above the source rows it was written from,
  because a panel read on its own only tells you whether it <em>sounds</em> right.
  Judge the rewrite against the sources, not against the prose.</p>
</header>

<div class="summary">
  <div class="stat ok"><span class="n">{tally.get('publish', 0)}</span><span class="k">publish</span></div>
  <div class="stat warn"><span class="n">{tally.get('revise', 0)}</span><span class="k">revise</span></div>
  <div class="stat bad"><span class="n">{tally.get('skip', 0)}</span><span class="k">skip</span></div>
  <div class="stat"><span class="n">{unfaithful}</span><span class="k">unfaithful glosses</span></div>
  <div class="stat"><span class="n">{linked}<span style="font-size:14px;color:var(--ink-faint)">/{total_members}</span></span><span class="k">rows that link</span></div>
  <div class="stat"><span class="n">{verbatim}</span><span class="k">kept Lane's wording</span></div>
</div>

<div class="filters">{chips}</div>
<p class="rmeta" style="margin:0 0 18px"><span id="shown">{len(records)}</span> shown</p>

{''.join(card_html(r) for r in records)}

<footer>Generated by DeepSeek via OpenRouter at reasoning=off, $0.08 for all forty.
Arabic forms are selected from Lane's Lexicon and the CAMeL morphological database, never written by the model.
Judge verdicts are a second model reading the same sources — a signal, not an authority.</footer>
</div>
<script>{JS}</script>
"""
    Path(args.out).write_text(page, encoding="utf-8")
    print(f"wrote {args.out}  ({len(page) // 1024} KB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
