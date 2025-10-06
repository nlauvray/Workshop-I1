import base64
from g4f.client import Client
from huggingface_hub import InferenceClient

# G4F client
_g4f_client = Client()

def np(prompt: str, model: str = "gpt-4o-mini", web_search: bool = False) -> None:
    response = _g4f_client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        web_search=web_search
    )
    print(response.choices[0].message.content)


_encoded_key = "aGZfVk5uTHdmVHJIWkFVQmNMRFJXWFd1SndUQXB6WEt5Z1BSego="

# Decode at runtime
HF_TOKEN = base64.b64decode(_encoded_key).decode()

_hf_client = InferenceClient(
    "mistralai/Mistral-7B-Instruct-v0.2",
    token=HF_TOKEN
)

def pd(prompt: str, max_tokens: int = 2000) -> None:
    messages = [{"role": "user", "content": prompt}]
    response = _hf_client.chat_completion(
        messages=messages,
        max_tokens=max_tokens
    )
    text = response.choices[0].message["content"]
    print(text.replace("\\n", "\n"))
