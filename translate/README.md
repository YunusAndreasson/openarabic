# Arabic Translation Pipeline

A step-by-step pipeline for processing Arabic texts through translation and database insertion.

## Pipeline Structure

The pipeline uses a numbered directory system to organize files by processing phase:

```
translate/
├── 0_inbox/                    # Raw input files organized by author
│   ├── 1_al_imam_an_nawawi/
│   ├── 2_ibn_al_qayyim_al_jawziyyah/
│   ├── 3_ibn_taymiyyah/
│   ├── 4_ibn_al_jawzi/
│   ├── 5_ibn_kathir/
│   ├── 6_al_imam_al_bukhari/
│   ├── 7_al_imam_muslim/
│   ├── 8_ibn_hajar_al_asqalani/
│   ├── 9_al_imam_malik/
│   ├── 10_al_imam_ash_shafii/
│   ├── 11_al_imam_ahmad_ibn_hanbal/
│   ├── 12_al_imam_at_tirmidhi/
│   ├── 13_al_imam_as_suyuti/
│   ├── 14_at_tabari/
│   └── 15_al_imam_al_dhahabi/
├── 1_split/                    # Sentence-split files (flat structure)
├── 2_translate/                # Translated files (flat structure)
└── 3_insert/                   # Final processed files (flat structure)
```

## Workflow

### Phase 1: Input Preparation

1. Place `.txt` files in the appropriate author folder under `0_inbox/`
2. The folder name determines which author the article will be assigned to
3. Example: `0_inbox/5_ibn_kathir/my_article.txt`

### Phase 2: Splitting

```bash
python main.py --split
```

- Processes all `.txt` files from `0_inbox/`
- Splits text into sentences
- Saves results to `1_split/` with author folder structure
- Reviews split results before proceeding

### Phase 3: Translation

```bash
python main.py --translate
```

- Processes all split files from `1_split/`
- Translates Arabic sentences to English
- Saves results to `2_translate/` with author folder structure
- Reviews translation results before proceeding

### Phase 4: Database Insertion

```bash
python main.py --insert
```

- Processes all translated files from `2_translate/`
- Generates audio for sentences
- Inserts articles into database with correct author assignment
- Archives processed files

### Full Pipeline

```bash
python main.py --split --translate --insert
```

## Author Mapping

The pipeline automatically maps folder names to database authors:

| Folder                         | Author Name                |
| ------------------------------ | -------------------------- |
| `1_al_imam_an_nawawi`          | al-Imam an-Nawawi          |
| `2_ibn_al_qayyim_al_jawziyyah` | Ibn al-Qayyim al-Jawziyyah |
| `3_ibn_taymiyyah`              | Ibn Taymiyyah              |
| `4_ibn_al_jawzi`               | Ibn al-Jawzi               |
| `5_ibn_kathir`                 | Ibn Kathir                 |
| `6_al_imam_al_bukhari`         | al-Imam al-Bukhari         |
| `7_al_imam_muslim`             | al-Imam Muslim             |
| `8_ibn_hajar_al_asqalani`      | Ibn Hajar al-Asqalani      |
| `9_al_imam_malik`              | al-Imam Malik              |
| `10_al_imam_ash_shafii`        | al-Imam ash-Shafii         |
| `11_al_imam_ahmad_ibn_hanbal`  | al-Imam Ahmad ibn Hanbal   |
| `12_al_imam_at_tirmidhi`       | al-Imam at-Tirmidhi        |
| `13_al_imam_as_suyuti`         | al-Imam as-Suyuti          |
| `14_at_tabari`                 | at-Tabari                  |
| `15_al_imam_al_dhahabi`        | al-Imam al-Dhahabi         |

## File Naming Convention

### Input Files

- Place `.txt` files in author folders under `0_inbox/`
- Example: `0_inbox/5_ibn_kathir/my_article.txt`

### Processed Files (Flat Structure)

- **Split files**: `{author_number}_{article_name}_split.json`
- **Translated files**: `{author_number}_{article_name}_translated.json`

### Examples

- Input: `0_inbox/5_ibn_kathir/test_article.txt`
- Split: `1_split/5_test_article_split.json`
- Translated: `2_translate/5_test_article_translated.json`

## Configuration

- Batch size: Default 12, configurable with `--batch-size`
- Default category: "aqeedah"
- Audio generation: Enabled if ElevenLabs API key is available

## Error Handling

- Each phase validates input files before processing
- Failed files are logged with detailed error messages
- Pipeline continues processing other files if one fails
- Duplicate articles are detected and skipped
