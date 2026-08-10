from sentence_transformers import SentenceTransformer

model = SentenceTransformer("all-MiniLM-L6-v2")

text = "Employees are allowed 12 casual leaves per year."

embedding = model.encode(text)

print("Embedding created successfully!")
print("Embedding size:", len(embedding))
print("First 5 values:", embedding[:5])