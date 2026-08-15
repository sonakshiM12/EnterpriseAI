import os
import json
import re

from pypdf import PdfReader


UPLOAD_FOLDER = "uploads"
DATA_FILE = "documents.json"


os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


def process_pdf(file_path):

    print(
        f"\nProcessing: {file_path}"
    )

    reader = PdfReader(
        file_path
    )

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:

            text += page_text + "\n"


    if not text.strip():

        print(
            "No readable text found."
        )

        return


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


    filename = os.path.basename(
        file_path
    )


    documents = []

    if os.path.exists(DATA_FILE):

        try:

            with open(
                DATA_FILE,
                "r",
                encoding="utf-8"
            ) as f:

                documents = json.load(f)

        except Exception:

            documents = []


    # Remove old version
    documents = [
        document
        for document in documents
        if document["source"] != filename
    ]


    # Add new chunks
    for i, chunk in enumerate(chunks):

        documents.append(
            {
                "source": filename,
                "chunk": i,
                "content": chunk
            }
        )


    with open(
        DATA_FILE,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            documents,
            f,
            ensure_ascii=False,
            indent=2
        )


    print(
        f"Successfully stored {filename}"
    )

    print(
        f"Created {len(chunks)} chunks."
    )


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


    print(
        "\nPDF processing completed!"
    )