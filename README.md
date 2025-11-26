<h1 align="center">
  <img src="https://github.com/quizcraft/assets/raw/main/logo-glow.gif" width="120px" /><br/>
  🌌✨ <b>QuizCraft</b> — AI Quiz Generation Reimagined
</h1>

<p align="center">
  <i>AI-powered, 3D-styled, ultra-modern quiz generation platform for education and business.</i>  
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini%201.5-blueviolet?style=for-the-badge&logo=google&logoColor=white"/>
  <img src="https://img.shields.io/badge/Frontend-React%20Native%20(Expo)-61DAFB?style=for-the-badge&logo=react"/>
  <img src="https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js"/>
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen?style=for-the-badge&logo=mongodb"/>
  <img src="https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge"/>
</p>

---

## 🧠 Overview

**QuizCraft** is an **AI-powered, cross-platform quiz generation engine** built for **educators, students, and enterprises**.  
Upload text, PDFs, or images — and **Gemini 1.5 Pro** turns them into **high-quality quizzes with explanations**.  
Built with **React Native**, **Node.js**, and **MongoDB Atlas Vector Search**, it’s your one-stop solution for **intelligent learning automation**.

---

## 🚀 Features

| 🧩 Core Capability              | ⚙️ Description                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| **🪄 AI Quiz Generation**       | Gemini 1.5 (Pro/Flash) creates MCQs, True/False, and short answers — all with explanations.   |
| **📄 Smart Content Ingestion**  | Extracts text from PDFs and images using `pdf-parse` + `Tesseract.js` OCR.                    |
| **🔍 Semantic Vector Search**   | Stores question embeddings in **MongoDB Atlas Vector Search (cosine)** for instant retrieval. |
| **👥 Role-Based Access (RBAC)** | Guest, Student, Teacher, Admin — all secured via JWT authentication.                          |
| **📈 Analytics Dashboard**      | Track quiz attempts, performance, and personalized recommendations.                           |
| **🧰 Admin Console**            | Manage users, content, categories, quotas, and system-wide settings.                          |
| **💎 Freemium Model**           | Usage tiers with configurable limits and scalable quotas.                                     |

---

## 🧩 Tech Stack

| Layer         | Technology                                              |
| ------------- | ------------------------------------------------------- |
| **Frontend**  | React Native (Expo), React Navigation, Axios, RN Charts |
| **Backend**   | Node.js (Express), JWT + bcrypt, Multer (File Uploads)  |
| **Database**  | MongoDB Atlas + Vector Search                           |
| **AI Engine** | Google Gemini 1.5 Pro / Flash, `gemini-embedding-001`   |

---

## ⚡ Quick Start

### 🧱 Prerequisites

- Node.js **v18+**
- MongoDB Atlas account
- Google Gemini API key
- Expo CLI for mobile deployment

---

### 🔧 Backend Setup

```bash
cd backend
npm install
```

Create your .env file

```
PORT=5000
NODE_ENV=development

MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/quizcraft
JWT_SECRET=super_secret_key
JWT_EXPIRE=7d

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-pro
EMBEDDING_MODEL=gemini-embedding-001

VECTOR_INDEX_NAME=quizembeddings_vector_index
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

FREE_QUIZ_LIMIT=10
PREMIUM_QUIZ_LIMIT=1000

ADMIN_EMAIL=admin@quizcraft.com
ADMIN_PASSWORD=ChangeThisPassword!

```

🧩 API Highlights

| Category      | Endpoint                             | Description                  |
| ------------- | ------------------------------------ | ---------------------------- |
| **Auth**      | `POST /api/auth/register`            | Register a new user          |
|               | `POST /api/auth/login`               | Login and receive JWT        |
|               | `POST /api/auth/guest-access`        | Temporary guest login        |
|               | `GET /api/auth/me`                   | Fetch logged-in user details |
| **Quiz**      | `POST /api/quiz/generate-from-text`  | Generate quiz from text      |
|               | `POST /api/quiz/upload-and-generate` | Upload file (PDF/Image)      |
|               | `GET /api/quiz`                      | Browse quizzes               |
|               | `GET /api/quiz/:id`                  | Fetch single quiz            |
|               | `POST /api/quiz/:id/submit`          | Submit answers               |
| **Search**    | `GET /api/search/similar?query=`     | Find similar quizzes         |
| **Analytics** | `GET /api/analytics/my-stats`        | Personal analytics           |
| **Admin**     | `GET /api/admin/users`               | Manage users and roles       |

<h2 align="center">🧑‍💻 Authors & Credits</h2>
<p align="center">
Built with ❤️ by <a href="https://github.com/sumyasoma">Sumya Soma</a> and <a href="https://github.com/MHMITHUN">Mahamudul Hasan</a><br>
Powered by <b>Google Gemini</b>, <b>MongoDB Atlas</b>, and <b>React Native</b>
</p>

📜 License

Proprietary — All rights reserved.
Unauthorized copying or distribution is strictly prohibited.
