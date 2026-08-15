import { useEffect, useRef, useState } from "react";
import "./index.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

export default function App() {

  // ========================================================
  // STATE
  // ========================================================

  const [showWorkspace, setShowWorkspace] =
    useState(false);

  const [files, setFiles] =
    useState([]);

  const [documents, setDocuments] =
    useState([]);

  const [uploading, setUploading] =
    useState(false);

  const [deleting, setDeleting] =
    useState("");

  const [uploadMessage, setUploadMessage] =
    useState("");

  const [question, setQuestion] =
    useState("");

  const [asking, setAsking] =
    useState(false);

  const [answer, setAnswer] =
    useState("");

  const [sources, setSources] =
    useState([]);

  const [ragEvaluation, setRagEvaluation] =
    useState(null);

  const [questionError, setQuestionError] =
    useState("");

  const workspaceRef =
    useRef(null);


  // ========================================================
  // CHAT HISTORY
  // ========================================================

  const [chatHistory, setChatHistory] = useState(() => {

    try {

      return JSON.parse(
        localStorage.getItem(
          "enterpriseai_chat_history"
        )
      ) || [];

    } catch {

      return [];

    }

  });


  // ========================================================
  // LOAD DOCUMENTS
  // ========================================================

  const loadDocuments = async () => {

    try {

      const response =
        await fetch(
          `${API_URL}/documents`
        );

      const data =
        await response.json();

      if (data.success) {

        setDocuments(
          data.documents || []
        );

      }

    } catch (error) {

      console.error(
        "Could not load documents:",
        error
      );

    }

  };


  // ========================================================
  // INITIAL LOAD
  // ========================================================

  useEffect(() => {

    loadDocuments();

  }, []);


  // ========================================================
  // OPEN WORKSPACE
  // ========================================================

  const openWorkspace = () => {

    setShowWorkspace(true);

    setTimeout(() => {

      workspaceRef.current?.scrollIntoView({
        behavior: "smooth"
      });

    }, 50);

  };


  // ========================================================
  // FILE SELECTION
  // ========================================================

  const handleFileChange = (event) => {

    setFiles(
      Array.from(
        event.target.files || []
      )
    );

    setUploadMessage("");

  };


  // ========================================================
  // UPLOAD
  // ========================================================

  const handleUpload = async () => {

    if (!files.length) {

      setUploadMessage(
        "Please select at least one PDF."
      );

      return;

    }

    setUploading(true);
    setUploadMessage("");

    const successful = [];
    const failed = [];

    for (const file of files) {

      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      try {

        const response =
          await fetch(
            `${API_URL}/upload-pdf`,
            {
              method: "POST",
              body: formData
            }
          );

        const data =
          await response.json();

        if (data.success) {

          successful.push(
            data.filename
          );

        } else {

          failed.push(
            `${file.name}: ${
              data.error ||
              "Upload failed"
            }`
          );

        }

      } catch (error) {

        failed.push(
          `${file.name}: Could not connect to backend`
        );

      }

    }


    if (
      successful.length &&
      !failed.length
    ) {

      setUploadMessage(
        `${successful.length} PDF(s) uploaded and indexed successfully.`
      );

    } else if (
      successful.length
    ) {

      setUploadMessage(
        `${successful.length} uploaded successfully. ${failed.length} failed.`
      );

    } else {

      setUploadMessage(
        "No PDF was uploaded successfully."
      );

    }


    setFiles([]);
    setUploading(false);

    await loadDocuments();

  };


  // ========================================================
  // DELETE DOCUMENT
  // ========================================================

  const handleDeleteDocument =
    async (filename) => {

      const confirmed =
        window.confirm(
          `Delete "${filename}"?\n\nThis will remove the PDF and all of its RAG embeddings.`
        );

      if (!confirmed) {
        return;
      }

      setDeleting(filename);
      setUploadMessage("");

      try {

        const response =
          await fetch(
            `${API_URL}/documents/${encodeURIComponent(
              filename
            )}`,
            {
              method: "DELETE"
            }
          );

        const data =
          await response.json();

        if (!data.success) {

          setUploadMessage(
            data.error ||
            "Could not delete document."
          );

          return;

        }


        // Remove document from UI

        setDocuments(
          previous =>
            previous.filter(
              doc =>
                doc.filename !== filename
            )
        );


        // Remove deleted document
        // from current sources

        setSources(
          previous =>
            previous.filter(
              source =>
                source.source !== filename
            )
        );


        setUploadMessage(
          `✓ ${filename} deleted successfully.`
        );


      } catch (error) {

        setUploadMessage(
          "Could not connect to backend."
        );

      } finally {

        setDeleting("");

      }

    };


  // ========================================================
  // SAVE CHAT HISTORY
  // ========================================================

  const saveChatHistory = (
    questionText,
    answerText,
    sourceData
  ) => {

    const newChat = {

      id: Date.now(),

      question:
        questionText,

      answer:
        answerText,

      sources:
        sourceData || [],

      time:
        new Date().toLocaleString()

    };


    setChatHistory(previous => {

      const updated = [
        newChat,
        ...previous
      ].slice(0, 20);


      localStorage.setItem(
        "enterpriseai_chat_history",
        JSON.stringify(updated)
      );


      return updated;

    });

  };


  // ========================================================
  // LOAD OLD CHAT
  // ========================================================

  const loadChat = (chat) => {

    setQuestion(
      chat.question
    );

    setAnswer(
      chat.answer
    );

    setSources(
      chat.sources || []
    );

    setRagEvaluation(null);

    setQuestionError("");


    // Scroll to answer

    setTimeout(() => {

      document
        .querySelector(".answer-card")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });

    }, 100);

  };


  // ========================================================
  // CLEAR CHAT HISTORY
  // ========================================================

  const clearChatHistory = () => {

    const confirmed =
      window.confirm(
        "Clear all chat history?"
      );

    if (!confirmed) {
      return;
    }


    setChatHistory([]);

    localStorage.removeItem(
      "enterpriseai_chat_history"
    );

  };


  // ========================================================
  // ASK QUESTION
  // ========================================================

  const handleAsk = async () => {

    if (!question.trim()) {

      setQuestionError(
        "Please enter a question."
      );

      return;

    }


    setAsking(true);

    setAnswer("");

    setSources([]);

    setRagEvaluation(null);

    setQuestionError("");


    try {

      const response =
        await fetch(
          `${API_URL}/ask`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              question:
                question.trim()
            })

          }
        );


      const data =
        await response.json();


      if (data.success) {

        // --------------------------------
        // AI ANSWER
        // --------------------------------

        const answerText =
          data.answer || "";


        setAnswer(
          answerText
        );


        // --------------------------------
        // SOURCES
        // --------------------------------

        const sourceData =
          data.sources || [];


        setSources(
          sourceData
        );


        // --------------------------------
        // RAG EVALUATION
        // --------------------------------

        setRagEvaluation(
          data.rag_evaluation || null
        );


        // --------------------------------
        // SAVE CHAT
        // --------------------------------

        saveChatHistory(
          question.trim(),
          answerText,
          sourceData
        );


      } else {

        setQuestionError(
          data.answer ||
          data.error ||
          "Unable to get an answer."
        );


        setRagEvaluation(
          data.rag_evaluation || null
        );

      }


    } catch (error) {

      console.error(
        "Ask error:",
        error
      );


      setQuestionError(
        "Could not connect to the backend. Make sure FastAPI is running."
      );


    } finally {

      setAsking(false);

    }

  };


  // ========================================================
  // ENTER KEY
  // ========================================================

  const handleKeyDown =
    (event) => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        handleAsk();

      }

    };


  // ========================================================
  // RAG STATUS CLASS
  // ========================================================

  const getRagStatusClass =
    (status) => {

      if (!status) {
        return "";
      }

      return status
        .toLowerCase()
        .replaceAll(
          "_",
          "-"
        );

    };


  // ========================================================
  // UI
  // ========================================================

  return (

    <div className="app">


      {/* ==================================================
          NAVBAR
      ================================================== */}

      <nav className="navbar">

        <div className="logo">

          <span className="logo-mark">
            AI
          </span>

          <span>
            EnterpriseAI
          </span>

        </div>


        <div className="nav-links">

          <a href="#features">
            Features
          </a>

          <a href="#how-it-works">
            How it works
          </a>

          <a href="#about">
            About
          </a>

        </div>


        <button
          className="nav-button"
          onClick={openWorkspace}
        >
          Get Started
        </button>

      </nav>



      <main>


        {/* ==================================================
            HERO
        ================================================== */}

        <section className="hero">

          <div className="hero-content">

            <div className="badge">
              ✨ AI-Powered Knowledge Assistant
            </div>


            <h1>

              Your company's knowledge,

              <span>
                {" "}powered by AI.
              </span>

            </h1>


            <p>

              Upload enterprise documents,
              ask questions in natural language,
              and receive grounded answers
              backed by your organization's
              knowledge base.

            </p>


            <div className="hero-buttons">

              <button
                className="primary-button"
                onClick={openWorkspace}
              >
                Start using EnterpriseAI →
              </button>


              <a
                href="#how-it-works"
                className="secondary-button"
              >
                See how it works
              </a>

            </div>


            <div className="trust-text">

              🔒 Document-grounded •
              Semantic retrieval •
              Source evidence

            </div>

          </div>



          {/* ==================================================
              PREVIEW
          ================================================== */}

          <div className="ai-preview">

            <div className="preview-header">

              <div>

                <strong>
                  EnterpriseAI
                </strong>

                <small>
                  Knowledge Assistant
                </small>

              </div>


              <div className="status">

                <span />

                Online

              </div>

            </div>


            <div className="preview-doc">

              <div className="doc-icon">
                📄
              </div>

              <div>

                <strong>
                  Company Handbook.pdf
                </strong>

                <small>
                  Processed with semantic RAG
                </small>

              </div>

              <b>
                ✓
              </b>

            </div>


            <div className="preview-question">

              What is the company's leave policy?

            </div>


            <div className="preview-answer">

              <div className="ai-avatar">
                AI
              </div>

              <div>

                <strong>
                  Grounded Response
                </strong>

                <p>

                  EnterpriseAI retrieves
                  relevant document sections
                  and generates an answer using
                  the supplied context.

                </p>

                <div className="preview-source">

                  📚 Source:
                  Company Handbook.pdf

                </div>

              </div>

            </div>

          </div>

        </section>



        {/* ==================================================
            FEATURES
        ================================================== */}

        <section
          className="feature-strip"
          id="features"
        >

          <div>
            <b>Semantic RAG</b>
            <span>
              Meaning-based retrieval
            </span>
          </div>

          <div>
            <b>Page Sources</b>
            <span>
              Trace answers to evidence
            </span>
          </div>

          <div>
            <b>Multi-PDF</b>
            <span>
              Build one knowledge base
            </span>
          </div>

          <div>
            <b>Grounded AI</b>
            <span>
              Reduced hallucination
            </span>
          </div>

        </section>



        {/* ==================================================
            WORKSPACE
        ================================================== */}

        {showWorkspace && (

          <section
            className="workspace"
            id="workspace"
            ref={workspaceRef}
          >


            {/* ==================================================
                WORKSPACE HEADER
            ================================================== */}

            <div className="workspace-header">

              <div>

                <span className="eyebrow">
                  ENTERPRISEAI WORKSPACE
                </span>

                <h2>
                  Ask your documents
                </h2>

                <p>

                  Upload PDFs, manage your
                  knowledge base, and ask
                  questions using semantic RAG.

                </p>

              </div>


              <button
                className="close-button"
                onClick={() =>
                  setShowWorkspace(false)
                }
              >
                ✕
              </button>

            </div>



            {/* ==================================================
                UPLOAD + DOCUMENT MANAGER
            ================================================== */}

            <div className="workspace-grid">


              {/* ==================================================
                  UPLOAD
              ================================================== */}

              <div className="panel">

                <div className="panel-title">

                  <span>
                    📄
                  </span>

                  <div>

                    <h3>
                      Upload documents
                    </h3>

                    <p>
                      PDF files only
                    </p>

                  </div>

                </div>


                <label className="dropzone">

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={handleFileChange}
                  />

                  <div className="upload-icon">
                    ↑
                  </div>

                  <strong>
                    Click to select PDF documents
                  </strong>

                  <span>
                    You can select multiple PDFs
                  </span>

                </label>



                {files.length > 0 && (

                  <div className="selected-files">

                    {files.map(
                      file => (

                        <div
                          className="file-row"
                          key={`${file.name}-${file.size}`}
                        >

                          <span>
                            📄
                          </span>

                          <span>
                            {file.name}
                          </span>

                          <small>

                            {(
                              file.size /
                              1024 /
                              1024
                            ).toFixed(2)}

                            {" "}MB

                          </small>

                        </div>

                      )
                    )}

                  </div>

                )}



                <button
                  className="upload-button"
                  onClick={handleUpload}
                  disabled={
                    uploading ||
                    !files.length
                  }
                >

                  {uploading
                    ? "Indexing documents..."
                    : "Upload & Index Documents"}

                </button>



                {uploadMessage && (

                  <div className="message">

                    {uploadMessage}

                  </div>

                )}

              </div>



              {/* ==================================================
                  DOCUMENT MANAGER
              ================================================== */}

              <div className="panel">

                <div className="panel-title">

                  <span>
                    🗂️
                  </span>

                  <div>

                    <h3>
                      Knowledge Base
                    </h3>

                    <p>

                      {documents.length}
                      {" "}document(s)

                    </p>

                  </div>

                </div>



                <div className="document-list">

                  {documents.length === 0 ? (

                    <div className="empty-state">

                      <div className="empty-icon">
                        📂
                      </div>

                      <strong>
                        No documents indexed
                      </strong>

                      <span>
                        Upload a PDF to build
                        your knowledge base.
                      </span>

                    </div>

                  ) : (

                    documents.map(
                      doc => (

                        <div
                          className="indexed-doc"
                          key={doc.filename}
                        >

                          <div className="doc-icon">
                            📄
                          </div>


                          <div className="doc-info">

                            <strong
                              title={
                                doc.filename
                              }
                            >
                              {doc.filename}
                            </strong>


                            <span>

                              {doc.pages}
                              {" "}page(s)
                              {" • "}
                              {doc.chunks}
                              {" "}chunks

                            </span>

                          </div>


                          <span className="indexed-badge">
                            Indexed
                          </span>


                          <button
                            className="delete-button"
                            onClick={() =>
                              handleDeleteDocument(
                                doc.filename
                              )
                            }
                            disabled={
                              deleting ===
                              doc.filename
                            }
                            title="Delete document"
                          >

                            {deleting ===
                            doc.filename
                              ? "..."
                              : "🗑"}

                          </button>

                        </div>

                      )
                    )

                  )}

                </div>

              </div>

            </div>



            {/* ==================================================
                CHAT HISTORY
            ================================================== */}

            <div className="chat-history-panel">

              <div className="chat-history-header">

                <div>

                  <span className="eyebrow">
                    CONVERSATIONS
                  </span>

                  <h3>
                    Chat History
                  </h3>

                </div>


                {chatHistory.length > 0 && (

                  <button
                    className="clear-history-button"
                    onClick={clearChatHistory}
                  >
                    Clear History
                  </button>

                )}

              </div>



              {chatHistory.length === 0 ? (

                <div className="history-empty">

                  <div>
                    💬
                  </div>

                  <strong>
                    No conversations yet
                  </strong>

                  <span>
                    Your questions and AI answers
                    will appear here.
                  </span>

                </div>

              ) : (

                <div className="history-list">

                  {chatHistory.map(
                    chat => (

                      <div
                        className="history-item"
                        key={chat.id}
                        onClick={() =>
                          loadChat(chat)
                        }
                      >

                        <div className="history-icon">
                          💬
                        </div>


                        <div className="history-content">

                          <strong>
                            {chat.question}
                          </strong>

                          <span>
                            {chat.time}
                          </span>

                        </div>


                        <div className="history-arrow">
                          →
                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>



            {/* ==================================================
                ASK PANEL
            ================================================== */}

            <div className="ask-panel">

              <div className="ask-heading">

                <div>

                  <span className="eyebrow">
                    RAG QUERY
                  </span>

                  <h3>
                    Ask your knowledge base
                  </h3>

                  <p>

                    Questions are answered
                    using semantically retrieved
                    document chunks.

                  </p>

                </div>


                <span className="grounded-badge">

                  ✓ Document Grounded

                </span>

              </div>



              <textarea
                value={question}
                onChange={
                  e =>
                    setQuestion(
                      e.target.value
                    )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask something about your uploaded documents..."
                rows={4}
              />



              <button
                className="ask-button"
                onClick={handleAsk}
                disabled={asking}
              >

                {asking
                  ? "Thinking..."
                  : "Ask EnterpriseAI →"}

              </button>



              {/* ==================================================
                  ERROR
              ================================================== */}

              {questionError && (

                <div className="error-message">

                  {questionError}

                </div>

              )}



              {/* ==================================================
                  ANSWER
              ================================================== */}

              {answer && (

                <div className="answer-card">

                  <div className="answer-label">
                    AI ANSWER
                  </div>

                  <h3>
                    Grounded Response
                  </h3>

                  <p className="answer-text">
                    {answer}
                  </p>

                </div>

              )}



              {/* ==================================================
                  RAG EVALUATION
              ================================================== */}

              {ragEvaluation && (

                <div className="rag-quality-card">

                  <div className="rag-quality-header">

                    <div>

                      <span className="eyebrow">
                        RAG EVALUATION
                      </span>

                      <h3>
                        Retrieval Quality
                      </h3>

                    </div>


                    <span
                      className={`rag-status ${getRagStatusClass(
                        ragEvaluation.status
                      )}`}
                    >

                      {ragEvaluation.status ||
                        "UNKNOWN"}

                    </span>

                  </div>



                  <div className="rag-metrics">


                    {/* SCORE */}

                    <div className="rag-metric">

                      <span>
                        Retrieval Score
                      </span>

                      <strong>

                        {ragEvaluation.retrieval_score ??
                          ragEvaluation.score ??
                          0}

                        %

                      </strong>

                    </div>



                    {/* DISTANCE */}

                    <div className="rag-metric">

                      <span>
                        Average Distance
                      </span>

                      <strong>

                        {ragEvaluation.average_distance ??
                          "N/A"}

                      </strong>

                    </div>



                    {/* CHUNKS */}

                    <div className="rag-metric">

                      <span>
                        Chunks Retrieved
                      </span>

                      <strong>

                        {ragEvaluation.chunks_retrieved ??
                          0}

                      </strong>

                    </div>

                  </div>



                  {/* SCORE BAR */}

                  <div className="rag-score-section">

                    <div className="rag-score-label">

                      <span>
                        Retrieval confidence
                      </span>

                      <strong>

                        {ragEvaluation.retrieval_score ??
                          ragEvaluation.score ??
                          0}

                        %

                      </strong>

                    </div>



                    <div className="rag-progress">

                      <div
                        className="rag-progress-fill"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Number(
                                ragEvaluation.retrieval_score ??
                                ragEvaluation.score ??
                                0
                              )
                            )
                          )}%`
                        }}
                      />

                    </div>

                  </div>



                  <p className="rag-explanation">

                    This score is based on the
                    semantic distance of the retrieved
                    document chunks. Lower ChromaDB
                    distance generally indicates a
                    more relevant match.

                  </p>

                </div>

              )}



              {/* ==================================================
                  SOURCES
              ================================================== */}

              {sources.length > 0 && (

                <div className="sources">

                  <div className="sources-header">

                    <div>

                      <span className="eyebrow">
                        SOURCE EVIDENCE
                      </span>

                      <h3>
                        Retrieved Sources
                      </h3>

                    </div>

                    <span>

                      {sources.length}
                      {" "}chunks retrieved

                    </span>

                  </div>



                  <div className="source-grid">

                    {sources.map(
                      (source, index) => (

                        <div
                          className="source-card"
                          key={`${source.source}-${source.page}-${source.chunk}-${index}`}
                        >

                          <div className="source-number">
                            {index + 1}
                          </div>


                          <div className="source-content">

                            <strong
                              title={source.source}
                            >
                              {source.source}
                            </strong>


                            <span>
                              📑 Page{" "}
                              {source.page}
                            </span>


                            <span>
                              🧩 Chunk{" "}
                              {source.chunk}
                            </span>


                            {source.distance !==
                              null &&
                              source.distance !==
                              undefined && (

                              <small>

                                Similarity distance:{" "}
                                {source.distance}

                              </small>

                            )}

                          </div>

                        </div>

                      )
                    )}

                  </div>

                </div>

              )}

            </div>

          </section>

        )}



        {/* ==================================================
            HOW IT WORKS
        ================================================== */}

        <section
          className="how"
          id="how-it-works"
        >

          <span className="eyebrow">
            HOW IT WORKS
          </span>

          <h2>
            From document to grounded answer
          </h2>


          <div className="steps">

            <div>

              <b>
                01
              </b>

              <h3>
                Upload
              </h3>

              <p>
                PDF text is extracted
                page by page.
              </p>

            </div>


            <div>

              <b>
                02
              </b>

              <h3>
                Index
              </h3>

              <p>
                Chunks become vector
                embeddings in ChromaDB.
              </p>

            </div>


            <div>

              <b>
                03
              </b>

              <h3>
                Retrieve
              </h3>

              <p>
                Questions are matched
                semantically against
                the knowledge base.
              </p>

            </div>


            <div>

              <b>
                04
              </b>

              <h3>
                Generate
              </h3>

              <p>
                Groq generates a grounded
                answer from retrieved evidence.
              </p>

            </div>

          </div>

        </section>



        {/* ==================================================
            ABOUT
        ================================================== */}

        <section
          className="about"
          id="about"
        >

          <span className="eyebrow">
            ABOUT
          </span>

          <h2>
            Built as a Generative AI project
          </h2>

          <p>

            EnterpriseAI demonstrates document
            ingestion, embeddings, vector search,
            retrieval-augmented generation,
            source attribution, document management,
            RAG evaluation, chat history, and an
            API-driven React interface.

          </p>

        </section>

      </main>



      {/* ==================================================
          FOOTER
      ================================================== */}

      <footer>

        <strong>
          EnterpriseAI
        </strong>

        <span>
          AI-powered enterprise knowledge retrieval
        </span>

      </footer>

    </div>

  );

}