# DocuMind — RAG Chatbot

A document Q&A chatbot built with RAG (Retrieval-Augmented Generation). Upload PDFs or Excel files, index them, and ask questions in a persistent chat interface grounded in your documents.

**Stack:** FastAPI · LlamaIndex · HuggingFace Embeddings (local, free) · Gemini 2.5 Flash · PostgreSQL + pgvector · React + Vite + Tailwind

---

## Prerequisites

Install these before starting:

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.11+ | [python.org](https://www.python.org/downloads/) |
| Node.js | 18+ | [nodejs.org](https://nodejs.org/) |
| Homebrew | any | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| PostgreSQL | 14+ | `brew install postgresql@16` |

You also need a free **Google Gemini API key** — get one at [aistudio.google.com](https://aistudio.google.com/app/apikey).

---

## 1. PostgreSQL Setup (Homebrew)

### Install and start PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
```

Add the Homebrew PostgreSQL binaries to your PATH (add this to `~/.zshrc` or `~/.bashrc`):

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc
```

### Install the pgvector extension

```bash
brew install pgvector
```

### Create the database and enable pgvector

```bash
# Connect to PostgreSQL as your system user
psql postgres

# Inside the psql shell, run:
CREATE DATABASE ragdb;
\c ragdb
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

Verify the extension is active:

```bash
psql ragdb -c "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

You should see `vector` in the output.

> **Note:** The app creates all tables automatically on first startup (files, chat_sessions, chat_messages, vector store tables). You do **not** need to run any migrations manually.

---

## 2. Backend Setup

### Clone and navigate

```bash
cd backend
```

### Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
```

### Install dependencies

```bash
pip install -r requirements.txt
```

> The first install downloads the HuggingFace embedding model (`BAAI/bge-base-en-v1.5`, ~435 MB). This happens once and is cached locally — no internet needed after that.

### Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://your_mac_username@localhost:5432/ragdb
```

> **Important:** With Homebrew PostgreSQL, the default user is your **Mac username** (not `postgres`). Find yours with `whoami`. No password is needed for local connections by default.
>
> Example: if your username is `john`, use `postgresql://john@localhost:5432/ragdb`

### Start the backend

```bash
uvicorn main:app --reload
```

Backend runs at **http://localhost:8000**
Swagger API docs at **http://localhost:8000/docs**

Logs are written to `backend/logs/app.log` (rotates at 10 MB, keeps 5 backups).

---

## 3. Frontend Setup

Open a new terminal tab:

```bash
cd frontend
npm install
npm run dev
```

UI runs at **http://localhost:5173** (or `5174` if 5173 is in use).

---

## 4. Using the App

### Step 1 — Upload Docs
- Drag and drop PDF or Excel (`.xlsx`) files (max 20 MB each)
- Files are stored in `backend/storage/uploads/`

### Step 2 — Index
- Click **Process** next to each file, or **Process All**
- Wait for the **Indexed ✓** status — this parses, chunks, embeds, and stores vectors in PostgreSQL
- Indexing uses a local HuggingFace model (no API key needed, runs on CPU)

### Step 3 — Chat
- Click **New Chat** in the sidebar to start a session
- Ask questions — answers are grounded in your documents with source citations (filename + page number)
- Sessions persist across restarts (stored in PostgreSQL)
- Small talk (hi, thanks, bye) is handled naturally without touching the document index

---

## Project Structure

```
rag/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, middleware, lifespan
│   ├── .env.example             # Environment variable template
│   ├── requirements.txt
│   ├── api/
│   │   ├── chat.py              # Chat endpoint, RAG pipeline, Gemini call
│   │   ├── sessions.py          # Session CRUD endpoints
│   │   ├── upload.py            # File upload endpoint
│   │   └── knowledge_base.py    # Parse + index endpoint
│   ├── core/
│   │   ├── config.py            # Pydantic settings (reads .env)
│   │   ├── database.py          # SQLAlchemy models (files, sessions, messages)
│   │   ├── logging_config.py    # Rotating file + console logging
│   │   └── rag.py               # LlamaIndex + HuggingFace embedding config
│   ├── models/
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── logs/                    # Auto-created on first run
│   └── storage/uploads/         # Uploaded files (gitignored)
└── frontend/
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── api/client.ts         # Axios calls to backend
        ├── store/useAppStore.ts  # Zustand global state
        ├── types/index.ts        # TypeScript types
        └── components/
            ├── Layout/Header.tsx
            ├── Upload/
            ├── KnowledgeBase/
            └── Chat/             # ChatTab, ChatSidebar, MessageItem, SourceCitation
```

---

## Database Tables

The backend creates these tables automatically on startup — no manual SQL needed.

| Table | Purpose |
|-------|---------|
| `files` | Uploaded file metadata (name, size, type, status) |
| `chat_sessions` | Chat session list with title, timestamps |
| `chat_messages` | Per-session messages with role, content, sources (JSONB) |
| `data_llamaindex_*` | pgvector tables managed by LlamaIndex for document embeddings |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for generating answers |
| `DATABASE_URL` | Yes | PostgreSQL connection string |

---

## Troubleshooting

### `psql: command not found`
PostgreSQL binaries aren't on your PATH. Add the export line from Step 1 to your shell config and restart the terminal.

### `connection refused` on port 5432
PostgreSQL isn't running. Start it with:
```bash
brew services start postgresql@16
```

### `extension "vector" does not exist`
pgvector wasn't installed or wasn't enabled in the database:
```bash
brew install pgvector
psql ragdb -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### `role "postgres" does not exist`
Homebrew PostgreSQL uses your Mac username, not `postgres`. Update `DATABASE_URL` in `.env` to use `your_mac_username` (run `whoami` to find it).

### HuggingFace model download is slow
The embedding model (`BAAI/bge-base-en-v1.5`, ~435 MB) downloads once on first backend startup. Subsequent starts use the local cache. Requires internet on first run only.

### Frontend blocked by ngrok / tunnel
If accessing via a tunnel (ngrok, etc.), add the host to `frontend/vite.config.ts` under `server.allowedHosts`, and add the origin URL to `allow_origins` in `backend/main.py`.

---

## Stopping the App

```bash
# Stop backend: Ctrl+C in the backend terminal
# Stop frontend: Ctrl+C in the frontend terminal
# Stop PostgreSQL:
brew services stop postgresql@16
```
