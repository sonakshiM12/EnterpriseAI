# EnterpriseAI – AI-Powered Enterprise Knowledge Assistant

EnterpriseAI is a **Retrieval-Augmented Generation (RAG)** application that allows organizations to upload PDF documents and ask questions in natural language. It retrieves the most relevant document sections using semantic search and generates grounded answers with source citations.

## Features

* Upload and index multiple PDF documents
* Semantic search using Sentence Transformers
* ChromaDB vector database for fast retrieval
* AI-generated answers powered by Groq Llama 3.3 70B
* Source citations with page numbers
* RAG quality evaluation dashboard
* Document management (upload/delete)
* Modern React + FastAPI architecture

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Frontend   | React + Vite                         |
| Backend    | FastAPI                              |
| Embeddings | Sentence Transformers (MiniLM-L6-v2) |
| Vector DB  | ChromaDB                             |
| LLM        | Groq (Llama 3.3 70B)                 |
| Language   | Python + JavaScript                  |

## Project Architecture

```text
EnterpriseAI/
│
├── backend/
│   ├── main.py
│   ├── ingest.py
│   ├── requirements.txt
│   ├── uploads/
│   └── chroma_db/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
└── README.md
```

## How It Works

1. Upload one or more PDF documents.
2. Extract text page by page.
3. Split text into overlapping chunks.
4. Convert chunks into embeddings.
5. Store embeddings in ChromaDB.
6. Retrieve the most relevant chunks for a question.
7. Generate a grounded answer using Groq AI.
8. Display answer with sources and RAG score.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/EnterpriseAI.git
cd EnterpriseAI
```

### 2. Backend Setup

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

pip install -r requirements.txt
```

Create a `.env` file inside `backend/`

```env
GROQ_API_KEY=your_groq_api_key
```

Run the backend

```bash
uvicorn main:app --reload
```

Backend runs at:

```text
http://127.0.0.1:8000
```

### 3. Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## API Endpoints

| Method | Endpoint                | Description            |
| ------ | ----------------------- | ---------------------- |
| GET    | `/`                     | API status             |
| GET    | `/health`               | Health check           |
| POST   | `/upload-pdf`           | Upload PDF             |
| GET    | `/documents`            | List indexed documents |
| DELETE | `/documents/{filename}` | Delete document        |
| POST   | `/ask`                  | Ask questions          |

## Screenshots

Add screenshots after deployment:

* Home Page
* Workspace
* AI Answer
* RAG Dashboard

## Future Improvements

* Chat history
* Document filtering
* User authentication
* Role-based access
* Cloud deployment
* OCR support for scanned PDFs

## Why This Project?

EnterpriseAI demonstrates real-world **Generative AI engineering** skills including:

* Retrieval-Augmented Generation (RAG)
* Vector databases
* Semantic search
* LLM integration
* Full-stack AI application development
* Production-style API architecture

## Author

**Sonakshi Mishra**

B.Tech CSE (AI & ML)

GitHub: https://github.com/YOUR_USERNAME
