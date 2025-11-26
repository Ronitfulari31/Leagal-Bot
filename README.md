LegalBot – AI-Powered Legal Document Analysis & Comparison

LegalBot is a full-stack AI application designed to analyze and compare legal documents using NLP. It automatically extracts clauses, detects discrepancies, highlights risks, and generates detailed comparison reports — reducing manual review time and improving accuracy.

🚀 Key Features

📄 AI-powered document analysis (PDF/DOCX)

🔍 Clause extraction & discrepancy detection

⚠️ Risk scoring with color-coded indicators

⚖️ Owner vs Tenant agreement comparison

📊 Interactive charts using ApexCharts

💾 Export final reports (PDF/Excel)

📡 Real-time processing status

📱 Modern, responsive Angular UI

🧠 Tech Stack
🟩 Backend – FastAPI (Python)

FastAPI + Uvicorn

NLP-based text extraction and comparison

Modular structure: services, models, utils, endpoints

Document storage in uploads/

REST API for frontend communication

🔴 Frontend – Angular 18 (TypeScript)

Responsive SCSS UI

Multi-step workflow for analysis

ApexCharts integration

html2canvas + jsPDF for PDF export

Real-time status polling

🔄 Workflow Overview

Upload owner & tenant agreements

Start automated analysis

Monitor processing in real-time

Review clause-level results

Compare contracts side-by-side

Export final comparison report

📁 Project Structure
backend/
  app/
    api/endpoints/
    services/
    models/
    utils/
    db/
    core/
    main.py
  uploads/

frontend/
  src/app/
    file-upload/
    multi-stage-upload/
    agreement-analysis/
    comparison-report/
    analysis-results/
    dashboard/

🛠️ Installation & Setup
Backend Setup
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

Frontend Setup
cd frontend
npm install
ng serve

📜 Short Project Description

LegalBot is an AI-powered platform that analyzes and compares legal documents using NLP. It highlights risks, identifies differences, and generates professional comparison reports using a FastAPI backend and a modern Angular UI.

🤝 Contributing

Contributions are welcome!
Feel free to submit issues, suggestions, or pull requests.
