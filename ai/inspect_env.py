import os
from dotenv import load_dotenv

# Try without load_dotenv first
print(f"BEFORE LOAD: {os.getenv('OPENROUTER_API_KEY')}")

load_dotenv('ai/.env')
val = os.getenv('OPENROUTER_API_KEY')
print(f"AFTER LOAD: {repr(val)}")
