import os

from dotenv import load_dotenv
from groq import Groq

from sentence_transformers import SentenceTransformer
import chromadb


# --------------------------------------------------
# 1. Load environment variables
# --------------------------------------------------

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")


# --------------------------------------------------
# 2. Connect to Groq
# --------------------------------------------------

groq_client = Groq(api_key=api_key)


# --------------------------------------------------
# 3. Load embedding model
# --------------------------------------------------

print("Loading embedding model...")

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

print("Embedding model loaded!")


# --------------------------------------------------
# 4. Connect to ChromaDB
# --------------------------------------------------

chroma_client = chromadb.PersistentClient(
    path="chroma_db"
)

collection = chroma_client.get_or_create_collection(
    name="enterprise_documents"
)

print("Connected to ChromaDB!")


# --------------------------------------------------
# 5. Ask question
# --------------------------------------------------

question = input("\nAsk your question: ")


# --------------------------------------------------
# 6. Convert question to embedding
# --------------------------------------------------

question_embedding = embedding_model.encode(
    question
).tolist()


# --------------------------------------------------
# 7. Retrieve relevant PDF chunks
# --------------------------------------------------

results = collection.query(
    query_embeddings=[question_embedding],
    n_results=3
)


documents = results["documents"][0]

metadatas = results["metadatas"][0]


# --------------------------------------------------
# 8. Build context
# --------------------------------------------------

context = ""

for i in range(len(documents)):

    context += f"""
Source: {metadatas[i]["source"]}

Content:
{documents[i]}

-------------------------
"""


# --------------------------------------------------
# 9. Send context + question to LLM
# --------------------------------------------------

prompt = f"""
You are an Enterprise AI Knowledge Assistant.

Answer the user's question using ONLY the information
provided in the document context below.

If the answer cannot be found in the context,
say:

"I couldn't find this information in the uploaded documents."

Do not invent information.

DOCUMENT CONTEXT:

{context}

USER QUESTION:

{question}
"""


# --------------------------------------------------
# 10. Generate answer
# --------------------------------------------------

response = groq_client.chat.completions.create(

    model="llama-3.3-70b-versatile",

    messages=[
        {
            "role": "system",
            "content": "You are a helpful enterprise knowledge assistant."
        },
        {
            "role": "user",
            "content": prompt
        }
    ],

    temperature=0
)


# --------------------------------------------------
# 11. Display answer
# --------------------------------------------------

answer = response.choices[0].message.content


print("\n===================================")
print("AI ANSWER")
print("===================================\n")

print(answer)


print("\n===================================")
print("SOURCES")
print("===================================")

for metadata in metadatas:

    print("-", metadata["source"])