from gpt4all import GPT4All

# Use your actual path to the downloaded model file
model_path = r"D:\gpt4\download\mistral-7b-instruct-v0.1.Q4_0.gguf"
gpt4all_model = GPT4All(model_path)

def generate_llm_response(prompt: str, max_tokens=512):
    return gpt4all_model.generate(prompt, max_tokens=max_tokens)
