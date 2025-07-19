# Arabic Translation Pipeline

## Command Line Arguments

| Argument       | Description                                         |
| -------------- | --------------------------------------------------- |
| `--split`      | Split input.txt into sentences and review           |
| `--translate`  | Translate split file and review                     |
| `--insert`     | Process through ElevenLabs and insert into database |
| `--batch-size` | Batch size for translation (1-10)                   |

## Examples

```bash
# Split input.txt and review
python main.py --split

# Translate split file and review
python main.py --translate

# Insert into database
python main.py --insert

# Split then translate
python main.py --split --translate

# Translate then insert
python main.py --translate --insert

# Full pipeline
python main.py --split --translate --insert
```
