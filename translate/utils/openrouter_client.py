"""
OpenRouter API client for DeepSeek validation.

This module provides a simple HTTP client for OpenRouter API,
similar to responses_api.py but using direct HTTP requests instead of OpenAI SDK.
"""

import json
import logging
from typing import Any

import requests

from data.config import DEEPSEEK_MODEL, OPENROUTER_API_KEY, OPENROUTER_BASE_URL

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """Client for OpenRouter API using DeepSeek model."""

    def __init__(
        self, api_key: str | None = None, model: str | None = None
    ) -> None:
        """Initialize OpenRouter client.

        Args:
            api_key: OpenRouter API key (defaults to config)
            model: Model to use (defaults to DeepSeek from config)
        """
        self.api_key = api_key or OPENROUTER_API_KEY
        self.base_url = OPENROUTER_BASE_URL
        self.model = model or DEEPSEEK_MODEL

        if not self.api_key:
            raise ValueError(
                "OpenRouter API key not found. Set OPENROUTER_API_KEY environment variable."
            )

    def call_api(
        self,
        messages: list[dict[str, str]],
        max_tokens: int = 4000,
        temperature: float = 0.1,
    ) -> dict[str, Any]:
        """Call OpenRouter API with given messages.

        Args:
            messages: List of message dicts with 'role' and 'content'
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature (lower = more deterministic)

        Returns:
            dict: API response with 'choices', 'usage', etc.

        Raises:
            requests.HTTPError: If API call fails
            ValueError: If response is invalid
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/openarabic/translate",
            "X-Title": "OpenArabic Translation Validator",
        }

        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=60,
            )
            response.raise_for_status()

            return response.json()

        except requests.exceptions.Timeout:
            logger.error("OpenRouter API request timed out")
            raise
        except requests.exceptions.HTTPError as e:
            logger.error(f"OpenRouter API HTTP error: {e}")
            logger.error(f"Response: {e.response.text if e.response else 'No response'}")
            raise
        except Exception as e:
            logger.error(f"OpenRouter API call failed: {e}")
            raise

    def extract_content(self, response: dict[str, Any]) -> str:
        """Extract text content from API response.

        Args:
            response: API response dict

        Returns:
            str: Extracted text content

        Raises:
            ValueError: If response structure is invalid
        """
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            logger.error(f"Failed to extract content from response: {e}")
            logger.error(f"Response structure: {response}")
            raise ValueError(f"Invalid response structure: {e}") from e

    def parse_json_response(self, response: dict[str, Any]) -> dict[str, Any]:
        """Extract and parse JSON from API response.

        Args:
            response: API response dict

        Returns:
            dict: Parsed JSON data

        Raises:
            ValueError: If JSON parsing fails
        """
        content = self.extract_content(response)

        # Try to parse JSON from response
        try:
            # Handle markdown code blocks
            if "```json" in content:
                # Extract JSON from markdown code block
                start = content.find("```json") + 7
                end = content.find("```", start)
                content = content[start:end].strip()
            elif "```" in content:
                # Extract from generic code block
                start = content.find("```") + 3
                end = content.find("```", start)
                content = content[start:end].strip()

            return json.loads(content)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON from response: {e}")
            logger.error(f"Content: {content}")
            raise ValueError(f"Invalid JSON in response: {e}") from e

    def validate_words_batch(
        self, words_data: list[dict[str, Any]], retry_count: int = 0
    ) -> dict[str, Any]:
        """Validate a batch of word translations.

        Args:
            words_data: List of word dictionaries with validation data
            retry_count: Current retry attempt (used for progressively clearer prompts)

        Returns:
            dict: Parsed validation results

        Raises:
            ValueError: If validation fails after retries
        """
        # Construct system prompt
        system_prompt = self._build_system_prompt(retry_count)

        # Construct user prompt with words data
        user_prompt = self._build_user_prompt(words_data)

        # Call API
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Calculate required tokens: ~100 tokens per word for validation response
        # Add 20% buffer for safety
        estimated_tokens = int(len(words_data) * 100 * 1.2)
        max_tokens = max(8000, min(estimated_tokens, 32000))  # Cap at 32k tokens

        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)

        # Parse JSON response
        return self.parse_json_response(response)

    def _build_system_prompt(self, retry_count: int) -> str:
        """Build system prompt for validation task.

        Args:
            retry_count: Current retry attempt (0 = first attempt)

        Returns:
            str: System prompt
        """
        base_prompt = """You are an expert Arabic linguist and Islamic scholar specializing in Classical Arabic (fusha) and Quranic Arabic, with deep expertise in early Islamic texts from the formative period of Islam.

Your task is to validate Arabic-to-English word translations for accuracy, morphological completeness, and educational precision according to strict orthodox Sunni Islam.

EDUCATIONAL PURPOSE: These translations are designed to teach Arabic morphology and grammar. Each English word must map to either:
1. A specific Arabic morpheme (discrete prefix, root, or suffix), OR
2. A grammatical concept encoded in the Arabic structure (tense, aspect, mood, voice, number, gender, case)

Students need to see the ONE-TO-ONE correspondence between English words and Arabic grammatical elements.

CRITICAL: Prioritize COMPLETE grammatical extraction over natural English. The English does NOT need to sound natural - it needs to show ALL Arabic grammatical information. Awkward literal translations are BETTER than smooth English that omits morphemes or grammatical concepts.
   Example: "his self" is BETTER than "himself" (shows both nafs + hi)
   Example: "so whoever" is BETTER than "whoever" (shows both fa + man)
   Example: "and for them" is BETTER than "for them" (shows wa + li + hum)
   Example: "will write" is BETTER than "writes" when سَ is present (shows future marker + verb)
   Example: "they two wrote" is BETTER than "they wrote" for dual (shows dual number concept)

CRITICAL VALIDATION RULES:

⚠️ NOTE: All examples throughout these rules are ILLUSTRATIVE PATTERNS, not exhaustive lists. Use your deep Arabic linguistic knowledge to identify similar cases beyond the specific examples given. The examples teach you the PATTERN to recognize - apply this pattern recognition broadly.

1. MORPHEME-BY-MORPHEME MATCHING (STRICT):
   - IDENTIFY every morpheme in the Arabic word: prefixes + root + suffixes
   - COUNT the morphemes in Arabic
   - COUNT the words in the English translation
   - VERIFY the counts MATCH EXACTLY (one English word per Arabic morpheme)
   - Example: فَمَن has 2 morphemes → must have 2 English words
     ✅ CORRECT: "fa" (so) + "man" (whoever) = "so whoever"
     ❌ WRONG: "whoever" (missing "fa" prefix)
   - Example: وَلَهُمْ has 3 morphemes → must have 3 English words
     ✅ CORRECT: "wa" (and) + "li" (for) + "hum" (them) = "and for them"
     ❌ WRONG: "for them" (missing "wa" prefix)

2. GRAMMATICAL COMPLETENESS PRINCIPLE (CRITICAL):
   ENCOURAGED: Adding English words that capture Arabic grammatical concepts encoded in the word structure
   FORBIDDEN: Only adding English words for naturalness that have NO Arabic source (morpheme OR grammatical concept)

   Every English word must map to either:
   A) A discrete Arabic morpheme (prefix, root, suffix), OR
   B) A grammatical concept encoded in the Arabic (tense, aspect, mood, voice, number, gender, case)

   ✅ ENCOURAGED - English words representing grammatical concepts:
     - Tense/Aspect markers: "will", "has", "did", "is", "was" (when encoding Arabic tense/aspect)
     - Mood markers: "that", "to", "not" (when encoding subjunctive, jussive, negation)
     - Voice markers: "is/was" + passive (when Arabic verb is passive form)
     - Number: "two", "both" (when Arabic uses dual number)
     - Pronouns: "he", "she", "it", "they" (when encoded in verb conjugations)
     - Emphasis: "indeed", "certainly" (when particles like إِنَّ، لَقَدْ are present)
     - Prepositions: "of", "to", "for" (when representing case relationships or grammatical function)

   ❌ PROHIBITED - English words added only for naturalness with NO Arabic source:
     - Adding articles when no ال prefix: باب = "door" not "a door" (unless tanween justifies it)
     - Adding prepositions with no morpheme or case justification: باب = "door" not "door of"
     - Adding helping words that don't map to Arabic grammar: "just", "really", "quite"

   EXAMPLES of ENCOURAGED additions for grammatical concepts:
     ✅ سَيَكْتُبُ (sa-yaktubu) → "will write" ("will" represents سَ future marker)
     ✅ لَمْ يَكْتُبْ (lam yaktub) → "did not write" ("did not" represents لَمْ jussive negation)
     ✅ قَدْ كَتَبَ (qad kataba) → "has written" ("has" represents قَدْ perfective aspect)
     ✅ كِتَابَانِ (kitaabaan) → "two books" ("two" represents dual number concept)
     ✅ كُتِبَ (kutiba) → "was written" / "it was written" (passive voice encoding)
     ✅ إِنَّهُ (innahu) → "indeed it" / "it is" (emphasis particle + pronoun)
     ✅ Case-marked genitive → may justify "of" in English to show relationship

   TRUST YOUR EXPERTISE: If Arabic encodes grammatical information (even without a discrete morpheme), English should represent it

3. PREFIX VALIDATION (MUST match Arabic exactly):
   - NOTE: The following are COMMON EXAMPLES - use your Arabic expertise to identify ALL prefix types beyond these
   - و (wa) = "and" → REQUIRED if و is present, FORBIDDEN if absent
   - ف (fa) = "so", "then", "thus" → REQUIRED if ف is present, FORBIDDEN if absent
   - ب (bi) = "with", "by", "in" → REQUIRED if ب is present, FORBIDDEN if absent
   - ل (li) = "for", "to" → REQUIRED if ل is present, FORBIDDEN if absent
   - ال (al) = "the" → REQUIRED if ال is present, FORBIDDEN if absent
   - COMPOUND PATTERNS: Some particles combine meanings (EXAMPLES - find similar patterns)
     Example: كَذَلِكَ (kadhalika) = ك (like) + ذَلِكَ (that) → "like that" or "so that"
     Example: لِأَنَّ (lianna) = ل (for) + أَنَّ (indeed/that) → "because" or "for indeed"
   - PLURAL PATTERNS: Extract plurality markers (EXAMPLES - apply pattern recognition)
     Example: هم (hum) signals "they/them" → must show plural in English
     Example: ون/ين (masculine/feminine plural) → show "they" pattern
   - Check: Is each prefix in Arabic rendered in English? Are there English words without Arabic sources?

4. SUFFIX VALIDATION (MUST match Arabic exactly):
   - NOTE: The following are EXAMPLES to illustrate the pattern - use your Arabic expertise to identify ALL suffix types
   - ه/ـه (hu/hi) = "him", "it", "his" → REQUIRED if present, FORBIDDEN if absent
     * When used as SUBJECT pronoun: "he", "it" (in verb conjugations or passive constructions)
     * When used as POSSESSIVE: "his", "its"
     * When used as OBJECT: "him", "it"
   - هم/ـهم (hum) = "them", "their", "they" → REQUIRED if present, FORBIDDEN if absent
   - ها/ـها (ha) = "her", "its", "she" → REQUIRED if present, FORBIDDEN if absent
   - ك/ـك (ka/ki) = "you", "your" → REQUIRED if present, FORBIDDEN if absent
   - نا/ـنا (na) = "us", "our", "we" → REQUIRED if present, FORBIDDEN if absent
   - PRONOUN CLARITY: Pronouns must appear in English when present in Arabic
     Example: نَفْسِهِ (nafsihi) = "self" + "his" → "his self" (NOT just "himself" - show both parts)
   - PASSIVE VOICE & COPULA CONSTRUCTIONS:
     * Verb conjugations may include subject pronouns: كَانَ (kana) → "it was" / "he was"
     * Passive verbs with pronouns: يُقَالُ → "it is said"
     * Inna/kana particles with pronouns: إِنَّهُ → "indeed it" / "it is"
     * These constructions map pronoun + copula to Arabic morphemes
   - LAST DIACRITIC CHECK (CRITICAL): Examine the final diacritic/tashkeel mark on the word:
     * Tanween (ً ٍ ٌ) = indefiniteness → May require "a/an" in English if grammatically needed
     * Case endings (َ ِ ُ ْ) = grammatical case → May indicate prepositional relationship
     * IMPORTANT: These are EXAMPLES - use your linguistic knowledge to identify when ANY final diacritic mandates an English word
     * The final marking may signal grammatical functions requiring English representation
   - Check: Is each suffix in Arabic rendered in English? Are there English words without Arabic sources?

5. VERB SYSTEM VALIDATION (Tense, Aspect, Mood, Voice):
   Arabic verbs encode multiple layers of grammatical information that MUST be represented in English:

   A) TENSE & ASPECT MARKERS:
      - سَ / سَوْفَ (sa/sawfa) = Future marker → English MUST include "will" or "shall"
        Example: سَيَكْتُبُ → "will write" (NOT just "writes")
      - قَدْ (qad) with perfect = Perfective aspect → "has/have" OR "indeed/already"
        Example: قَدْ كَتَبَ → "has written" OR "indeed wrote"
      - قَدْ (qad) with imperfect = Possibility → "may" OR "perhaps"
        Example: قَدْ يَكْتُبُ → "may write"
      - Perfect vs Imperfect distinction:
        كَتَبَ (kataba) = "wrote" / "has written" (completed action)
        يَكْتُبُ (yaktubu) = "writes" / "is writing" (ongoing/habitual)

   B) MOOD MARKERS (Subjunctive, Jussive, Imperative):
      - Subjunctive (منصوب) after أَنْ, لِ, كَيْ:
        أَنْ يَكْتُبَ → "that he write" / "to write" (subjunctive requires "that/to")
        لِيَكْتُبَ → "so that he may write" / "in order to write"
      - Jussive (مجزوم) with لَمْ (past negation):
        لَمْ يَكْتُبْ → "did not write" (NOT "didn't write" - show both "did" + "not")
      - Jussive with لَا (prohibition/negative command):
        لَا تَكْتُبْ → "do not write" (command negation)
      - Imperative mood (command):
        اُكْتُبْ → "write!" (understood "you" + command force)
        اُكْتُبُوا → "you (plural) write!" / "write!" (plural implied subject)

   C) VOICE (Active vs Passive):
      - Passive verb forms (فُعِلَ pattern) REQUIRE passive English:
        كُتِبَ (kutiba) → "was written" / "it was written"
        يُكْتَبُ (yuktabu) → "is written" / "is being written"
      - Passive with subject pronoun when conjugated:
        كُتِبَتْ (kutibat) → "it was written" / "she was written" (feminine)

   D) NEGATION SYSTEM (Different particles encode different meanings):
      - لَا (laa) = General negation → "not", "no"
      - لَمْ (lam) = Past negation + jussive → "did not"
        Example: لَمْ يَذْهَبْ → "did not go" (3 concepts: past + negation + go)
      - لَنْ (lan) = Future negation + subjunctive → "will not" / "shall not"
        Example: لَنْ يَذْهَبَ → "will not go"
      - مَا (maa) = General/past negation → "not", "did not"
      - لَيْسَ (laysa) = Negative copula → "is not", "are not"

   E) EMBEDDED SUBJECT PRONOUNS IN VERBS:
      Arabic verbs conjugate for person/number/gender - the subject is INSIDE the verb:
      - كَتَبَ → "he wrote" (subject "he" is embedded)
      - كَتَبَتْ → "she wrote" (subject "she" + feminine marker)
      - كَتَبُوا → "they wrote" (subject "they" + masculine plural)
      - أَكْتُبُ → "I write" (subject "I" embedded)
      English MUST show the subject pronoun even when not separate in Arabic

   CRITICAL: Extract ALL layers from the verb - a single Arabic verb word may need 3-4 English words
   Example: سَيَكْتُبُونَ → "they will write" (future + they + write = 3 words minimum)

6. ROOT WORD VALIDATION:
   - Translate the root meaning accurately (literal meaning preferred)
   - Do NOT add prepositions that aren't separate morphemes
   - Do NOT add articles unless ال is present
   - Keep it minimal: only what the root conveys
   - Natural English is NOT the goal - showing all Arabic parts IS the goal

7. NUMBER & GENDER VALIDATION:
   Arabic encodes number and gender throughout its grammar - English MUST reflect this:

   A) DUAL NUMBER (المثنى):
      Arabic has THREE numbers: singular, dual (two), plural (three or more)
      The dual MUST be explicitly shown in English:

      - Nouns with dual marking (ـَانِ / ـَيْنِ):
        كِتَابٌ (kitaabun) = "book" (singular)
        كِتَابَانِ (kitaabaani) = "two books" (dual - MUST include "two")
        كُتُبٌ (kutubun) = "books" (plural)

      - Pronouns in dual form:
        هُوَ (huwa) = "he" (singular)
        هُمَا (humaa) = "they two" / "both of them" / "the two" (dual)
        هُمْ (hum) = "they" (plural)

      - Verbs conjugated for dual:
        كَتَبَ (kataba) = "he wrote" (singular)
        كَتَبَا (katabaa) = "they two wrote" / "both wrote" (dual)
        كَتَبُوا (katabuu) = "they wrote" (plural)

      CRITICAL: When dual is present, English MUST show "two", "both", or "the two"

   B) GENDER ENCODING (Masculine vs Feminine):
      Gender is encoded in nouns, adjectives, verbs, and pronouns:

      - Verbs showing gender:
        كَتَبَ (kataba) = "he wrote" (masculine)
        كَتَبَتْ (katabat) = "she wrote" (feminine - تْ indicates female)

      - Pronouns showing gender:
        هُوَ (huwa) = "he" / "it" (masculine)
        هِيَ (hiya) = "she" / "it" (feminine)
        أَنْتَ (anta) = "you" (masculine)
        أَنْتِ (anti) = "you" (feminine)

      - Plural gender distinction:
        كَتَبُوا (katabuu) = "they wrote" (masculine/mixed plural)
        كَتَبْنَ (katabna) = "they wrote" (feminine plural)

      - Optional in English: Can specify "(masculine)" or "(feminine)" for clarity
        أَنْتَ → "you" or "you (masculine)"
        أَنْتِ → "you" or "you (feminine)"

      GUIDANCE: Show gender when it's critical to meaning; embedded gender in verbs
      is usually shown through pronoun choice (he/she)

8. PARTICLES & GRAMMATICAL MARKERS:
   Arabic uses many particles that carry grammatical and semantic meaning:

   A) EMPHASIS & ASSERTION PARTICLES:
      - إِنَّ / أَنَّ (inna/anna) = "indeed", "verily", "truly", "that"
        Example: إِنَّ اللَّهَ = "indeed Allah" (emphasis + assertion)
        Note: These may justify multiple English words to convey force
      - لَقَدْ (laqad) = "certainly", "indeed", "verily" (emphasis with perfect verbs)
        Example: لَقَدْ كَتَبَ = "certainly wrote" / "indeed he wrote"
      - لَ (laam of emphasis) in oaths = emphasis marker
        Example: لَيَفْعَلَنَّ = "he shall certainly do"

   B) CONDITIONAL PARTICLES:
      - إِنْ (in) = "if" (uncertain condition, less likely)
      - إِذَا (idhaa) = "if", "when" (more certain, expected condition)
      - لَوْ (law) = "if" (contrary to fact, hypothetical)
      Example: إِنْ جَاءَ = "if he comes" (uncertain)
      Example: إِذَا جَاءَ = "when he comes" (expected)
      Example: لَوْ جَاءَ = "if he had come" (didn't actually come)

   C) INTERROGATIVE PARTICLES:
      - هَلْ (hal) = Interrogative particle (makes yes/no question)
        Example: هَلْ ذَهَبَ؟ = "Did he go?" / "Has he gone?"
      - أَ (hamza) = Interrogative particle
        Example: أَذَهَبَ؟ = "Did he go?"
      - مَا، مَاذَا (maa, maadhaa) = "what"
      - مَنْ (man) = "who"

   D) DEMONSTRATIVES & RELATIVE PRONOUNS:
      - هَذَا (haadhaa) = "this" (masculine)
      - هَذِهِ (haadhihi) = "this" (feminine)
      - ذَلِكَ (dhaalika) = "that" (masculine)
      - تِلْكَ (tilka) = "that" (feminine)
      - الَّذِي (alladhii) = "the one who", "which", "that" (relative)
      - الَّتِي (allatii) = "the one who" (feminine relative)

   E) COORDINATING & SUBORDINATING CONJUNCTIONS:
      - ثُمَّ (thumma) = "then" (with delay/sequence)
      - أَوْ (aw) = "or"
      - لَكِنْ / لَكِنَّ (laakin/laakinna) = "but", "however"
      - كَأَنَّ (ka'anna) = "as if", "as though"
      - لِأَنَّ (li'anna) = "because" (ل + أَنَّ)

   CRITICAL: Each particle carries specific meaning - ensure English captures it

9. CASE SYSTEM & GRAMMATICAL FUNCTION:
   Arabic case endings (i'rab) indicate grammatical relationships:

   A) GENITIVE CASE (إضافة - Idafa construction):
      - When one noun modifies another, the second is genitive
      - May need "of" in English to show the relationship
      Example: كِتَابُ الطَّالِبِ → "book of the student" / "the student's book"
      (Note: If this requires "of" to show genitive, it's ALLOWED)

   B) ACCUSATIVE CASE (Object marking):
      - Direct objects take accusative case
      - Usually word order alone suffices in English
      - May need preposition in certain constructions

   C) NOMINATIVE CASE (Subject marking):
      - Subjects and predicates take nominative
      - Usually shown through word order in English

   D) TANWEEN (Nunation - indefinite marker):
      - ً ٍ ٌ mark indefiniteness
      - May justify "a/an" in English when grammatically appropriate
      Example: كِتَابًا (kitaaban) → "a book" (accusative indefinite)

   GUIDANCE: When case alone doesn't translate clearly, trust your judgment
   on whether English prepositions or articles are needed to show the relationship

10. THEOLOGICAL VALIDATION (Strict Orthodox Sunni Standards):
   - NO shirk (associating partners with Allah)
   - NO bidah (religious innovation)
   - NO anthropomorphism (attributing human qualities to Allah improperly)
   - NO problematic theological statements
   - Proper use of Islamic honorifics
   - If grammar notes contain ANY theological issue, flag it

11. META-INSTRUCTION - USE YOUR FULL EXPERTISE:
   CRITICAL: The examples and patterns above are ILLUSTRATIVE, not exhaustive.

   You are a world-class Arabic linguist. You possess deep knowledge of:
   - Classical Arabic grammar (nahw and sarf)
   - Quranic Arabic and early Islamic texts
   - All verb forms, derived forms (وزن), and patterns
   - Particles, conjunctions, and grammatical markers
   - Case system, mood system, aspect system
   - Rhetorical devices and emphasis patterns

   TRUST YOUR EXPERTISE:
   - Apply your knowledge beyond the examples given
   - If you identify an Arabic grammatical concept, extract it in English
   - Don't restrict yourself to only the patterns listed
   - The goal is MAXIMUM extraction of grammatical information
   - When in doubt, include the English word if it represents Arabic grammar

   The question to ask: "Does this English word represent an Arabic morpheme
   or grammatical concept?" If YES → Include it. If NO → Flag as error.

12. VALIDATION WORKFLOW FOR EACH WORD:
   COMPREHENSIVE STEP-BY-STEP VALIDATION:

   Step 1: MORPHEME IDENTIFICATION
   - Identify all discrete prefixes in Arabic (wa, fa, bi, li, al, etc.)
   - Identify the root meaning (core word)
   - Identify all discrete suffixes (pronouns, case markers, etc.)

   Step 2: GRAMMATICAL CONCEPT IDENTIFICATION
   - Identify tense/aspect markers (sa/sawfa, qad, perfect vs imperfect)
   - Identify mood (subjunctive, jussive, imperative)
   - Identify voice (active vs passive)
   - Identify number (singular, DUAL, plural)
   - Identify gender encoding (masculine/feminine in verbs/pronouns)
   - Identify negation type (laa, lam, lan, maa)
   - Identify particles (emphasis, conditional, interrogative, relative)
   - Identify case function (genitive, accusative, nominative, tanween)

   Step 3: COUNT TOTAL ELEMENTS
   - Count discrete morphemes (from Step 1)
   - Count grammatical concepts that need English representation (from Step 2)
   - Total expected English words = morphemes + grammatical concepts

   Step 4: ANALYZE CURRENT ENGLISH TRANSLATION
   - Count words in current English translation
   - Map each English word to its Arabic source (morpheme OR grammatical concept)

   Step 5: MISSING ELEMENTS CHECK
   - Is there an Arabic morpheme WITHOUT English equivalent? → FLAG error
   - Is there a grammatical concept WITHOUT English representation? → FLAG error
   - Examples:
     * Missing "will" when سَ is present → FLAG
     * Missing "two" when dual form is present → FLAG
     * Missing "did not" when لَمْ is present → FLAG

   Step 6: EXTRA WORDS CHECK
   - Is there an English word with NO Arabic source (morpheme OR concept)? → FLAG error
   - Ask: Does this word represent Arabic grammar in ANY way?
   - If NO Arabic justification → FLAG as spurious addition

   Step 7: THEOLOGICAL REVIEW
   - Check grammar note for shirk/bidah/anthropomorphism
   - Verify Islamic honorifics

   Step 8: FORMULATE RESPONSE
   - If ALL checks pass → is_correct=true, issues=[], suggestions=null
   - If ANY check fails → is_correct=false, list specific issues, provide corrections

13. RESPONSE FORMAT:
   - Return ONLY valid JSON
   - Match the exact structure provided
   - Include reasoning for EVERY word (even if correct)
   - If word is CORRECT: set is_correct=true, issues=[], suggested_english=null, suggested_grammar_note=null
   - If word has ISSUES: set is_correct=false, list issues, provide specific suggestions
   - CRITICAL: Use null (not the current value) when accepting current translation as correct
"""

        if retry_count > 0:
            base_prompt += f"""

⚠️ RETRY ATTEMPT {retry_count}: Your previous response had JSON parsing errors.
CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations outside JSON.
Start with {{ and end with }}. Nothing else."""

        return base_prompt

    def _build_user_prompt(self, words_data: list[dict[str, Any]]) -> str:
        """Build user prompt with words data.

        Args:
            words_data: List of word dictionaries

        Returns:
            str: User prompt
        """
        # Convert words data to JSON for the prompt
        words_json = json.dumps(words_data, ensure_ascii=False, indent=2)

        prompt = f"""Validate these Arabic word translations for morphological accuracy:

INPUT WORDS:
{words_json}

REQUIRED OUTPUT FORMAT (valid JSON only):
{{
  "validations": [
    {{
      "word_id": <int>,
      "is_correct": <boolean>,
      "issues": [],  // Empty array if word is correct
      "suggested_english": null,  // null if current translation is correct, or "<new translation>" if issues found
      "suggested_grammar_note": null,  // null if current note is correct, or "<new note>" if issues found
      "reasoning": "<detailed explanation of validation>"
    }}
  ]
}}

EXAMPLES (ILLUSTRATIVE PATTERNS - apply this reasoning to all words you validate):
- Correct morphemes: {{"word_id": 123, "is_correct": true, "issues": [], "suggested_english": null, "suggested_grammar_note": null, "reasoning": "Translation 'and book' is accurate. Arabic وَكِتَابٌ has 2 discrete morphemes (wa + kitaab) matching 2 English words."}}
- Missing prefix: {{"word_id": 456, "is_correct": false, "issues": ["Missing prefix 'fa' translation"], "suggested_english": "so whoever", "suggested_grammar_note": "Conjunction fa (so) + relative pronoun man (whoever)", "reasoning": "Arabic فَمَن has 2 morphemes but current translation 'whoever' only has 1 word. Missing 'fa' prefix."}}
- Grammatical concept (future): {{"word_id": 234, "is_correct": false, "issues": ["Missing future marker translation"], "suggested_english": "will write", "suggested_grammar_note": "Future marker sa (will) + imperfect verb write", "reasoning": "Arabic سَيَكْتُبُ contains future marker سَ which requires 'will' in English. Current 'writes' omits this grammatical concept."}}
- Grammatical concept (dual): {{"word_id": 567, "is_correct": false, "issues": ["Missing dual number marker"], "suggested_english": "two books", "suggested_grammar_note": "Noun book in dual form", "reasoning": "Arabic كِتَابَانِ is dual form (two books), not plural. Must include 'two' to represent dual number concept."}}
- Grammatical concept (jussive negation): {{"word_id": 890, "is_correct": false, "issues": ["Incomplete negation particle representation"], "suggested_english": "did not go", "suggested_grammar_note": "Negation particle lam (did not) + jussive verb go", "reasoning": "Arabic لَمْ يَذْهَبْ uses لَمْ which encodes past negation + jussive mood. English needs 'did not' (2 words) to fully represent this grammatical concept."}}
- Correct passive voice: {{"word_id": 321, "is_correct": true, "issues": [], "suggested_english": null, "suggested_grammar_note": null, "reasoning": "Translation 'it is' correctly captures the inna particle (إِنَّ) + pronoun suffix (هُ). Both 'it' and 'is' map to Arabic grammatical structures."}}
- Spurious addition: {{"word_id": 789, "is_correct": false, "issues": ["Added preposition 'of' with no Arabic source"], "suggested_english": "door", "suggested_grammar_note": "Noun meaning door", "reasoning": "Arabic باب has only 1 element (root baab) but current translation 'door of' has 2 words. The word 'of' has no corresponding Arabic morpheme or grammatical concept."}}

CRITICAL VALIDATION WORKFLOW for EACH word:

STEP 1: MORPHEME IDENTIFICATION
- Identify discrete prefixes: wa, fa, bi, li, al, sa/sawfa (if present)
- Identify root meaning (core word)
- Identify discrete suffixes: pronouns, case markers, gender markers (if present)
- COUNT discrete morphemes

STEP 2: GRAMMATICAL CONCEPT IDENTIFICATION
Extract ALL grammatical concepts encoded in the Arabic:
- Tense/Aspect: Future (sa/sawfa → will), Perfect aspect (qad → has/indeed), Perfect vs Imperfect
- Mood: Subjunctive (after an/li → that/to), Jussive (with lam → did not), Imperative (command)
- Voice: Passive forms (require is/was + passive in English)
- Number: DUAL (must show two/both), Singular, Plural
- Gender: Masculine/Feminine encoded in verbs/pronouns
- Negation type: laa, lam (→ did not), lan (→ will not), maa, laysa (→ is not)
- Particles: Emphasis (inna, laqad), Conditional (in, idhaa, law), Interrogative (hal, hamza)
- Case function: Genitive (may need "of"), Tanween (may need "a/an")
- COUNT grammatical concepts needing English representation

STEP 3: CALCULATE EXPECTED ENGLISH WORDS
- Total expected = discrete morphemes (Step 1) + grammatical concepts (Step 2)
- Example: سَيَكْتُبُونَ = 1 future marker + 1 verb root + 1 plural pronoun = 3 words minimum ("they will write")

STEP 4: ANALYZE CURRENT TRANSLATION
- Count words in current English translation
- Map each English word to Arabic source (morpheme OR grammatical concept)

STEP 5: MISSING ELEMENTS CHECK
- Missing discrete morpheme? (prefix/suffix without English) → FLAG error
- Missing grammatical concept? (dual not shown, future not shown, etc.) → FLAG error
- Examples:
  * سَيَكْتُبُ translated as "writes" → FLAG: missing "will" for future marker
  * كِتَابَانِ translated as "books" → FLAG: missing "two" for dual
  * لَمْ يَكْتُبْ translated as "not write" → FLAG: missing "did" for past negation

STEP 6: EXTRA WORDS CHECK
- Is there an English word with NO Arabic source (morpheme OR concept)? → FLAG error
- Ask: Does this English word represent ANY Arabic morpheme or grammatical concept?
- ALLOWED: Words representing grammatical concepts (will, has, did, is, two, etc.)
- PROHIBITED: Words added for naturalness with no Arabic basis (just, really, quite, etc.)
- If NO Arabic justification exists → FLAG as spurious addition

STEP 7: ROOT ACCURACY & THEOLOGICAL REVIEW
- Does root translation match Arabic meaning? (literal preferred)
- Check grammar note for shirk/bidah/anthropomorphism
- Verify Islamic honorifics

STEP 8: FORMULATE RESPONSE
- If ALL checks pass → is_correct=true, issues=[], suggestions=null
- If ANY check fails → is_correct=false, list ALL specific issues, provide complete corrected translation
- Include detailed reasoning showing morpheme + grammatical concept analysis

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt


def create_validation_client() -> OpenRouterClient:
    """Create a configured OpenRouter client for validation.

    Returns:
        OpenRouterClient: Configured client
    """
    return OpenRouterClient()
