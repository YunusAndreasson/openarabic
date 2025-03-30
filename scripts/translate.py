import openai
import asyncio
import json
import os
from typing import List, Dict
from pydantic import BaseModel
from tqdm.asyncio import tqdm
import logging

# ---------------------- NEW IMPORTS FOR CAMEL TOOLS ----------------------
!pip install camel-tools  # If you haven't installed it yet (or install via requirements)
from camel_tools.disambig.bert import BERTUnfactoredDisambiguator
from camel_tools.tokenizers.word import simple_word_tokenize

openai.api_key = os.getenv('OPENAI_API_KEY')

# Logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')

# Configuration
MODEL = "gpt-4"  # or "gpt-4o", etc., depending on your environment
CHECKPOINT_FILE = 'translation_checkpoint.json'

# Schema definitions
class WordTranslation(BaseModel):
    arabic: str
    english: str

class TranslationSchema(BaseModel):
    original: str
    tashkeel: str
    word_by_word_translation: List[WordTranslation]
    full_translation: str

# ---------------------- INITIALIZE CAMEL TOOLS ----------------------
# We load the BERT-based morphological disambiguator once to reuse
disambig = BERTUnfactoredDisambiguator.pretrained()

# ---------------------- HELPER: CAMEL TOOLS TASHKEEL ----------------------
async def cameltools_tashkeel(sentence: str) -> str:
    """
    Diacritize an Arabic sentence using CAMeL Tools morphological disambiguation.
    Returns the joined diacritized tokens.
    """
    tokens = simple_word_tokenize(sentence)
    # Disambiguate to get morphological analyses
    disambig_result = disambig.disambiguate(tokens)
    # Extract the top (most likely) analysis's diacritized form for each token
    diacritized_tokens = [r.analyses[0].analysis['diac'] for r in disambig_result]
    return ' '.join(diacritized_tokens)

# ---------------------- OPENAI API WRAPPER (unchanged) ----------------------
async def prompt_openai(messages, temperature=0.0, response_format=None, retries=3, backoff=2):
    for attempt in range(retries):
        try:
            response = await openai.ChatCompletion.acreate(
                model=MODEL,
                messages=messages,
                # 'response_format' is not a standard ChatCompletion param—remove if not using a special plugin
                temperature=temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logging.error(f"OpenAI API error on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(backoff ** attempt)
                continue
            raise e

# ---------------------- PIPELINE STEPS ----------------------
async def split_text(text: str) -> List[str]:
    prompt = [
        {"role": "system", "content": "You are an expert in Arabic linguistics. Split the text into short sentences, considering Islamic context."},
        {"role": "user", "content": text}
    ]
    response = await prompt_openai(prompt, temperature=0.2)
    return [sentence.strip() for sentence in response.split('\n') if sentence.strip()]

async def literal_translation(sentence: str, context: str) -> TranslationSchema:
    prompt = [
        {"role": "system", "content": "Translate literally, preserving Arabic word order. Insert necessary additional English words in brackets []. Use provided context for accuracy."},
        {"role": "user", "content": f"Context: {context}\nSentence: {sentence}"}
    ]
    # We rely on an LLM that can handle JSON output or we parse the raw string to JSON
    response = await prompt_openai(prompt, temperature=0.0)
    # A robust approach is to parse the JSON carefully. For brevity, assume well-formed JSON here:
    data = json.loads(response)
    return TranslationSchema(**data)

# ---------------------- UPDATED TASHKEEL STEP ----------------------
async def apply_tashkeel(sentence: str, translation: str, context: str = "") -> str:
    """
    1) Generate a first-pass diacritization with CAMeL Tools.
    2) Ask the LLM to verify/improve or reuse that diacritization.
    3) Return the LLM's final diacritized sentence.
    """
    # 1) Get CAMeL Tools diacritization
    camel_tashkeel = await cameltools_tashkeel(sentence)

    # 2) Prompt the LLM to refine or verify that diacritization
    prompt = [
        {
            "role": "system",
            "content": (
                "You are an expert in Arabic diacritization. We have an Arabic sentence "
                "that was automatically diacritized using CAMeL Tools. Evaluate correctness, "
                "refine it if needed, and produce a final diacritized version. "
                f"Consider the surrounding context: {context}"
            )
        },
        {
            "role": "user",
            "content": (
                f"Original (undiacritized): {sentence}\n\n"
                f"Diacritized by CAMeL Tools: {camel_tashkeel}\n\n"
                f"Relevant English translation/context: {translation}\n\n"
                "Please return only the final diacritized sentence (no extra commentary)."
            )
        }
    ]

    refined_tashkeel = await prompt_openai(prompt, temperature=0.3)
    return refined_tashkeel

async def verify_translation(sentence: str, translation: str) -> bool:
    prompt = [
        {"role": "system", "content": "Verify translation accuracy. Respond strictly with 'true' or 'false'."},
        {"role": "user", "content": f"Arabic: {sentence}\nEnglish: {translation}"}
    ]
    response = await prompt_openai(prompt)
    return response.lower() == 'true'

async def verify_tashkeel(sentence: str, tashkeel: str) -> bool:
    prompt = [
        {"role": "system", "content": "Verify Tashkeel accuracy. Respond strictly with 'true' or 'false'."},
        {"role": "user", "content": f"Original: {sentence}\nTashkeel: {tashkeel}"}
    ]
    response = await prompt_openai(prompt)
    return response.lower() == 'true'

async def back_translate(translation: str) -> str:
    prompt = [
        {"role": "system", "content": "Translate English text back into Arabic, preserving original structure."},
        {"role": "user", "content": translation}
    ]
    return await prompt_openai(prompt, temperature=0.1)

async def refine_translation(sentence: str, translation: str, context: str) -> str:
    prompt = [
        {"role": "system", "content": "Refine translation for accuracy, maintaining literal alignment with the Arabic sentence, considering context."},
        {"role": "user", "content": f"Context: {context}\nArabic: {sentence}\nEnglish: {translation}"}
    ]
    return await prompt_openai(prompt, temperature=0.5)

# ---------------------- MAIN PROCESSING PIPELINE ----------------------
async def process_sentence(index: int, sentences: List[str], full_context: str) -> Dict:
    sentence = sentences[index]
    prev_sentence = sentences[index - 1] if index > 0 else ""
    next_sentence = sentences[index + 1] if index < len(sentences) - 1 else ""

    context = f"Previous: {prev_sentence}\nCurrent: {sentence}\nNext: {next_sentence}"

    # 1) Generate initial translation
    translation_schema = await literal_translation(sentence, full_context)

    # 2) Apply the updated Tashkeel step that includes CAMeL Tools
    refined_tashkeel = await apply_tashkeel(sentence, translation_schema.full_translation, context)

    # 3) Verify steps or refine if needed
    translation_verified = await verify_translation(sentence, translation_schema.full_translation)
    tashkeel_verified = await verify_tashkeel(sentence, refined_tashkeel)
    back_translated = await back_translate(translation_schema.full_translation)

    if sentence.strip() != back_translated.strip() or not translation_verified:
        # Attempt to refine the translation
        translation_schema.full_translation = await refine_translation(sentence, translation_schema.full_translation, context)
        refined_tashkeel = await apply_tashkeel(sentence, translation_schema.full_translation, context)
        tashkeel_verified = await verify_tashkeel(sentence, refined_tashkeel)

        if not tashkeel_verified:
            refined_tashkeel = await apply_tashkeel(sentence, translation_schema.full_translation, context)

    return {
        "original": sentence,
        "tashkeel": refined_tashkeel,
        "word_by_word_translation": translation_schema.word_by_word_translation,
        "full_translation": translation_schema.full_translation
    }

async def translate_file(input_file: str, output_file: str):
    with open(input_file, encoding='utf-8') as f:
        full_text = f.read()

    sentences = await split_text(full_text)

    results = []
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, encoding='utf-8') as cf:
            results = json.load(cf)

    start_index = len(results)
    for index in tqdm(range(start_index, len(sentences)), desc="Translating"):
        result = await process_sentence(index, sentences, full_text)
        results.append(result)
        with open(CHECKPOINT_FILE, 'w', encoding='utf-8') as cf:
            json.dump(results, cf, ensure_ascii=False, indent=4)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=4)

    # Remove checkpoint file after completion
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)

async def main():
    await translate_file('arabic_input.txt', 'translation_output.json')

if __name__ == '__main__':
    asyncio.run(main())
