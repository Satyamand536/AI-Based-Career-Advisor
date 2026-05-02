import base64
import requests
import os
from dotenv import load_dotenv

load_dotenv('ai/.env')

def silent_test():
    b64 = os.getenv("OPENROUTER_API_KEY_B64")
    if not b64:
        print("B64 MISSING")
        return
    
    # DO NOT PRINT THE KEY
    key = base64.b64decode(b64.strip()).decode().strip()
    
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    }
    
    # Try a different stable model
    model = "meta-llama/llama-3.1-8b-instruct:free"
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": "hi"}]
    }
    
    print("--- SILENT TEST START ---")
    try:
        r = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload, timeout=20)
        print(f"STATUS: {r.status_code}")
        if r.status_code == 200:
            print("🚀 SUCCESS (200 OK)")
            # Print only first 20 chars of response
            print(f"REPLY PREVIEW: {r.json()['choices'][0]['message']['content'][:20]}...")
        else:
            print(f"FAIL: {r.status_code}")
            # Do NOT print the whole body if it contains the key
            print(f"ERROR TYPE (JSON?): {'choices' in r.text}")
    except Exception as e:
        print(f"ERROR: {type(e).__name__}")
    print("--- SILENT TEST END ---")

if __name__ == "__main__":
    silent_test()
