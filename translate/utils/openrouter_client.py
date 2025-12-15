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
   - Check translation for shirk/bidah/anthropomorphism
   - Verify Islamic honorifics

   Step 8: FORMULATE RESPONSE
   - If ALL checks pass → is_correct=true, issues=[], suggested_english=null
   - If ANY check fails → is_correct=false, list specific issues, provide English correction

13. RESPONSE FORMAT:
   - Return ONLY valid JSON
   - Match the exact structure provided
   - Include reasoning for EVERY word (even if correct)
   - If word is CORRECT: set is_correct=true, issues=[], suggested_english=null
   - If word has ISSUES: set is_correct=false, list issues, provide specific English suggestion
   - CRITICAL: Use null (not the current value) when accepting current translation as correct
   - NOTE: Do NOT include grammar notes in your response - focus ONLY on English translations
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
      "reasoning": "<detailed explanation of validation>"
    }}
  ]
}}

EXAMPLES (ILLUSTRATIVE PATTERNS - apply this reasoning to all words you validate):
- Correct morphemes: {{"word_id": 123, "is_correct": true, "issues": [], "suggested_english": null, "reasoning": "Translation 'and book' is accurate. Arabic وَكِتَابٌ has 2 discrete morphemes (wa + kitaab) matching 2 English words."}}
- Missing prefix: {{"word_id": 456, "is_correct": false, "issues": ["Missing prefix 'fa' translation"], "suggested_english": "so whoever", "reasoning": "Arabic فَمَن has 2 morphemes but current translation 'whoever' only has 1 word. Missing 'fa' prefix."}}
- Grammatical concept (future): {{"word_id": 234, "is_correct": false, "issues": ["Missing future marker translation"], "suggested_english": "will write", "reasoning": "Arabic سَيَكْتُبُ contains future marker سَ which requires 'will' in English. Current 'writes' omits this grammatical concept."}}
- Grammatical concept (dual): {{"word_id": 567, "is_correct": false, "issues": ["Missing dual number marker"], "suggested_english": "two books", "reasoning": "Arabic كِتَابَانِ is dual form (two books), not plural. Must include 'two' to represent dual number concept."}}
- Grammatical concept (jussive negation): {{"word_id": 890, "is_correct": false, "issues": ["Incomplete negation particle representation"], "suggested_english": "did not go", "reasoning": "Arabic لَمْ يَذْهَبْ uses لَمْ which encodes past negation + jussive mood. English needs 'did not' (2 words) to fully represent this grammatical concept."}}
- Correct passive voice: {{"word_id": 321, "is_correct": true, "issues": [], "suggested_english": null, "reasoning": "Translation 'it is' correctly captures the inna particle (إِنَّ) + pronoun suffix (هُ). Both 'it' and 'is' map to Arabic grammatical structures."}}
- Spurious addition: {{"word_id": 789, "is_correct": false, "issues": ["Added preposition 'of' with no Arabic source"], "suggested_english": "door", "reasoning": "Arabic باب has only 1 element (root baab) but current translation 'door of' has 2 words. The word 'of' has no corresponding Arabic morpheme or grammatical concept."}}

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
- Check translation for shirk/bidah/anthropomorphism
- Verify Islamic honorifics

STEP 8: FORMULATE RESPONSE
- If ALL checks pass → is_correct=true, issues=[], suggested_english=null
- If ANY check fails → is_correct=false, list ALL specific issues, provide corrected English translation
- Include detailed reasoning showing morpheme + grammatical concept analysis

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt

    def validate_roots_batch(
        self, roots_data: list[dict[str, Any]], retry_count: int = 0
    ) -> dict[str, Any]:
        """Validate a batch of root translations.

        Args:
            roots_data: List of root dictionaries with validation data
            retry_count: Current retry attempt (used for progressively clearer prompts)

        Returns:
            dict: Parsed validation results

        Raises:
            ValueError: If validation fails after retries
        """
        # Construct system prompt
        system_prompt = self._build_root_system_prompt(retry_count)

        # Construct user prompt with roots data
        user_prompt = self._build_root_user_prompt(roots_data)

        # Call API
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Calculate required tokens: ~150 tokens per root for validation response
        # Add 20% buffer for safety
        estimated_tokens = int(len(roots_data) * 150 * 1.2)
        max_tokens = max(4000, min(estimated_tokens, 16000))  # Cap at 16k tokens

        response = self.call_api(messages, max_tokens=max_tokens, temperature=0.1)

        # Parse JSON response
        return self.parse_json_response(response)

    def _build_root_system_prompt(self, retry_count: int) -> str:
        """Build system prompt for root validation task.

        Args:
            retry_count: Current retry attempt (0 = first attempt)

        Returns:
            str: System prompt
        """
        base_prompt = """You are an expert Arabic linguist and Islamic scholar specializing in Classical Arabic (fusha) and Quranic Arabic, with deep expertise in Arabic root morphology and etymology.

Your task is to validate Arabic root translations for accuracy, simplicity, and proper tashkeel (vocalization) according to strict orthodox Sunni Islamic scholarship.

EDUCATIONAL PURPOSE FOR LANGUAGE LEARNERS:
These root translations are designed to help students learn Arabic vocabulary and understand word families. Each root translation must:
1. Capture the CORE, LITERAL meaning of the root (not derived word meanings)
2. Use SIMPLE, COMMON English words that learners can easily understand and remember
3. Be ACCURATE to Classical Arabic and Quranic usage
4. Have CORRECT tashkeel (diacritical marks) for proper pronunciation

CRITICAL: ARABIC LETTERS ARE ALWAYS CORRECT - NEVER CHANGE THEM
- **THE ARABIC LETTERS ARE ALREADY CORRECT IN THE DATABASE**
- **YOU MAY ONLY FIX TASHKEEL (DIACRITICAL MARKS) ON THE EXISTING LETTERS**
- **NEVER suggest a different Arabic word with different letters**
- Example CORRECT tashkeel fix: قِلَّةٌ → قِلَّةٌ (fix vowel marks on SAME letters)
- Example WRONG: قِلَّةٌ → قَلَّ (❌ FORBIDDEN - different letters!)
- If you think the word is "derived", that's probably intentional - the letters are still correct
- Roots are stored as COMPLETE ARABIC WORDS with tashkeel, NOT separated by dashes

CRITICAL VALIDATION PRINCIPLES:

1. ARABIC LETTERS VALIDATION (CRITICAL):
   - **NEVER suggest changing the Arabic letters**
   - The database already has the correct Arabic word
   - You may ONLY suggest tashkeel fixes on the EXISTING word
   - If the word looks "derived" (ends in ة, etc.) → That's INTENTIONAL, the letters are still correct
   - DO NOT suggest a "base verb" with different letters - this is FORBIDDEN

   **WHAT TO CHECK**:
   - Is tashkeel missing entirely? → Suggest adding tashkeel to the SAME word
   - Is tashkeel clearly wrong? → Suggest correcting tashkeel on the SAME word
   - Are the letters themselves wrong? → NO! The letters are always correct, never flag this

   **CRITICAL RULE**: The Arabic word form in the database is intentional and correct.
   You are ONLY checking tashkeel quality and English translation accuracy.

2. SIMPLICITY FOR LEARNERS (PROVIDE ONLY ONE BEST TRANSLATION):
   - CRITICAL: Suggest only ONE English word - the simplest, most accurate option
   - Do NOT provide multiple alternatives or lists of options
   - Prefer COMMON, EVERYDAY English words over rare/technical terms
   - Prefer SHORTER words over longer synonyms (when equally accurate)
   - Prefer CONCRETE meanings over abstract (when possible)
   - **USE BARE INFINITIVES for verbs (NO "to" prefix)**:
     * ✅ CORRECT: "write", "know", "go", "flee", "corrupt"
     * ❌ WRONG: "to write", "to know", "to go", "to flee", "to corrupt"
     * Rationale: No Arabic equivalent for "to", matches dictionary convention, shorter and clearer
   - MAXIMUM ONE ENGLISH WORD OR SHORT PHRASE (no lists, no alternatives)
   - Examples:
     ✅ GOOD: "writing" (simple, clear, ONE option)
     ❌ WRONG: "writing, inscription, or scribing" (multiple options)
     ✅ GOOD: "knowing" (simple, common, ONE option)
     ❌ WRONG: "knowing/knowledge/cognizance" (multiple alternatives)

3. ACCURACY TO CLASSICAL ARABIC:
   - The meaning must be correct for Classical Arabic (fusha) and Quranic Arabic
   - Check against the example sentences showing derived words
   - If example sentences don't support the translation, flag it
   - Verify the core meaning makes sense across all derived forms shown

4. TASHKEEL (VOCALIZATION) VALIDATION:
   - Arabic root letters MUST have correct diacritical marks (tashkeel)
   - Common patterns:
     * Triliteral roots: فَعَلَ (fa'ala pattern most common)
     * Check voweling matches standard dictionaries
   - CRITICAL: Tashkeel affects pronunciation and meaning
   - If tashkeel is incorrect or missing, provide the correct form

5. THEOLOGICAL SOUNDNESS:
   - NO shirk (associating partners with Allah)
   - NO bidah (religious innovation)
   - Proper Islamic honorifics and respect
   - Meanings must align with orthodox Sunni understanding

VALIDATION WORKFLOW FOR EACH ROOT:

STEP 1: ANALYZE EXAMPLE SENTENCES
- Look at the derived words shown in the example sentences
- Identify the COMMON SEMANTIC THREAD across all examples
- Extract the CORE MEANING that unifies all derived words

STEP 2: EVALUATE CURRENT TRANSLATION
- Does it capture the core meaning accurately?
- Is it at the RIGHT LEVEL? (root concept, not specific word meaning)
- Is it SIMPLE enough for learners? (common, everyday English)
- Is it ACCURATE to Classical Arabic usage?

STEP 3: CHECK TASHKEEL
- Are all diacritical marks present and correct?
- Does the vocalization match standard Arabic dictionaries?
- Is it pronounceable and proper?

STEP 4: SUGGEST IMPROVEMENTS (CONSERVATIVE - 85-90% ACCEPTANCE TARGET)
- **CRITICAL**: The Arabic letters are ALWAYS correct - never suggest different letters
- **DEFAULT**: ACCEPT unless tashkeel missing or English wrong/obscure
- **TARGET**: Flag ~10-15% of roots (tashkeel issues + obscure/wrong English)

- **WHEN TO FLAG (ONLY THESE 2 TYPES)**:
  1. **Tashkeel completely missing** (فسد with NO vowel marks) → Add tashkeel to SAME word
  2. **English wrong or too technical** → Suggest better English ONLY
     * Wrong meaning: "happiness" for root meaning "sadness"
     * Too technical: "vicegerent" → "caliph", "comminution" → "breaking"
     * Multiple words listed: "gather, unite" → choose ONE best word
     * Archaic terms: "propinquity" → "nearness"

- **NEVER FLAG THESE (ALWAYS ACCEPT)**:
  1. Words ending in ة (نَفْرَةٌ, إِضَاعَةٌ) → INTENTIONAL, accept if translation clear
  2. Verbal nouns (ذِكْرٌ, عِلْمٌ, تَوْفِيقٌ) → INTENTIONAL, accept if translation clear
  3. Form II-X verbs → INTENTIONAL, accept if translation clear
  4. Basic nouns: "time", "chest", "self", "Lord" → ALWAYS ACCEPT
  5. Minor synonym differences (bad/evil, know/knowledge) → ACCEPT
  6. ANY translation you describe as "simple and accurate" → MUST ACCEPT

- **CRITICAL CONSTRAINT**: If suggesting tashkeel fix, keep the EXACT SAME letters
  - Example: فسد → فَسَدَ ✅ (same letters, added vowels)
  - Example: قِلَّةٌ → قَلَّ ❌ FORBIDDEN (different letters!)

- **LOGIC CHECK**: If you write "simple and accurate" → is_correct MUST be true
- **DEFAULT STANCE**: When uncertain → ACCEPT (aim for 95%+ acceptance)

STEP 5: FORMULATE RESPONSE (EXTREMELY CONSERVATIVE)
- **DEFAULT**: is_correct=true (accept by default)
- **ONLY** mark is_correct=false if you have a COMPELLING reason (see Step 4)
- Ask yourself: "Will this current translation seriously confuse or mislead a learner?" If NO → ACCEPT IT
- Do NOT be pedantic - focus on errors that actually matter for learning
- Include reasoning showing why you accepted/rejected

RESPONSE FORMAT:
- Return ONLY valid JSON
- Match the exact structure provided
- Include detailed reasoning for EVERY root (even if correct)
- If root is CORRECT: set is_correct=true, issues=[], suggested_english=null, suggested_tashkeel=null
- If root has ISSUES: set is_correct=false, list issues, provide specific suggestions
- CRITICAL: Use null (not the current value) when accepting current translation as correct"""

        if retry_count > 0:
            base_prompt += f"""

⚠️ RETRY ATTEMPT {retry_count}: Your previous response had JSON parsing errors.
CRITICAL: Return ONLY valid JSON. NO markdown, NO code blocks, NO explanations outside JSON.
Start with {{ and end with }}. Nothing else."""

        return base_prompt

    def _build_root_user_prompt(self, roots_data: list[dict[str, Any]]) -> str:
        """Build user prompt with roots data.

        Args:
            roots_data: List of root dictionaries

        Returns:
            str: User prompt
        """
        # Convert roots data to JSON for the prompt
        roots_json = json.dumps(roots_data, ensure_ascii=False, indent=2)

        prompt = f"""Validate these Arabic root translations for accuracy, simplicity, and proper tashkeel:

INPUT ROOTS (with CAMeL Tools linguistic analysis):
{roots_json}

NOTE: Each root includes "camel_analysis" with morphological data from CAMeL Tools:
- "root": Trilateral root letters (e.g., "ف.س.د")
- "pattern": Morphological pattern (e.g., "1َ2ا3" for فَعَال)
- "pos": Part of speech (noun/verb/etc)
- "is_derived": Boolean indicating if pattern suggests derived form
- "suggested_base_verb": Suggested Form I base verb (if derived)

USE THIS DATA to inform your validation. If CAMeL identifies a root as derived with a suggested base verb, strongly consider flagging it.

REQUIRED OUTPUT FORMAT (valid JSON only):
{{
  "validations": [
    {{
      "root_id": <int>,
      "is_correct": <boolean>,
      "issues": [],  // Empty array if root is correct
      "suggested_english": null,  // null if current translation is correct, or "<new translation>" if issues found
      "suggested_tashkeel": null,  // null if current tashkeel is correct, or "<corrected Arabic>" if issues found
      "reasoning": "<detailed explanation of validation>"
    }}
  ]
}}

EXAMPLES (ILLUSTRATIVE PATTERNS - apply this reasoning to all roots you validate):

- **Correct root**: {{"root_id": 123, "is_correct": true, "issues": [], "suggested_english": null, "suggested_tashkeel": null, "reasoning": "كَتَبَ - Arabic letters correct, tashkeel correct. Translation 'writing' is simple and accurate. ACCEPT."}}

- **Missing tashkeel ONLY**: {{"root_id": 234, "is_correct": false, "issues": ["Tashkeel completely missing"], "suggested_english": null, "suggested_tashkeel": "ذَهَبَ", "reasoning": "Root ذهب has NO tashkeel marks. Adding tashkeel to SAME word: ذَهَبَ (dhahaba). Current translation 'going' is accurate. NOTE: Not changing letters, only adding vowel marks."}}

- **Wrong English translation**: {{"root_id": 456, "is_correct": false, "issues": ["English translation incorrect"], "suggested_english": "corruption", "suggested_tashkeel": null, "reasoning": "فَسَادٌ - Arabic letters and tashkeel are correct. Current translation 'distortion' is wrong meaning. Should be 'corruption'. NOTE: Not changing Arabic word."}}

- **Obscure English term**: {{"root_id": 789, "is_correct": false, "issues": ["English too technical"], "suggested_english": "breaking", "suggested_tashkeel": null, "reasoning": "كَسْرٌ - Arabic letters and tashkeel correct. Current translation 'comminution' is too technical (most learners don't know this word). Suggest common word 'breaking'. NOTE: Arabic word unchanged."}}

- **Technical archaic term**: {{"root_id": 890, "is_correct": false, "issues": ["English archaic term"], "suggested_english": "caliph", "suggested_tashkeel": null, "reasoning": "خَلِيفَةٌ - Arabic letters and tashkeel correct. Current translation 'vicegerent' is archaic (learners won't know this). Suggest common 'caliph'. NOTE: Arabic word unchanged."}}

- **Multiple words listed**: {{"root_id": 901, "is_correct": false, "issues": ["Multiple words listed"], "suggested_english": "gather", "suggested_tashkeel": null, "reasoning": "اِجْتَمَعَ - Arabic correct. Current translation lists 'gather, unite' - must provide ONE word only. Choose 'gather' as primary meaning. NOTE: Arabic unchanged."}}

- **Acceptable derived form**: {{"root_id": 888, "is_correct": true, "issues": [], "suggested_english": null, "suggested_tashkeel": null, "reasoning": "نَفْرَةٌ - Arabic letters and tashkeel correct. Ends with ة (derived form) but this is INTENTIONAL. Translation 'aversion' is simple and accurate. ACCEPT as-is."}}

- **Acceptable verbal noun**: {{"root_id": 567, "is_correct": true, "issues": [], "suggested_english": null, "suggested_tashkeel": null, "reasoning": "تَوْفِيقٌ - Form II verbal noun but Arabic letters are correct as intended. Translation 'success' is simple. ACCEPT. Do not suggest different Arabic word."}}

VALIDATION CHECKLIST for EACH root (ULTRA-CONSERVATIVE - TARGET 95%+ ACCEPTANCE):

**CRITICAL PHILOSOPHY**: The Arabic letters are ALWAYS correct. You are ONLY checking tashkeel and English quality.
Your job is to catch ONLY obvious tashkeel problems or bad English translations. ACCEPT 95%+ of roots.

**SIMPLIFIED 2-QUESTION VALIDATION**:

1. **Is tashkeel completely absent?** (NO vowels at all like فسد)
   - If YES → Flag it (suggest adding tashkeel to SAME word)
   - If NO → Continue to question 2

2. **Is the English translation wrong or too obscure?**
   - Completely wrong meaning? → Flag it (suggest correct English)
   - Technical/archaic terms most learners won't know? → Flag it (suggest common English)
     * Examples to flag: "vicegerent", "comminution", "dissimulation", "propinquity"
     * Keep simple: "caliph", "breaking", "hypocrisy", "nearness"
   - Multiple alternatives listed? → Flag it (choose ONE best word)
   - Common, clear English? → **ACCEPT IT** ✅

**THAT'S IT. Just 2 questions. If both pass → ACCEPT the root.**

**FORBIDDEN ACTIONS**:
- ❌ NEVER suggest different Arabic letters (ة endings are INTENTIONAL)
- ❌ NEVER suggest "base verbs" with different letters
- ❌ NEVER flag derived forms (they are correct as-is)
- ❌ NEVER change the Arabic word, only fix tashkeel on SAME word

**EXPLICIT EXAMPLES OF WHAT TO ACCEPT** (even if you think something else might be "better"):
✅ ACCEPT: وَقْتٌ = "time" (basic noun, simple translation)
✅ ACCEPT: صَدْرٌ = "chest" (basic noun, simple translation)
✅ ACCEPT: نَفْسٌ = "self" (basic noun, simple translation)
✅ ACCEPT: رَبٌّ = "Lord" (basic noun, simple translation)
✅ ACCEPT: اللَّهُ = "God" (basic noun, simple translation)
✅ ACCEPT: ذِكْرٌ = "remember" (verbal noun, clear meaning)
✅ ACCEPT: عِلْمٌ = "know" (verbal noun, clear meaning)
✅ ACCEPT: نَفْرَةٌ = "aversion" (ends with ة but INTENTIONAL, translation clear)
✅ ACCEPT: إِضَاعَةٌ = "waste" (ends with ة but INTENTIONAL, translation clear)
✅ ACCEPT: تَوْفِيقٌ = "success" (Form II verbal noun but INTENTIONAL)
✅ ACCEPT: Any translation you think is "simple and accurate"

**ONLY FLAG THESE 2 TYPES**:
1. ⚠️ Tashkeel completely missing (فسد with no vowels) → Add tashkeel to SAME word
2. ⚠️ Translation completely wrong/obscure → Suggest better English only

**LOGIC CHECK BEFORE SUBMITTING**:
- Did you write "simple and accurate" in reasoning? → is_correct MUST be true
- Did you accept at least 95% of roots? → If not, you're being WAY too strict
- Are you suggesting different Arabic letters? → STOP, this is FORBIDDEN
- Did you flag ة endings or derived forms? → STOP, these are INTENTIONAL

CRITICAL REMINDERS:
- **THE ARABIC LETTERS ARE ALWAYS CORRECT - NEVER CHANGE THEM**
- You may ONLY add/fix tashkeel on the SAME word with SAME letters
- English suggestions MUST be exactly ONE word or short phrase
- **ALWAYS use BARE INFINITIVES for verbs**: "write" NOT "to write"
- If suggesting tashkeel correction, keep the EXACT SAME letters

**FINAL REMINDER - YOUR VALIDATION PHILOSOPHY**:
The Arabic word forms in the database are intentional and correct.
You are ONLY checking: (1) Is tashkeel missing? (2) Is English translation bad?

**THE 2-QUESTION TEST** (use this for every root):
1. No tashkeel at all? → Flag (add tashkeel to SAME word)
2. English translation clearly wrong/obscure? → Flag (suggest better English)
3. Otherwise → **ACCEPT IT** ✅

**ABSOLUTE REQUIREMENTS**:
- You MUST accept at least 85% of roots (flag only ~10-15%)
- If you say "simple and accurate" → is_correct MUST be true
- Words ending in ة (نَفْرَةٌ, إِضَاعَةٌ) → ALWAYS accept if translation clear
- Verbal nouns (ذِكْرٌ, عِلْمٌ, تَوْفِيقٌ) → ALWAYS accept if translation clear
- When uncertain → ALWAYS accept

**WHAT TO FLAG**:
✅ Missing tashkeel (فسد with no vowels)
✅ Obscure/archaic English (vicegerent, comminution, propinquity)
✅ Wrong English meaning
✅ Multiple words listed (pick ONE best word)

**FORBIDDEN BEHAVIORS**:
❌ NEVER suggest different Arabic letters (this is the #1 forbidden action)
❌ NEVER suggest "base verbs" with different letters
❌ NEVER flag derived forms as wrong (they are correct as stored)
❌ Do NOT flag common, clear English translations

**Your goal**: Accept 85-90%, flag missing tashkeel + obscure/wrong English.

Return ONLY the JSON object. No markdown, no code blocks, no extra text."""

        return prompt


def create_validation_client() -> OpenRouterClient:
    """Create a configured OpenRouter client for validation.

    Returns:
        OpenRouterClient: Configured client
    """
    return OpenRouterClient()
