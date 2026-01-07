#!/usr/bin/env python3
"""
CAMeL Tools morphological analyzer for Arabic roots.
Provides linguistic analysis to improve AI validation accuracy.
"""

from camel_tools.morphology.analyzer import Analyzer
from camel_tools.morphology.database import MorphologyDB


class CamelRootAnalyzer:
    """Wrapper for CAMeL Tools morphological analysis."""

    # CAMeL Tools uses special characters for weak/hamza letters
    # Map them back to standard Arabic
    CAMEL_TO_ARABIC = {
        "#": "و",  # waw
        "&": "ء",  # hamza
        "|": "أ",  # hamza on alif
        ">": "أ",  # hamza on alif
        "<": "إ",  # hamza under alif
        "}": "ئ",  # hamza on ya
        "{": "ؤ",  # hamza on waw
    }

    def __init__(self) -> None:
        """Initialize CAMeL Tools analyzer."""
        self.db = MorphologyDB.builtin_db()
        self.analyzer = Analyzer(self.db)

    def _normalize_camel_root(self, camel_root: str) -> str:
        """Convert CAMeL Tools root representation to standard Arabic.

        Args:
            camel_root: Root with CAMeL special characters (e.g., "#.ف.ق")

        Returns:
            str: Root with standard Arabic letters (e.g., "و.ف.ق")
        """
        normalized = camel_root
        for camel_char, arabic_char in self.CAMEL_TO_ARABIC.items():
            normalized = normalized.replace(camel_char, arabic_char)
        return normalized

    def analyze_root(self, arabic_word: str) -> dict | None:
        """Analyze Arabic word and extract morphological information.

        Args:
            arabic_word: Arabic word with tashkeel

        Returns:
            dict: Analysis with root, pattern, POS, and suggested base form
                  None if analysis fails
        """
        # Handle empty or None input
        if not arabic_word or not arabic_word.strip():
            return None

        try:
            analyses = self.analyzer.analyze(arabic_word)

            if not analyses:
                return None

            # Use first (most likely) analysis
            analysis = analyses[0]

            # Extract key morphological features
            camel_root = analysis.get("root", "")  # May have special chars like "#"
            root = self._normalize_camel_root(camel_root)  # Convert to standard Arabic
            pattern = analysis.get("pattern", "")  # e.g., "1َ2ا3"
            pos = analysis.get("pos", "")  # e.g., "noun"
            lemma = analysis.get("lex", "")

            # Determine if this looks like a derived form
            is_derived = self._is_derived_form(pattern, pos)

            # Try to suggest base verb form from root (using normalized root)
            suggested_base = self._suggest_base_verb(root) if is_derived else None

            return {
                "root": root,  # Normalized Arabic root
                "pattern": pattern,
                "pos": pos,
                "lemma": lemma,
                "is_derived": is_derived,
                "suggested_base_verb": suggested_base,
            }

        except Exception:
            # If CAMeL analysis fails, return None
            return None

    def _is_derived_form(self, pattern: str, pos: str) -> bool:
        """Check if pattern and POS indicate a derived form.

        Args:
            pattern: Morphological pattern (e.g., "1َ2ا3")
            pos: Part of speech tag

        Returns:
            bool: True if appears to be derived form
        """
        # Common derived noun patterns (verbal nouns, participles)
        # Form I verbal nouns
        form_i_patterns = [
            "1َ2ا3",  # فَعَال (verbal noun)
            "1ُ2ُو3",  # فُعُول (verbal noun)
            "1َ2ْ3َة",  # فَعْلَة (with taa marbuta)
        ]

        # Form II-X verbal noun patterns (تَفْعِيل, مُفَاعَلَة, etc.)
        higher_form_patterns = [
            "تَ1ْ2ِي3",  # Form II: تَفْعِيل (e.g., تَوْفِيق)
            "تَوْ2ِي3",  # Form II variant: تَوْفِيل
            "مُ1ا2َ3َة",  # Form III: مُفَاعَلَة
            "إِ1ْ2ا3",  # Form IV: إِفْعَال
            "تَ1َ2ُّ3",  # Form V: تَفَعُّل
            "تَ1ا2ُ3",  # Form VI: تَفَاعُل
            "اِنْ1ِ2ا3",  # Form VII: اِنْفِعَال
            "اِ1ْتِ2ا3",  # Form VIII: اِفْتِعَال
            "اِ1ْ2ِ3ا3",  # Form IX variant
            "اِسْتِ1ْ2ا3",  # Form X: اِسْتِفْعَال
        ]

        # Participle patterns (active and passive)
        participle_patterns = [
            "مَ1ْ2ُو3",  # Passive participle: مَفْعُول
            "1ا2ِ3",  # Active participle: فاعِل
            "مُ1َ2ِّ3",  # Form II active participle: مُفَعِّل
            "مُتَ1َ2ِّ3",  # Form V active participle: مُتَفَعِّل
        ]

        all_derived_patterns = (
            form_i_patterns + higher_form_patterns + participle_patterns
        )

        # If it's a noun with a derived pattern, likely derived
        if "noun" in pos.lower():
            for derived_pattern in all_derived_patterns:
                if derived_pattern in pattern:
                    return True

        return False

    def _suggest_base_verb(self, root: str) -> str | None:
        """Suggest base Form I verb from root.

        Args:
            root: Root letters (e.g., "ف.س.د" for trilateral, "د.ح.ر.ج" for quadrilateral)

        Returns:
            str: Suggested Form I verb with tashkeel, or None if can't determine

        Note:
            - Only handles trilateral (3-letter) roots currently
            - Uses فَعَلَ (fa3ala) pattern as heuristic - AI will verify if correct voweling
            - Other Form I patterns (فَعِلَ, فَعُلَ) require semantic knowledge
        """
        if not root or "." not in root:
            return None

        # Extract root letters
        letters = root.split(".")

        if len(letters) == 3:
            # Trilateral root: Use فَعَلَ (fa3ala) pattern as most common
            # Note: This is a heuristic - some roots use فَعِلَ or فَعُلَ
            # AI will determine the correct pattern based on semantic meaning
            base_verb = f"{letters[0]}َ{letters[1]}َ{letters[2]}َ"
            return base_verb

        elif len(letters) == 4:
            # Quadrilateral root: Use فَعْلَلَ (fa3lala) pattern
            # Example: دَحْرَجَ (da7raja) from د.ح.ر.ج
            base_verb = f"{letters[0]}َ{letters[1]}ْ{letters[2]}َ{letters[3]}َ"
            return base_verb

        else:
            # Unsupported root type (5+ letters are rare)
            return None


def batch_analyze_roots(
    roots_data: list[dict], analyzer: CamelRootAnalyzer | None = None
) -> list[dict]:
    """Add CAMeL Tools analysis to roots data.

    Args:
        roots_data: List of root dictionaries
        analyzer: Optional pre-initialized analyzer (recommended for batches)

    Returns:
        list: Roots data with added 'camel_analysis' field
    """
    # Reuse analyzer if provided, otherwise create new one
    if analyzer is None:
        analyzer = CamelRootAnalyzer()

    for root in roots_data:
        arabic_word = root.get("current_letters", "")
        analysis = analyzer.analyze_root(arabic_word)

        # Add analysis to root data (None if analysis failed)
        root["camel_analysis"] = analysis

    return roots_data
