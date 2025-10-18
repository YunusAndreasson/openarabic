import os

# WARNING: Do not commit actual API keys to version control!
# Replace these placeholder values with your actual API keys
# You can also set these as environment variables instead

os.environ["SUPABASE_URL"] = "https://kkmnzbeugdoajtzfjkxg.supabase.co"
os.environ["SUPABASE_KEY"] = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrbW56YmV1Z2RvYWp0emZqa3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU3ODk1NDQsImV4cCI6MjA0MTM2NTU0NH0.AjF-MzqjnUuERhgtYMwJKpDtNKBFKXjEmSMqUPeM1Os"
)
os.environ["ELEVENLABS_API_KEY"] = "REDACTED_LEAKED_KEY"
os.environ["OPENAI_API_KEY"] = (
    "REDACTED_LEAKED_KEY"
)

# OpenRouter API key for validation
os.environ["OPENROUTER_API_KEY"] = (
    "REDACTED_LEAKED_KEY"
)

# Google Cloud configuration
# Uses service account authentication with openarabic-3711db289212.json
os.environ["GOOGLE_CLOUD_PROJECT_ID"] = "openarabic"
os.environ["GOOGLE_CLOUD_CREDENTIALS_PATH"] = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "openarabic-3711db289212.json",
)
