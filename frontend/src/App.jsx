import { useState } from "react";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [showWorkspace, setShowWorkspace] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const [questionError, setQuestionError] = useState("");

  // ==========================================================
  // OPEN WORKSPACE
  // ==========================================================

  const openWorkspace = () => {
    setShowWorkspace(true);

    setTimeout(() => {
      document
        .getElementById("workspace")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    }, 100);
  };

  // ==========================================================
  // SELECT FILES
  // ==========================================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    const pdfFiles = selectedFiles.filter((file) =>
      file.name.toLowerCase().endsWith(".pdf")
    );

    setFiles(pdfFiles);

    if (pdfFiles.length !== selectedFiles.length) {
      setUploadMessage("Only PDF files are allowed.");
    } else {
      setUploadMessage("");
    }
  };

  // ==========================================================
  // UPLOAD PDFs
  // ==========================================================

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadMessage("Please select at least one PDF.");
      return;
    }

    setUploading(true);
    setUploadMessage("");

    let successfulUploads = [];
    let failedUploads = [];

    try {
      // Upload each PDF separately because your backend
      // currently has /upload-pdf for one file at a time.
      for (const file of files) {
        const formData = new FormData();

        formData.append("file", file);

        try {
          const response = await fetch(
            `${API_URL}/upload-pdf`,
            {
              method: "POST",
              body: formData,
            }
          );

          const data = await response.json();

          if (data.success) {
            successfulUploads.push(data.filename);
          } else {
            failedUploads.push(
              `${file.name}: ${data.error || "Upload failed"}`
            );
          }
        } catch (error) {
          failedUploads.push(
            `${file.name}: Could not connect to backend`
          );
        }
      }

      if (successfulUploads.length > 0) {
        setUploadedFiles((previous) => [
          ...new Set([
            ...previous,
            ...successfulUploads,
          ]),
        ]);
      }

      if (
        successfulUploads.length > 0 &&
        failedUploads.length === 0
      ) {
        setUploadMessage(
          `${successfulUploads.length} PDF file(s) uploaded and processed successfully!`
        );
      } else if (
        successfulUploads.length > 0 &&
        failedUploads.length > 0
      ) {
        setUploadMessage(
          `${successfulUploads.length} uploaded successfully. ${failedUploads.length} failed.`
        );
      } else {
        setUploadMessage(
          "PDF upload failed. Please make sure the backend is running."
        );
      }

      setFiles([]);
    } catch (error) {
      setUploadMessage(
        "Could not connect to the EnterpriseAI backend."
      );
    }

    setUploading(false);
  };

  // ==========================================================
  // ASK QUESTION
  // ==========================================================

  const handleAsk = async () => {
    if (!question.trim()) {
      setQuestionError("Please enter a question.");
      return;
    }

    setAsking(true);
    setAnswer("");
    setSources([]);
    setQuestionError("");

    try {
      const response = await fetch(
        `${API_URL}/ask`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            question: question,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setAnswer(data.answer);
        setSources(data.sources || []);
      } else {
        setQuestionError(
          data.answer ||
            "Unable to get an answer."
        );
      }
    } catch (error) {
      setQuestionError(
        "Could not connect to the backend. Make sure FastAPI is running."
      );
    }

    setAsking(false);
  };

  // ==========================================================
  // ENTER KEY FOR QUESTION
  // ==========================================================

  const handleQuestionKeyDown = (event) => {
    if (event.key === "Enter") {
      handleAsk();
    }
  };

  return (
    <div className="app">

      {/* ======================================================
          NAVBAR
      ====================================================== */}

      <nav className="navbar">

        <div className="logo">
          <span>✦</span>
          EnterpriseAI
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

          <a href="#contact">
            Contact
          </a>
        </div>

        <button
          className="nav-button"
          onClick={openWorkspace}
        >
          Get Started
        </button>

      </nav>


      {/* ======================================================
          HERO
      ====================================================== */}

      <section className="hero">

        <div className="hero-content">

          <div className="badge">
            ✨ AI-Powered Knowledge Assistant
          </div>

          <h1>
            Your company's knowledge,
            <span> powered by AI.</span>
          </h1>

          <p>
            Upload your documents, ask questions
            in natural language, and get accurate
            answers backed by your organization's
            knowledge.
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
            🔒 Your knowledge. Your documents. Your answers.
          </div>

        </div>


        {/* AI PREVIEW */}

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
              ● Online
            </div>

          </div>


          <div className="document-preview">

            <div className="document-icon">
              📄
            </div>

            <div>
              <strong>
                Company Handbook.pdf
              </strong>

              <small>
                24 pages • Processed
              </small>
            </div>

            <span>
              ✓
            </span>

          </div>


          <div className="question">
            👤 What is the company's leave policy?
          </div>


          <div className="answer">

            <div className="ai-avatar">
              ✦
            </div>

            <div>

              <strong>
                EnterpriseAI
              </strong>

              <p>
                According to the uploaded company
                handbook, employees are entitled to
                leave according to company policy.
              </p>

              <div className="source">
                📚 Source: Company Handbook.pdf
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* ======================================================
          WORKSPACE
      ====================================================== */}

      {showWorkspace && (

        <section
          className="workspace"
          id="workspace"
        >

          <div className="workspace-header">

            <div>

              <span>
                ENTERPRISEAI WORKSPACE
              </span>

              <h2>
                Ask your documents
              </h2>

              <p>
                Upload PDF documents and ask
                questions using your knowledge base.
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
              UPLOAD CARD
          ================================================== */}

          <div className="workspace-card">

            <div className="workspace-card-icon">
              📄
            </div>

            <h3>
              Upload documents
            </h3>

            <p>
              Upload one or multiple PDF files.
              EnterpriseAI will process them and
              add their information to your
              knowledge base.
            </p>


            <label className="file-upload">

              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
              />

              <span>
                📁 Choose PDF files
              </span>

            </label>


            {/* SELECTED FILES */}

            {files.length > 0 && (

              <div className="selected-files">

                <h4>
                  Selected files
                </h4>

                {files.map((file, index) => (

                  <div
                    className="file-item"
                    key={`${file.name}-${index}`}
                  >

                    <span>
                      📄 {file.name}
                    </span>

                    <span>
                      {(file.size / 1024 / 1024).toFixed(2)}
                      {" MB"}
                    </span>

                  </div>

                ))}

              </div>

            )}


            <button
              className="primary-button upload-button"
              onClick={handleUpload}
              disabled={uploading}
            >

              {uploading
                ? "Processing PDFs..."
                : "Upload PDFs →"}

            </button>


            {/* UPLOAD MESSAGE */}

            {uploadMessage && (

              <div className="upload-message">
                {uploadMessage}
              </div>

            )}


            {/* UPLOADED FILES */}

            {uploadedFiles.length > 0 && (

              <div className="uploaded-files">

                <h4>
                  Processed documents
                </h4>

                {uploadedFiles.map(
                  (filename, index) => (

                    <div
                      className="uploaded-file"
                      key={`${filename}-${index}`}
                    >

                      <span>
                        ✓ {filename}
                      </span>

                      <small>
                        Ready
                      </small>

                    </div>

                  )
                )}

              </div>

            )}

          </div>


          {/* ==================================================
              ASK CARD
          ================================================== */}

          <div className="workspace-card ask-card">

            <div className="workspace-card-icon">
              💬
            </div>

            <h3>
              Ask your documents
            </h3>

            <p>
              Ask a question about the information
              contained in your uploaded PDFs.
            </p>


            <div className="question-box">

              <input
                type="text"
                value={question}
                onChange={(event) =>
                  setQuestion(event.target.value)
                }
                onKeyDown={handleQuestionKeyDown}
                placeholder="Example: What is the purpose of EDA?"
                className="question-input"
              />

              <button
                className="primary-button"
                onClick={handleAsk}
                disabled={asking}
              >

                {asking
                  ? "Thinking..."
                  : "Ask EnterpriseAI →"}

              </button>

            </div>


            {/* QUESTION ERROR */}

            {questionError && (

              <div className="question-error">
                ⚠️ {questionError}
              </div>

            )}


            {/* AI ANSWER */}

            {answer && (

              <div className="ai-result">

                <div className="result-header">

                  <div className="ai-avatar">
                    ✦
                  </div>

                  <div>

                    <strong>
                      EnterpriseAI
                    </strong>

                    <small>
                      AI Knowledge Assistant
                    </small>

                  </div>

                </div>


                <div className="result-answer">
                  {answer}
                </div>


                {/* SOURCES */}

                {sources.length > 0 && (

                  <div className="result-sources">

                    <h4>
                      📚 Sources
                    </h4>

                    {sources.map(
                      (source, index) => (

                        <div
                          className="result-source"
                          key={`${source}-${index}`}
                        >
                          {source}
                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

            )}

          </div>

        </section>

      )}


      {/* ======================================================
          HOW IT WORKS
      ====================================================== */}

      <section
        className="section"
        id="how-it-works"
      >

        <div className="section-heading">

          <span>
            HOW IT WORKS
          </span>

          <h2>
            From documents to answers
          </h2>

          <p>
            Turn your documents into an intelligent,
            searchable knowledge base.
          </p>

        </div>


        <div className="steps">

          <div className="step-card">

            <div className="step-icon">
              📄
            </div>

            <h3>
              Upload documents
            </h3>

            <p>
              Upload policies, reports, manuals,
              research papers and other documents.
            </p>

          </div>


          <div className="step-card">

            <div className="step-icon">
              🧠
            </div>

            <h3>
              AI understands
            </h3>

            <p>
              EnterpriseAI processes your documents
              and creates a searchable knowledge base.
            </p>

          </div>


          <div className="step-card">

            <div className="step-icon">
              💬
            </div>

            <h3>
              Ask anything
            </h3>

            <p>
              Ask questions naturally and receive
              answers from your uploaded documents.
            </p>

          </div>

        </div>

      </section>


      {/* ======================================================
          FEATURES
      ====================================================== */}

      <section
        className="section features-section"
        id="features"
      >

        <div className="section-heading">

          <span>
            POWERFUL FEATURES
          </span>

          <h2>
            Everything you need to
            work with knowledge
          </h2>

        </div>


        <div className="features-grid">

          <div className="feature-card">

            <div className="feature-icon">
              📚
            </div>

            <h3>
              Multi-document knowledge base
            </h3>

            <p>
              Search information across multiple
              documents from one place.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🤖
            </div>

            <h3>
              AI-powered answers
            </h3>

            <p>
              Get natural-language answers instead
              of manually searching documents.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🔎
            </div>

            <h3>
              Semantic search
            </h3>

            <p>
              Find information based on meaning,
              not only exact keywords.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📌
            </div>

            <h3>
              Source references
            </h3>

            <p>
              See which document was used to answer
              your question.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              ⚡
            </div>

            <h3>
              Fast responses
            </h3>

            <p>
              Quickly retrieve relevant information
              from your knowledge base.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              📱
            </div>

            <h3>
              Mobile friendly
            </h3>

            <p>
              Use your knowledge assistant from
              desktop, tablet or mobile.
            </p>

          </div>

        </div>

      </section>


      {/* ======================================================
          ABOUT
      ====================================================== */}

      <section
        className="about-section"
        id="about"
      >

        <div className="about-content">

          <span>
            ABOUT ENTERPRISEAI
          </span>

          <h2>
            Stop searching.
            <br />
            Start asking.
          </h2>

          <p>
            EnterpriseAI brings your organization's
            documents together into one intelligent
            knowledge assistant.
          </p>

          <p>
            Instead of manually searching through
            hundreds of pages, users can simply ask
            questions and receive relevant answers.
          </p>

        </div>


        <div className="about-stats">

          <div>
            <strong>
              AI
            </strong>

            <span>
              Powered
            </span>
          </div>

          <div>
            <strong>
              RAG
            </strong>

            <span>
              Architecture
            </span>
          </div>

          <div>
            <strong>
              24/7
            </strong>

            <span>
              Access
            </span>
          </div>

        </div>

      </section>


      {/* ======================================================
          CONTACT
      ====================================================== */}

      <section
        className="contact-section"
        id="contact"
      >

        <div className="contact-heading">

          <span>
            GET IN TOUCH
          </span>

          <h2>
            Have a question?
          </h2>

          <p>
            We'd love to hear from you.
          </p>

        </div>


        <form className="contact-form">

          <div className="form-row">

            <input
              type="text"
              placeholder="Your name"
            />

            <input
              type="email"
              placeholder="Your email"
            />

          </div>

          <input
            type="text"
            placeholder="Subject"
          />

          <textarea
            placeholder="Tell us how we can help..."
            rows="5"
          />

          <button type="button">
            Send message →
          </button>

        </form>

      </section>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer>

        <div className="footer-logo">
          ✦ EnterpriseAI
        </div>

        <p>
          AI-powered organizational knowledge assistant.
        </p>

        <div className="footer-links">

          <a href="#features">
            Features
          </a>

          <a href="#how-it-works">
            How it works
          </a>

          <a href="#about">
            About
          </a>

          <a href="#contact">
            Contact
          </a>

        </div>

        <div className="copyright">
          © 2026 EnterpriseAI. All rights reserved.
        </div>

      </footer>

    </div>
  );
}

export default App;