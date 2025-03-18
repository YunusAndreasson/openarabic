import openai
import asyncio
import json
import os
from typing import List, Dict
from pydantic import BaseModel
from tqdm.asyncio import tqdm
import logging
openai.api_key = os.getenv('OPENAI_API_KEY')

# Logging configuration

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s: %(message)s')

# Configuration
MODEL = "gpt-4o-2024-08-06"
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

# OpenAI API wrapper with retries
async def prompt_openai(messages, temperature=0.0, response_format=None, retries=3, backoff=2):
    for attempt in range(retries):
        try:
            response = await openai.ChatCompletion.acreate(
                model=MODEL,
                messages=messages,
                response_format=response_format,
                temperature=temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logging.error(f"OpenAI API error on attempt {attempt + 1}: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(backoff ** attempt)
                continue
            raise e

# Pipeline steps
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
    response = await prompt_openai(prompt, temperature=0.0, response_format={"type": "json_object", "schema": TranslationSchema.schema()})
    return TranslationSchema(**json.loads(response))

async def apply_tashkeel(sentence: str, translation: str, context: str = "") -> str:
    prompt = [
        {"role": "system", "content": "Apply accurate Arabic tashkeel based on provided English context and surrounding sentences."},
        {"role": "user", "content": f"Context: {context}\nArabic: {sentence}\nEnglish: {translation}"}
    ]
    return await prompt_openai(prompt, temperature=0.3)

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

# Translation pipeline with enhanced refinement
async def process_sentence(index: int, sentences: List[str], full_context: str) -> Dict:
    sentence = sentences[index]
    prev_sentence = sentences[index - 1] if index > 0 else ""
    next_sentence = sentences[index + 1] if index < len(sentences) - 1 else ""

    context = f"Previous: {prev_sentence}\nCurrent: {sentence}\nNext: {next_sentence}"

    translation = await literal_translation(sentence, full_context)
    tashkeel = await apply_tashkeel(sentence, translation.full_translation, context)

    translation_verified = await verify_translation(sentence, translation.full_translation)
    tashkeel_verified = await verify_tashkeel(sentence, tashkeel)
    back_translated = await back_translate(translation.full_translation)

    if sentence.strip() != back_translated.strip() or not translation_verified:
        translation.full_translation = await refine_translation(sentence, translation.full_translation, context)
        tashkeel = await apply_tashkeel(sentence, translation.full_translation, context)
        tashkeel_verified = await verify_tashkeel(sentence, tashkeel)

        if not tashkeel_verified:
            tashkeel = await apply_tashkeel(sentence, translation.full_translation, context)

    return {
        "original": sentence,
        "tashkeel": tashkeel,
        "word_by_word_translation": translation.word_by_word_translation,
        "full_translation": translation.full_translation
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

    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)

async def main():
    await translate_file('arabic_input.txt', 'translation_output.json')

if __name__ == '__main__':
    asyncio.run(main())
