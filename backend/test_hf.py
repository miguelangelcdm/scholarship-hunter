import os
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace
from dotenv import load_dotenv

load_dotenv(".env")
api_key = os.getenv("HUGGINGFACEHUB_API_TOKEN")

models = [
    "Qwen/Qwen2.5-7B-Instruct",
    "meta-llama/Llama-3.2-3B-Instruct",
    "HuggingFaceH4/zephyr-7b-beta"
]

for model in models:
    print(f"Testing ChatHuggingFace with {model}...")
    try:
        llm = HuggingFaceEndpoint(
            repo_id=model,
            task="text-generation",
            max_new_tokens=50,
            huggingfacehub_api_token=api_key
        )
        chat = ChatHuggingFace(llm=llm)
        response = chat.invoke("What is 2+2? Answer in one word.")
        print("Success!", response.content)
        break
    except Exception as e:
        print("Failed:", e)
