# 🤖 AI Chatbot

A full-stack **ChatGPT-like AI assistant** built with React and FastAPI, powered by **Groq's LLaMA 3.1** for blazing-fast inference. Features real-time streaming responses, JWT authentication, persistent conversation history.

---

## ✨ Features

- 💬 **Real-time streaming** — AI responses stream token-by-token via Server-Sent Events (SSE)
- 🔐 **JWT Authentication** — Secure register / login with bcrypt password hashing
- 🗂️ **Conversation History** — All chats are saved and searchable in the sidebar
- ⚡ **Daily Rate Limiting** — Per-user message quota with a live usage bar
- 🧠 **LLaMA 3.1 (8B Instant)** — Via the Groq API for ultra-low latency
- 📝 **Markdown + Syntax Highlighting** — Full code block rendering with copy button
- 📱 **Responsive Design** — Mobile-friendly with a slide-in sidebar

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, React Router v7 |
| **Styling** | Vanilla CSS (custom design system, no frameworks) |
| **AI Rendering** | react-markdown, react-syntax-highlighter |
| **HTTP Client** | Axios + Fetch (SSE streaming) |
| **Backend** | FastAPI, Uvicorn (Python) |
| **Database** | MongoDB via Motor (async driver) |
| **AI Provider** | Groq API — LLaMA 3.1 8B Instant |
| **Auth** | JWT (python-jose), bcrypt (passlib) |

---

## 📁 Project Structure

```
Ai_chatBot/
├── backend/                   # FastAPI server
│   ├── routes/
│   │   ├── auth.py            # Register & login endpoints
│   │   ├── chat.py            # Streaming SSE chat + new-chat + usage
│   │   └── conversations.py  # List, fetch, delete conversations
│   ├── models/
│   │   ├── user.py            # Pydantic models for auth
│   │   └── chat.py            # Pydantic models for chat/conversations
│   ├── services/
│   │   ├── ai.py              # Groq API integration (streaming)
│   │   ├── auth_service.py    # JWT + password hashing
│   │   └── rate_limiter.py    # Per-user daily quota
│   ├── database.py            # MongoDB connection + settings
│   ├── main.py                # App entry point, CORS, router registration
│   ├── requirements.txt
│   ├── .env.example           # Environment variable template
│   └── .gitignore
│
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        # Conversation list + search
│   │   │   ├── ChatBox.jsx        # Input area + usage bar
│   │   │   ├── Message.jsx        # Chat bubble with markdown rendering
│   │   │   └── TypingIndicator.jsx
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx       # Main chat interface
│   │   │   ├── LoginPage.jsx
│   │   │   └── RegisterPage.jsx
│   │   ├── services/
│   │   │   └── api.js             # Axios instance + streamChat (SSE)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Full design system (dark, glassmorphism)
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── start-backend.bat
├── start-frontend.bat
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python** 3.10+
- **Node.js** 18+
- **MongoDB** running locally (`mongodb://localhost:27017`)
- A free **[Groq API key](https://console.groq.com)**

---

### 1. Clone the Repository

```bash
git clone https://github.com/pavanparitala09/ai-chatbot.git
cd ai-chatbot
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env       # Windows
# cp .env.example .env       # macOS/Linux
```

Edit `.env` and fill in your values:

```env
MONGO_URI=mongodb://localhost:27017
DB_NAME=ai_chatbot
JWT_SECRET=your-random-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

> API docs available at `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

> App runs at **`http://localhost:5173`**

Or use the included batch files from the project root:
```
start-backend.bat
start-frontend.bat
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `DB_NAME` | MongoDB database name | `ai_chatbot` |
| `JWT_SECRET` | Secret key for signing JWTs | *(required — set a strong random string)* |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `JWT_EXPIRE_MINUTES` | Token expiry in minutes | `10080` (7 days) |
| `GROQ_API_KEY` | Your Groq API key | *(required — get one at [console.groq.com](https://console.groq.com))* |
| `GROQ_MODEL` | Groq model to use | `llama-3.1-8b-instant` |

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|:---:|
| `POST` | `/auth/register` | Register a new user | ❌ |
| `POST` | `/auth/login` | Login and receive JWT | ❌ |
| `POST` | `/chat` | Send a message (SSE streaming) | ✅ |
| `POST` | `/new-chat` | Create a new conversation | ✅ |
| `GET` | `/conversations` | List all user conversations | ✅ |
| `GET` | `/messages/{id}` | Get messages in a conversation | ✅ |
| `DELETE` | `/conversations/{id}` | Delete a conversation | ✅ |
| `GET` | `/usage` | Get daily usage stats | ✅ |

---

## 🧠 How Streaming Works

The chat endpoint returns a `text/event-stream` response (SSE). Each event is a JSON line:

```
data: {"conversation_id": "...", "rate": {...}}   ← first event (metadata)
data: {"token": "Hello"}                           ← streamed tokens
data: {"token": " world"}
data: [DONE]                                       ← end of stream
```

The frontend reads this with the `Fetch` `ReadableStream` API and appends tokens directly to the UI — no polling, no waiting.

---

## 📦 Dependencies

### Backend
```
fastapi          — Web framework
uvicorn          — ASGI server
motor            — Async MongoDB driver
pydantic[email]  — Data validation
pydantic-settings — Settings from .env
python-jose      — JWT encoding/decoding
passlib          — Password hashing
bcrypt           — bcrypt backend for passlib
groq             — Official Groq Python SDK
python-multipart — Form data support
python-dotenv    — Load .env files
```

### Frontend
```
react            — UI library
react-dom        — DOM rendering
react-router-dom — Client-side routing
axios            — HTTP client
react-markdown   — Markdown rendering in chat
react-syntax-highlighter — Code syntax highlighting
vite             — Build tool & dev server
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙋 Author

Built by **Pavan** — a Full Stack Developer passionate about AI and modern web applications.

- 🌐 Portfolio: [[your-portfolio-link](https://portfolio-kllpul4ya-paritala-pavan-kumars-projects.vercel.app/)]
- 💼 LinkedIn: [www.linkedin.com/in/pavankumar-paritala-aa733a29a]
- 🐙 GitHub: [https://github.com/pavanparitala09]
