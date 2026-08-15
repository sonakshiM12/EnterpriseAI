from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb

from dotenv import load_dotenv
from groq import Groq

import os
import re
from datetime import datetime

# ==========================================================
# 1. ENVIRONMENT
# ==========================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY environment variable is missing")


# ==========================================================
# 2. APP
# ==========================================================

app = FastAPI(
    title="Enterprise AI Knowledge Assistant",
    description="AI-powered Enterprise RAG Knowledge Assistant",
    version="4.0"
)


# ==========================================================
# 3. CORS
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================================
# 4. DIRECTORIES
# ==========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

UPLOAD_FOLDER = os.path.join(
    BASE_DIR,
    "uploads"
)

CHROMA_FOLDER = os.path.join(
    BASE_DIR,
    "chroma_db"
)

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================================
# 5. EMBEDDING MODEL
# ==========================================================

embedding_model = None


def get_embedding_model():

    global embedding_model

    if embedding_model is None:

        print("Loading embedding model...")

        embedding_model = SentenceTransformer(
            "all-MiniLM-L6-v2",
            device="cpu"
        )

        print("Embedding model loaded successfully!")

    return embedding_model


# ==========================================================
# 6. CHROMADB
# ==========================================================

print("Connecting to ChromaDB...")

chroma_client = chromadb.PersistentClient(
    path=CHROMA_FOLDER
)

collection = chroma_client.get_or_create_collection(
    name="enterprise_documents"
)

print("ChromaDB connected successfully!")


# ==========================================================
# 7. GROQ
# ==========================================================

groq_client = Groq(
    api_key=api_key
)

print("Groq AI connected successfully!")


# ==========================================================
# 8. CHAT HISTORY
# ==========================================================

chat_history = []


# ==========================================================
# 9. HOME
# ==========================================================

@app.get("/")
def home():

    return {
        "success": True,
        "message": "Enterprise AI Knowledge Assistant is running!"
    }


# ==========================================================
# 10. HEALTH
# ==========================================================

@app.get("/health")
def health():

    return {
        "success": True,
        "status": "online",
        "chunks": collection.count(),
        "documents": get_document_count(),
        "chat_messages": len(chat_history)
    }


# ==========================================================
# 11. TEXT CLEANING
# ==========================================================

def clean_text(text):

    if not text:
        return ""

    text = text.replace(
        "\x00",
        " "
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ==========================================================
# 12. CHUNKING
# ==========================================================

def create_chunks(
    text,
    chunk_size=250,
    overlap=50
):

    words = text.split()

    chunks = []

    if not words:
        return chunks

    start = 0

    while start < len(words):

        end = min(
            start + chunk_size,
            len(words)
        )

        chunk = " ".join(
            words[start:end]
        )

        if chunk.strip():

            chunks.append(
                chunk.strip()
            )

        if end >= len(words):
            break

        start = end - overlap

    return chunks


# ==========================================================
# 13. DELETE DOCUMENT CHUNKS
# ==========================================================

def delete_document_chunks(filename):

    try:

        result = collection.get(
            where={
                "source": filename
            }
        )

        ids = result.get(
            "ids",
            []
        )

        if ids:

            collection.delete(
                ids=ids
            )

        return len(ids)

    except Exception as e:

        print(
            "Delete chunks error:",
            e
        )

        return 0


# ==========================================================
# 14. DOCUMENT COUNT
# ==========================================================

def get_document_count():

    try:

        result = collection.get(
            include=["metadatas"]
        )

        metadatas = result.get(
            "metadatas",
            []
        ) or []

        names = set()

        for metadata in metadatas:

            if metadata:

                source = metadata.get(
                    "source"
                )

                if source:
                    names.add(source)

        return len(names)

    except Exception:

        return 0


# ==========================================================
# 15. UPLOAD PDF
# ==========================================================

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...)
):

    if not file.filename:

        return {
            "success": False,
            "error": "No file selected."
        }

    if not file.filename.lower().endswith(".pdf"):

        return {
            "success": False,
            "error": "Only PDF files are allowed."
        }

    filename = os.path.basename(
        file.filename
    )

    file_path = os.path.join(
        UPLOAD_FOLDER,
        filename
    )

    try:

        content = await file.read()

        with open(
            file_path,
            "wb"
        ) as buffer:

            buffer.write(content)

    except Exception as e:

        return {
            "success": False,
            "error": f"Could not save PDF: {str(e)}"
        }

    try:

        reader = PdfReader(
            file_path
        )

    except Exception as e:

        return {
            "success": False,
            "error": f"Could not read PDF: {str(e)}"
        }

    # Remove old version

    delete_document_chunks(
        filename
    )

    all_chunks = []
    all_metadatas = []
    all_ids = []

    # ======================================================
    # PAGE PROCESSING
    # ======================================================

    for page_number, page in enumerate(
        reader.pages,
        start=1
    ):

        try:

            page_text = (
                page.extract_text()
                or ""
            )

        except Exception as e:

            print(
                f"Page {page_number} error:",
                e
            )

            page_text = ""

        page_text = clean_text(
            page_text
        )

        if not page_text:
            continue

        page_chunks = create_chunks(
            page_text,
            chunk_size=250,
            overlap=50
        )

        for chunk_number, chunk in enumerate(
            page_chunks
        ):

            chunk_id = (
                f"{filename}"
                f"_page_{page_number}"
                f"_chunk_{chunk_number}"
            )

            all_chunks.append(
                chunk
            )

            all_metadatas.append(
                {
                    "source": filename,
                    "page": page_number,
                    "chunk": chunk_number
                }
            )

            all_ids.append(
                chunk_id
            )

    if not all_chunks:

        return {
            "success": False,
            "error": "No readable text found in the PDF."
        }

    # ======================================================
    # EMBEDDINGS
    # ======================================================

    print(
        f"Creating embeddings for {filename}..."
    )

    model = get_embedding_model()

    embeddings = model.encode(
        all_chunks,
        normalize_embeddings=True,
        show_progress_bar=False
    ).tolist()

    # ======================================================
    # STORE
    # ======================================================

    collection.upsert(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadatas
    )

    print(
        f"Successfully indexed {filename}"
    )

    return {
        "success": True,
        "filename": filename,
        "pages": len(reader.pages),
        "chunks": len(all_chunks),
        "message":
        "PDF uploaded and indexed successfully."
    }


# ==========================================================
# 16. LIST DOCUMENTS
# ==========================================================

@app.get("/documents")
def get_documents():

    try:

        result = collection.get(
            include=["metadatas"]
        )

        metadatas = (
            result.get(
                "metadatas"
            )
            or []
        )

        document_data = {}

        for metadata in metadatas:

            if not metadata:
                continue

            source = metadata.get(
                "source"
            )

            if not source:
                continue

            if source not in document_data:

                document_data[source] = {
                    "filename": source,
                    "pages": set(),
                    "chunks": 0
                }

            page = metadata.get(
                "page"
            )

            if page is not None:

                document_data[source]["pages"].add(
                    page
                )

            document_data[source]["chunks"] += 1

        documents = []

        for filename, info in document_data.items():

            documents.append(
                {
                    "filename": filename,
                    "pages": len(info["pages"]),
                    "chunks": info["chunks"]
                }
            )

        documents.sort(
            key=lambda x:
            x["filename"].lower()
        )

        return {
            "success": True,
            "documents": documents,
            "count": len(documents)
        }

    except Exception as e:

        return {
            "success": False,
            "documents": [],
            "error": str(e)
        }


# ==========================================================
# 17. DELETE DOCUMENT
# ==========================================================

@app.delete(
    "/documents/{filename}"
)
def delete_document(
    filename: str
):

    try:

        filename = os.path.basename(
            filename
        )

        deleted_chunks = (
            delete_document_chunks(
                filename
            )
        )

        file_path = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        file_deleted = False

        if os.path.exists(
            file_path
        ):

            os.remove(
                file_path
            )

            file_deleted = True

        return {
            "success": True,
            "filename": filename,
            "deleted_chunks":
            deleted_chunks,
            "file_deleted":
            file_deleted,
            "message":
            "Document deleted successfully."
        }

    except Exception as e:

        return {
            "success": False,
            "error":
            f"Could not delete document: {str(e)}"
        }


# ==========================================================
# 18. QUESTION MODEL
# ==========================================================

class Question(BaseModel):

    question: str

    document_filter: list[str] = []


# ==========================================================
# 19. RAG QUALITY
# ==========================================================

def calculate_rag_quality(
    distances
):

    if not distances:

        return {
            "score": 0,
            "status": "NO_RETRIEVAL"
        }

    average_distance = (
        sum(distances)
        /
        len(distances)
    )

    score = (
        1 /
        (1 + average_distance)
    ) * 100

    score = round(
        max(
            0,
            min(
                score,
                100
            )
        ),
        2
    )

    if score >= 70:

        status = "GOOD"

    elif score >= 50:

        status = "MODERATE"

    else:

        status = "LOW"

    return {
        "score": score,
        "status": status,
        "average_distance":
        round(
            average_distance,
            4
        )
    }


# ==========================================================
# 20. ASK AI
# ==========================================================

@app.post("/ask")
async def ask_ai(
    data: Question
):

    question = data.question.strip()

    selected_documents = (
        data.document_filter
    )

    if not question:

        return {
            "success": False,
            "answer":
            "Please enter a question.",
            "sources": []
        }

    total_chunks = collection.count()

    if total_chunks == 0:

        return {
            "success": False,
            "answer":
            "Please upload a PDF before asking a question.",
            "sources": []
        }

    # ======================================================
    # DOCUMENT FILTER
    # ======================================================

    filter_condition = None

    if selected_documents:

        if len(selected_documents) == 1:

            filter_condition = {
                "source":
                selected_documents[0]
            }

        else:

            filter_condition = {
                "$or": [
                    {
                        "source":
                        filename
                    }
                    for filename in selected_documents
                ]
            }

    # ======================================================
    # QUESTION EMBEDDING
    # ======================================================

    try:

        model = get_embedding_model()

        question_embedding = (
            model.encode(
                question,
                normalize_embeddings=True
            )
            .tolist()
        )

    except Exception as e:

        return {
            "success": False,
            "answer":
            f"Embedding error: {str(e)}",
            "sources": []
        }

    number_of_results = min(
        12,
        total_chunks
    )

    # ======================================================
    # RETRIEVAL
    # ======================================================

    query_arguments = {

        "query_embeddings": [
            question_embedding
        ],

        "n_results":
        number_of_results,

        "include": [
            "documents",
            "metadatas",
            "distances"
        ]
    }

    if filter_condition:

        query_arguments["where"] = (
            filter_condition
        )

    try:

        results = collection.query(
            **query_arguments
        )

    except Exception as e:

        return {
            "success": False,
            "answer":
            f"Retrieval error: {str(e)}",
            "sources": []
        }

    documents = (
        results.get(
            "documents",
            [[]]
        )[0]
    )

    metadatas = (
        results.get(
            "metadatas",
            [[]]
        )[0]
    )

    distances = (
        results.get(
            "distances",
            [[]]
        )[0]
    )

    if not documents:

        return {
            "success": True,
            "answer":
            "I couldn't find this information in the uploaded documents.",
            "sources": [],
            "documents": [],
            "rag_evaluation": {
                "retrieval_score": 0,
                "status":
                "NO_RETRIEVAL",
                "chunks_retrieved": 0
            }
        }

    # ======================================================
    # QUALITY
    # ======================================================

    rag_quality = calculate_rag_quality(
        distances
    )

    # ======================================================
    # BUILD CONTEXT
    # ======================================================

    context_parts = []

    for i in range(
        len(documents)
    ):

        metadata = metadatas[i]

        source = metadata.get(
            "source",
            "Unknown"
        )

        page = metadata.get(
            "page",
            "Unknown"
        )

        chunk_number = metadata.get(
            "chunk",
            0
        )

        context_parts.append(
            f"""
SOURCE_ID: [{i + 1}]
DOCUMENT: {source}
PAGE: {page}
CHUNK: {chunk_number}

CONTENT:
{documents[i]}
"""
        )

    context = "\n".join(
        context_parts
    )

    # ======================================================
    # GROUNDED PROMPT
    # ======================================================

    prompt = f"""
You are EnterpriseAI, a strict enterprise
document-grounded knowledge assistant.

Answer the user's question ONLY using
the retrieved document context below.

RULES:

1. Never use outside knowledge.

2. Never invent facts.

3. Carefully inspect all retrieved sources.

4. If the answer is present, explain it clearly.

5. Every factual claim should include a citation:

[Source 1, Page 5]

6. Use the exact SOURCE_ID provided.

7. If multiple sources support an answer,
cite multiple sources.

8. If the context does not contain enough
information, say:

"I couldn't find this information in the uploaded documents."

9. Do not create fake citations.

10. Do not cite sources that do not support
the statement.

RETRIEVED DOCUMENT CONTEXT:

{context}

USER QUESTION:

{question}
"""

    # ======================================================
    # GROQ
    # ======================================================

    try:

        response = (
            groq_client
            .chat
            .completions
            .create(

                model=
                "llama-3.3-70b-versatile",

                messages=[

                    {
                        "role":
                        "system",

                        "content":
                        """
You are a strict document-grounded
Enterprise AI assistant.

Never hallucinate.
Never use outside knowledge.
Always cite the supplied source IDs.
"""
                    },

                    {
                        "role":
                        "user",

                        "content":
                        prompt
                    }

                ],

                temperature=0,

                max_tokens=1200
            )
        )

    except Exception as e:

        print(
            "Groq error:",
            e
        )

        return {
            "success": False,
            "answer":
            f"AI service error: {str(e)}",
            "sources": []
        }

    answer = (
        response
        .choices[0]
        .message
        .content
        .strip()
    )

    # ======================================================
    # SOURCES
    # ======================================================

    sources = []

    for i in range(
        len(metadatas)
    ):

        metadata = metadatas[i]

        sources.append(
            {
                "source_id":
                i + 1,

                "source":
                metadata.get(
                    "source",
                    "Unknown"
                ),

                "page":
                metadata.get(
                    "page",
                    "Unknown"
                ),

                "chunk":
                metadata.get(
                    "chunk",
                    0
                ),

                "distance":
                round(
                    distances[i],
                    4
                )
                if i < len(distances)
                else None
            }
        )

    # ======================================================
    # UNIQUE DOCUMENTS
    # ======================================================

    unique_documents = []

    for source in sources:

        filename = source["source"]

        if filename not in unique_documents:

            unique_documents.append(
                filename
            )

    # ======================================================
    # CHAT HISTORY
    # ======================================================

    history_item = {

        "id":
        len(chat_history) + 1,

        "question":
        question,

        "answer":
        answer,

        "documents":
        unique_documents,

        "retrieval_score":
        rag_quality["score"],

        "timestamp":
        datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )
    }

    chat_history.append(
        history_item
    )

    if len(chat_history) > 100:

        chat_history.pop(0)

    # ======================================================
    # RESPONSE
    # ======================================================

    return {

        "success":
        True,

        "answer":
        answer,

        "sources":
        sources,

        "documents":
        unique_documents,

        "rag_evaluation": {

            "retrieval_score":
            rag_quality["score"],

            "status":
            rag_quality["status"],

            "average_distance":
            rag_quality.get(
                "average_distance",
                0
            ),

            "chunks_retrieved":
            len(documents)
        }
    }


# ==========================================================
# 21. CHAT HISTORY API
# ==========================================================

@app.get("/chat-history")
def get_chat_history():

    return {

        "success":
        True,

        "history":
        list(
            reversed(
                chat_history
            )
        )
    }


# ==========================================================
# 22. CLEAR CHAT HISTORY
# ==========================================================

@app.delete("/chat-history")
def clear_chat_history():

    chat_history.clear()

    return {

        "success":
        True,

        "message":
        "Chat history cleared successfully."
    }


# ==========================================================
# 23. DASHBOARD STATISTICS
# ==========================================================

@app.get("/statistics")
def statistics():

    try:

        result = collection.get(
            include=["metadatas"]
        )

        metadatas = (
            result.get(
                "metadatas",
                []
            )
            or []
        )

        documents = set()

        pages = set()

        for metadata in metadatas:

            if not metadata:
                continue

            source = metadata.get(
                "source"
            )

            page = metadata.get(
                "page"
            )

            if source:

                documents.add(
                    source
                )

            if source and page:

                pages.add(
                    f"{source}_{page}"
                )

        average_score = 0

        if chat_history:

            scores = [
                h.get(
                    "retrieval_score",
                    0
                )
                for h in chat_history
            ]

            average_score = round(
                sum(scores) /
                len(scores),
                2
            )

        return {

            "success":
            True,

            "documents":
            len(documents),

            "pages":
            len(pages),

            "chunks":
            collection.count(),

            "questions":
            len(chat_history),

            "average_retrieval_score":
            average_score
        }

    except Exception as e:

        return {

            "success":
            False,

            "error":
            str(e)
        }