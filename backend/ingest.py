from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb
import os


# ==========================================================
# 1. FOLDER SETTINGS
# ==========================================================

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# ==========================================================
# 2. LOAD EMBEDDING MODEL
# ==========================================================

print("Loading embedding model...")

embedding_model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

print("Model loaded!")


# ==========================================================
# 3. CONNECT TO CHROMADB
# ==========================================================

chroma_client = chromadb.PersistentClient(
    path="chroma_db"
)

collection = chroma_client.get_or_create_collection(
    name="enterprise_documents"
)

print("Connected to ChromaDB!")


# ==========================================================
# 4. PROCESS PDF
# ==========================================================

def process_pdf(file_path):

    print(f"\nProcessing: {file_path}")

    # Read PDF
    reader = PdfReader(file_path)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:

            text += page_text + "\n"


    # Check text
    if not text.strip():

        print("No readable text found.")

        return


    # ======================================================
    # 5. SPLIT TEXT INTO CHUNKS
    # ======================================================

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


    print(
        f"Created {len(chunks)} chunks."
    )


    # ======================================================
    # 6. CREATE EMBEDDINGS
    # ======================================================

    embeddings = embedding_model.encode(
        chunks
    ).tolist()


    # ======================================================
    # 7. CREATE IDs
    # ======================================================

    filename = os.path.basename(
        file_path
    )

    ids = []

    for i in range(
        len(chunks)
    ):

        ids.append(
            filename
            + "_chunk_"
            + str(i)
        )


    # ======================================================
    # 8. STORE IN CHROMADB
    # ======================================================

    collection.upsert(

        ids=ids,

        documents=chunks,

        embeddings=embeddings,

        metadatas=[

            {
                "source": filename,
                "chunk": i
            }

            for i in range(
                len(chunks)
            )

        ]

    )


    print(
        f"Successfully stored {filename} in ChromaDB!"
    )


# ==========================================================
# 9. PROCESS ALL PDFs
# ==========================================================

if __name__ == "__main__":

    files = os.listdir(
        UPLOAD_FOLDER
    )

    pdf_files = [

        file

        for file in files

        if file.lower().endswith(".pdf")

    ]


    if not pdf_files:

        print(
            "No PDF files found in uploads folder."
        )

    else:

        for file in pdf_files:

            file_path = os.path.join(
                UPLOAD_FOLDER,
                file
            )

            process_pdf(
                file_path
            )


    print("\nPDF processing completed!")