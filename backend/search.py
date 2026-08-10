from sentence_transformers import SentenceTransformer
import chromadb


# -----------------------------------------
# 1. Load embedding model
# -----------------------------------------

print("Loading embedding model...")

model = SentenceTransformer("all-MiniLM-L6-v2")

print("Model loaded!")


# -----------------------------------------
# 2. Connect to ChromaDB
# -----------------------------------------

client = chromadb.PersistentClient(path="chroma_db")

collection = client.get_or_create_collection(
    name="enterprise_documents"
)

print("Connected to ChromaDB!")


# -----------------------------------------
# 3. Ask a question
# -----------------------------------------

question = input("\nAsk a question about your PDFs: ")

print("\nSearching documents...")


# -----------------------------------------
# 4. Convert question into embedding
# -----------------------------------------

question_embedding = model.encode(question).tolist()


# -----------------------------------------
# 5. Search ChromaDB
# -----------------------------------------

results = collection.query(
    query_embeddings=[question_embedding],
    n_results=3
)


# -----------------------------------------
# 6. Display results
# -----------------------------------------

print("\n========== SEARCH RESULTS ==========\n")


documents = results["documents"][0]
metadatas = results["metadatas"][0]


for i in range(len(documents)):

    print("Result", i + 1)

    print("Source:", metadatas[i]["source"])

    print("Content:")
    print(documents[i])

    print("\n-----------------------------------\n")