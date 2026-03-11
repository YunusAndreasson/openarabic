"""Populate the 'book' column in the articles table.

Run this AFTER adding the column via Supabase SQL:
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS book TEXT;
"""

import logging
import sys

sys.path.insert(0, "/home/yunus/Work/open-arabic/translate")
import utils.set_keys  # noqa: F401  (sets env vars)

from utils.storage import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Book mappings by article_id
# ---------------------------------------------------------------------------

BOOK_MAP: dict[int, str] = {
    # ── al-Imam al-Bukhari (author_id 16) ─────────────────────────────────
    # All Bukhari articles are from Ṣaḥīḥ al-Bukhārī
    **{
        aid: "Ṣaḥīḥ al-Bukhārī"
        for aid in [520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530,
                    531, 532, 533, 534, 535, 536, 537, 538, 539, 540, 541,
                    542, 543]
    },

    # ── Ibn al-Jawzi (author_id 104) ───────────────────────────────────────

    # Ṣayd al-Khāṭir (personal notebook / reflections)
    **{
        aid: "Ṣayd al-Khāṭir"
        for aid in [285, 286, 287, 288, 289, 292, 293, 296,
                    412, 413, 414, 415, 416, 417, 418, 419, 420, 421, 422,
                    508, 558, 559, 560, 561, 567, 570, 571]
    },

    # Akhbār al-Ḥamqā waʾl-Mughaffalīn (anecdotes of fools)
    **{
        aid: "Akhbār al-Ḥamqā waʾl-Mughaffalīn"
        for aid in [423, 424, 426, 427, 428, 429, 562, 569]
    },

    # Bustān al-Wāʿiẓīn wa-Riyāḍ al-Sāmiʿīn (sermon collection)
    **{
        aid: "Bustān al-Wāʿiẓīn wa-Riyāḍ al-Sāmiʿīn"
        for aid in [425, 430, 453, 454, 455, 456, 457, 458, 459, 460, 461,
                    462, 491, 492, 493, 494, 495, 496, 497, 498, 499, 516,
                    519]
    },

    # Ṣifat al-Ṣafwa (biographies of the pious)
    **{
        aid: "Ṣifat al-Ṣafwa"
        for aid in [283, 291, 433, 434, 435, 436, 437, 517, 568, 574, 577]
    },

    # Talbīs Iblīs (unmasking Satan's deceptions)
    **{
        aid: "Talbīs Iblīs"
        for aid in [431, 432, 507, 518, 563, 564, 565, 566, 572, 573]
    },

    # Minhāj al-Qāṣidīn (road map for seekers)
    **{
        aid: "Minhāj al-Qāṣidīn"
        for aid in [464, 465, 475, 476, 477, 478, 480, 482, 483, 484,
                    509, 510, 511, 575, 576]
    },

    # Birr al-Wālidayn (on honouring parents)
    **{
        aid: "Birr al-Wālidayn"
        for aid in [488, 489, 490, 512, 513, 514, 515]
    },

    # ── an-Nawawi (author_id 101) ──────────────────────────────────────────

    # Riyāḍ al-Ṣāliḥīn (gardens of the righteous)
    **{
        aid: "Riyāḍ al-Ṣāliḥīn"
        for aid in [279, 341, 342, 343, 345, 346, 347,
                    357, 358, 359, 360, 361, 369, 370, 371, 372, 373,
                    374, 375, 376, 377, 378, 379, 381, 382, 383,
                    479, 481, 504, 546]
    },

    # al-Tibyān fī Ādāb Ḥamalat al-Qurʾān (etiquette of Quran bearers)
    **{
        aid: "al-Tibyān fī Ādāb Ḥamalat al-Qurʾān"
        for aid in [348, 349, 350, 351, 352, 362, 363]
    },

    # al-Majmūʿ Sharḥ al-Muhadhdhab (fiqh encyclopedia)
    **{
        aid: "al-Majmūʿ Sharḥ al-Muhadhdhab"
        for aid in [353, 354, 355, 356]
    },

    # ── Ibn al-Qayyim (author_id 102) ─────────────────────────────────────

    # Madārij al-Sālikīn (levels of the wayfarers)
    **{
        aid: "Madārij al-Sālikīn"
        for aid in [276, 277, 281, 320, 321, 322, 324, 326, 327, 328, 329,
                    331, 332, 333, 335, 336, 337,
                    547, 548, 551, 552, 554]
    },

    # Ighāthat al-Lahfān (aid for the distressed heart)
    **{
        aid: "Ighāthat al-Lahfān"
        for aid in [317, 318, 319, 323, 384, 385, 387, 388]
    },

    # Zād al-Maʿād (provisions for the hereafter – prophetic biography)
    **{
        aid: "Zād al-Maʿād"
        for aid in [325, 330, 334]
    },

    # al-Tibyān fī Aqsām al-Qurʾān (the quranic oaths)
    **{
        aid: "al-Tibyān fī Aqsām al-Qurʾān"
        for aid in [390, 391, 392, 395, 396, 397, 398, 400, 402, 404,
                    405, 406]
    },

    # ʿUddat al-Ṣābirīn wa-Dhakhīrat al-Shākirīn (patience & gratitude)
    **{
        aid: "ʿUddat al-Ṣābirīn wa-Dhakhīrat al-Shākirīn"
        for aid in [549, 550]
    },

    # ── Ibn Taymiyyah (author_id 103) ─────────────────────────────────────

    # al-ʿUbūdiyya (on servitude to God)
    **{
        aid: "al-ʿUbūdiyya"
        for aid in [297, 303, 465, 467, 505, 506, 555, 556, 557]
    },

    # al-Kalim al-Ṭayyib (the good word – on remembrance)
    **{
        aid: "al-Kalim al-Ṭayyib"
        for aid in [298, 299, 300, 301, 302]
    },

    # Majmūʿ al-Fatāwā
    **{
        aid: "Majmūʿ al-Fatāwā"
        for aid in [304, 305, 306, 307, 308, 309, 311, 312, 315, 316,
                    468, 469]
    },

    # ── adh-Dhahabi (author_id 115) ───────────────────────────────────────

    # Siyar Aʿlām al-Nubalāʾ (lives of noble figures)
    **{
        aid: "Siyar Aʿlām al-Nubalāʾ"
        for aid in [282, 365, 366, 367, 368,
                    408, 409, 410, 411, 544, 545]
    },

    # al-Kabāʾir (the major sins)
    **{
        aid: "al-Kabāʾir"
        for aid in [438, 439, 440, 441, 442, 443, 444]
    },

    # al-Ṭibb al-Nabawī (prophetic medicine)
    **{
        aid: "al-Ṭibb al-Nabawī"
        for aid in [447, 449, 451, 452, 463, 464]
    },
}


def main() -> None:
    client = get_supabase_client()

    # Verify book column exists
    try:
        client.table("articles").select("book").limit(1).execute()
    except Exception:
        logger.error(
            "Column 'book' does not exist. Run this SQL in Supabase first:\n"
            "  ALTER TABLE articles ADD COLUMN IF NOT EXISTS book TEXT;"
        )
        sys.exit(1)

    logger.info(f"Updating {len(BOOK_MAP)} articles with book names…")
    updated = 0
    errors = 0

    for article_id, book_name in BOOK_MAP.items():
        try:
            result = (
                client.table("articles")
                .update({"book": book_name})
                .eq("id", article_id)
                .execute()
            )
            if result.data:
                updated += 1
                logger.debug(f"  {article_id} → {book_name}")
            else:
                logger.warning(f"  Article {article_id} not found in DB (skipped)")
        except Exception as e:
            logger.error(f"  Failed to update article {article_id}: {e}")
            errors += 1

    logger.info(f"Done. Updated {updated} articles, {errors} errors.")

    # Summary by book
    from collections import Counter
    counts = Counter(BOOK_MAP.values())
    print("\nArticles per book:")
    for book, count in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"  {count:3d}  {book}")


if __name__ == "__main__":
    main()
