// Al-Fawaid Translation — Typst Template
// Bilingual Arabic-English layout for language learners
// All layout logic lives here; data comes from JSON.

// --- Configuration ---

#let data-file = sys.inputs.at("data", default: "output/translations.json")
#let translations = json(data-file)

// --- Document setup ---

#set document(
  title: "Al-Fawaid — Ibn al-Qayyim al-Jawziyya",
  author: "Translated for OpenArabic",
)

// Track current section for running headers
#let current-section = state("current-section", "")

#set page(
  paper: "a4",
  margin: (top: 1.8cm, bottom: 1.5cm, left: 1.5cm, right: 1.5cm),
  header: context {
    let pg = counter(page).get().first()
    if pg > 1 {
      set text(7.5pt, fill: luma(130), font: "Noto Serif")
      if calc.even(pg) {
        // Verso (left page): book title
        [Al-Fawaid — Ibn al-Qayyim al-Jawziyya]
        h(1fr)
        counter(page).display()
      } else {
        // Recto (right page): current section
        counter(page).display()
        h(1fr)
        current-section.get()
      }
      v(-3pt)
      line(length: 100%, stroke: 0.3pt + luma(210))
    }
  },
)

#set text(11pt, font: "Noto Serif", hyphenate: true)
#set par(justify: true)

// Hide default heading rendering — we use custom layout in section-heading
#show heading.where(level: 2): none

// --- Language-specific styling helpers ---

#let ar(body) = {
  set par(leading: 0.8em)
  text(dir: rtl, lang: "ar", font: "Noto Naskh Arabic", 12.5pt, body)
}
#let en(body) = {
  set par(leading: 0.7em, justify: true)
  text(dir: ltr, lang: "en", font: "Noto Serif", 9pt, fill: luma(40), body)
}

// --- Bracket formatting: [word] → italic ---

#let format-brackets(txt) = {
  let cleaned = txt.replace("﴿", "").replace("﴾", "")
  show regex("\[([^\]]+)\]"): m => {
    let inner = m.text.slice(1, -1)
    emph(inner)
  }
  cleaned
}

// --- Segment components ---

#let section-heading(arabic, english) = {
  v(0.6cm)
  // Update running header state
  current-section.update(english)
  // Register for TOC and PDF bookmarks
  heading(level: 2, outlined: true, bookmarked: true)[#format-brackets(english)]
  // Custom layout
  align(center)[
    #block(width: 100%, inset: (x: 12pt, y: 10pt), stroke: (bottom: 0.5pt + luma(190)))[
      #text(dir: rtl, lang: "ar", font: "Amiri", 15pt, weight: "bold")[#arabic]
      #v(0.2cm)
      #text(dir: ltr, lang: "en", font: "EB Garamond", 11pt, weight: "bold", fill: luma(40))[#format-brackets(english)]
    ]
  ]
  v(0.3cm)
}

#let prose-segment(arabic, english) = {
  block(width: 100%, below: 0.08cm, inset: (x: 4pt, y: 6pt), breakable: false, stroke: (bottom: 0.25pt + luma(225)))[
    #grid(
      columns: (11fr, 9fr),
      column-gutter: 12pt,
      align: (left, right),
      en[#format-brackets(english)],
      ar[#arabic],
    )
  ]
}

#let quran-segment(arabic, english, ref, sahih) = {
  block(
    width: 100%,
    inset: (x: 10pt, y: 8pt),
    fill: rgb("#f9f7f2"),
    radius: 2pt,
    stroke: (left: 2pt + luma(200)),
    breakable: false,
  )[
    #grid(
      columns: (11fr, 9fr),
      column-gutter: 12pt,
      align: (left, right),
      [
        #en[#format-brackets(english)]
        #v(0.04cm)
        #text(7pt, fill: luma(140))[[#ref]#{if sahih != "" [ — Sahih Intl: #sahih]}]
      ],
      ar[﴿#arabic﴾],
    )
  ]
  v(0.12cm)
}

#let vol-page-ref(page-num) = {
  block(above: 2pt, below: 0.2cm)[
    #align(right)[#text(6.5pt, fill: luma(180), style: "italic")[vol. p.#sym.space.thin#page-num]]
  ]
}

// ============================================
// FRONT MATTER — Roman numeral page numbering
// ============================================

#set page(numbering: "i")

// --- Title page ---

#align(center)[
  #v(3cm)
  #text(dir: rtl, lang: "ar", font: "Amiri", 32pt, weight: "bold")[الفوائد]
  #v(0.8cm)
  #text(28pt, weight: "bold", font: "EB Garamond")[Al-Fawaid]
  #v(0.3cm)
  #text(15pt, fill: luma(80), font: "EB Garamond")["The Benefits"]
  #v(2cm)
  #text(dir: rtl, lang: "ar", font: "Amiri", 16pt)[ابن قيّم الجوزيّة]
  #v(0.3cm)
  #text(14pt, font: "EB Garamond")[Ibn al-Qayyim al-Jawziyya]
  #v(0.2cm)
  #text(10pt, fill: luma(100))[(d. 751 AH / 1350 CE)]
  #v(3cm)
  #line(length: 30%, stroke: 0.4pt + luma(180))
  #v(0.5cm)
  #text(10pt, fill: luma(100))[
    Learner-friendly bilingual edition \
    for Arabic language students
  ]
  #v(0.8cm)
  #text(9pt, fill: luma(130))[
    Based on the Dar al-Kutub al-Ilmiyya edition, Beirut
  ]
]

#pagebreak()

// --- Copyright / edition page ---

#v(1fr)
#block(inset: (x: 2cm))[
  #set text(8.5pt, fill: luma(80))
  #set par(leading: 0.8em)

  *Al-Fawaid* — Ibn al-Qayyim al-Jawziyya \
  Learner-friendly bilingual Arabic–English edition

  #v(0.4cm)
  Translation produced with AI assistance and human review. \
  Arabic source: Dar al-Kutub al-Ilmiyya edition, Beirut.

  #v(0.4cm)
  This edition is designed for Arabic language learners. \
  The English translation preserves Arabic word order where possible. \
  _Italicized_ words indicate implied meaning not present in the Arabic.

  #v(0.4cm)
  Generated by OpenArabic \
  #link("https://openarabic.io")

  #v(0.4cm)
  #text(7.5pt, fill: luma(120))[
    This work is provided for educational purposes.
  ]
]

#pagebreak()

// --- Table of contents ---

#align(center)[
  #text(20pt, weight: "bold", font: "EB Garamond")[Contents]
]
#v(0.6cm)
#outline(title: none, indent: 1.5em, depth: 2)

#pagebreak()

// ============================================
// MAIN CONTENT — Arabic numeral page numbering
// ============================================

#set page(numbering: "1")
#counter(page).update(1)

#for page in translations {
  // Section headings
  for heading in page.at("headings", default: ()) {
    section-heading(
      heading.at("arabic", default: ""),
      heading.at("english", default: ""),
    )
  }

  // Segments
  let segments = page.at("segments", default: ())
  for (idx, segment) in segments.enumerate() {
    let seg-type = segment.at("type", default: "prose")

    if seg-type == "quran_verse" {
      quran-segment(
        segment.at("arabic", default: ""),
        segment.at("english", default: ""),
        segment.at("reference", default: ""),
        segment.at("sahih_international", default: ""),
      )
    } else {
      prose-segment(
        segment.at("arabic", default: ""),
        segment.at("english", default: ""),
      )
    }
  }

  // Volume page reference
  vol-page-ref(page.at("vol_page", default: page.at("page", default: 0)))
}
