from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

import chromadb

from dotenv import load_dotenv
from groq import Groq

import os


# ==========================================================
# 1. LOAD ENVIRONMENT VARIABLES
# ==========================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in .env file")


# ==========================================================
# 2. CREATE FASTAPI APPLICATION
# ==========================================================

app = FastAPI(
    title="Enterprise AI Knowledge Assistant",
    description="AI-powered document question answering system",
    version="1.0"
)


# ==========================================================
# 3. ENABLE CORS
# ==========================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)




# ==========================================================
# 4. UPLOAD FOLDER
# ==========================================================

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================================
# 5. LOAD EMBEDDING MODEL
# ==========================================================

print("Loading embedding model...")

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

print("Embedding model loaded successfully!")


# ==========================================================
# 6. CONNECT TO CHROMADB
# ==========================================================

print("Connecting to ChromaDB...")

chroma_client = chromadb.PersistentClient(
    path="chroma_db"
)

collection = chroma_client.get_or_create_collection(
    name="enterprise_documents"
)

print("ChromaDB connected successfully!")


# ==========================================================
# 7. CONNECT TO GROQ
# ==========================================================

print("Connecting to Groq AI...")

groq_client = Groq(
    api_key=api_key
)

print("Groq AI connected successfully!")


# ==========================================================
# 8. HOME ENDPOINT
# ==========================================================

@app.get("/")
def home():

    return {
        "message": "Enterprise AI Knowledge Assistant is running!"
    }


# ==========================================================
# 9. UPLOAD PDF
# ==========================================================

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...)
):

    # ------------------------------------------------------
    # Check file type
    # ------------------------------------------------------

    if not file.filename.lower().endswith(".pdf"):

        return {
            "success": False,
            "error": "Only PDF files are allowed."
        }


    # ------------------------------------------------------
    # Save PDF
    # ------------------------------------------------------

    file_path = os.path.join(
        UPLOAD_FOLDER,
        file.filename
    )

    with open(
        file_path,
        "wb"
    ) as buffer:

        content = await file.read()

        buffer.write(content)


    # ------------------------------------------------------
    # Read PDF
    # ------------------------------------------------------

    try:

        reader = PdfReader(
            file_path
        )

    except Exception as e:

        return {
            "success": False,
            "error": f"Could not read PDF: {str(e)}"
        }


    # ------------------------------------------------------
    # Extract text
    # ------------------------------------------------------

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:

            text += page_text + "\n"


    # ------------------------------------------------------
    # Check extracted text
    # ------------------------------------------------------

    if not text.strip():

        return {
            "success": False,
            "error": "No readable text found in the PDF."
        }


    # ------------------------------------------------------
    # Split text into chunks
    # ------------------------------------------------------

    words = text.split()

    chunks = []

    chunk_size = 500

    for i in range(
        0,
        len(words),
        chunk_size
    ):

        chunk = " ".join(
            words[i:i + chunk_size]
        )

        if chunk.strip():

            chunks.append(chunk)


    # ------------------------------------------------------
    # Create embeddings
    # ------------------------------------------------------

    embeddings = embedding_model.encode(
        chunks
    ).tolist()


    # ------------------------------------------------------
    # Create unique IDs
    # ------------------------------------------------------

    ids = []

    for i in range(
        len(chunks)
    ):

        ids.append(
            file.filename
            + "_chunk_"
            + str(i)
        )


    # ------------------------------------------------------
    # Store documents in ChromaDB
    # ------------------------------------------------------

    collection.upsert(

        ids=ids,

        documents=chunks,

        embeddings=embeddings,

        metadatas=[

            {
                "source": file.filename,
                "chunk": i
            }

            for i in range(
                len(chunks)
            )

        ]

    )


    # ------------------------------------------------------
    # Return upload information
    # ------------------------------------------------------

    return {

        "success": True,

        "filename": file.filename,

        "pages": len(
            reader.pages
        ),

        "chunks": len(
            chunks
        ),

        "message":
        "PDF uploaded and processed successfully!"

    }


# ==========================================================
# 10. QUESTION MODEL
# ==========================================================

class Question(BaseModel):

    question: str


# ==========================================================
# 11. ASK AI
# ==========================================================

@app.post("/ask")
async def ask_ai(
    data: Question
):

    question = data.question.strip()


    # ------------------------------------------------------
    # Validate question
    # ------------------------------------------------------

    if not question:

        return {

            "success": False,

            "answer":
            "Please enter a question.",

            "sources": []

        }


    # ------------------------------------------------------
    # Check if documents exist
    # ------------------------------------------------------

    if collection.count() == 0:

        return {

            "success": False,

            "answer":
            "Please upload a PDF before asking a question.",

            "sources": []

        }


    # ------------------------------------------------------
    # Convert question into embedding
    # ------------------------------------------------------

    question_embedding = embedding_model.encode(
        question
    ).tolist()


    # ------------------------------------------------------
    # Search ChromaDB
    # ------------------------------------------------------

    results = collection.query(

        query_embeddings=[
            question_embedding
        ],

        n_results=3

    )


    documents = results["documents"][0]

    metadatas = results["metadatas"][0]


    # ------------------------------------------------------
    # Build context
    # ------------------------------------------------------

    context = ""

    for i in range(
        len(documents)
    ):

        context += f"""
SOURCE:
{metadatas[i]["source"]}

CONTENT:
{documents[i]}

-------------------------
"""


    # ------------------------------------------------------
    # AI prompt
    # ------------------------------------------------------

    prompt = f"""
You are an Enterprise AI Knowledge Assistant.

Your job is to answer the user's question using ONLY
the information provided in the document context.

Rules:

1. Do not invent information.
2. Do not use outside knowledge.
3. Give a clear and easy-to-understand answer.
4. You may summarize or rephrase the document.
5. If the answer is not present in the documents, say:

"I couldn't find this information in the uploaded documents."

DOCUMENT CONTEXT:

{context}

USER QUESTION:

{question}
"""


    # ------------------------------------------------------
    # Send request to Groq
    # ------------------------------------------------------

    try:

        response = groq_client.chat.completions.create(

            model="llama-3.3-70b-versatile",

            messages=[

                {
                    "role": "system",

                    "content":
                    "You are a helpful enterprise knowledge assistant."
                },

                {
                    "role": "user",

                    "content": prompt
                }

            ],

            temperature=0

        )

    except Exception as e:

        return {

            "success": False,

            "answer":
            f"AI service error: {str(e)}",

            "sources": []

        }


    # ------------------------------------------------------
    # Get AI answer
    # ------------------------------------------------------

    answer = response.choices[0].message.content


    # ------------------------------------------------------
    # Get unique sources
    # ------------------------------------------------------

    sources = list(
        dict.fromkeys(
            metadata["source"]
            for metadata in metadatas
        )
    )


    # ------------------------------------------------------
    # Return final response
    # ------------------------------------------------------

    return {

        "success": True,

        "answer": answer,

        "sources": sources

    }