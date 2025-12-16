# Pharma Pulse - Competitive Intelligence Dashboard

**Pharma Pulse** is an advanced competitive intelligence platform designed for pharmaceutical professionals. It aggregates live industry news, provides AI-driven recommendations, and generates personalized weekly summaries based on specific user interests.

## 🚀 Key Features

### 1. 📡 Live Pharma Feed
- Aggregates real-time news from top industry sources (e.g., PharmaTimes, FiercePharma, FDA).
- Clean, card-based layout with "Read More" links and source attribution.

### 2. 📅 Weekly Updates (AI Prompt)
- **Personalized Summaries**: Generates a weekly digest for each of your saved interests (e.g., "Diabetes", "Oncology").
- **Custom AI Prompt**: You can instruct the AI on *how* to summarize each topic (e.g., "Summarize like a clinical researcher" vs "Focus on market stocks").
- **Visual Insights**: Highlights key bullet points and relevance scores.

### 3. 🧠 Smart Recommendations ("For You")
- **Context-Aware Engine**: Learns from your search history, upvotes, and saved interests.
- **Token-Optimized**: efficiently processes article titles to find the most relevant content without overwhelming the LLM.
- **Smart Tags**: Automatically tags personalized recommendations (e.g., "Clinical Trial News").

### 4. ✨ Interest Manager
- **Dynamic Interest Tracking**: Add, edit, or remove specific topics.
- **Smart Suggestions**: The system suggests related topics tailored to your activity.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, CSS Modules (Custom Premium UI), Lucide Icons
- **Backend**: Node.js, Express, RSS Parser
- **AI Integration**: OpenAI GPT-4o (Structured JSON Outputs)
- **State Management**: React Hooks (useState, useEffect, Context)

## 📋 Prerequisites

- **Node.js** (v16+)
- **npm** or **yarn**
- **OpenAI API Key** (Required for Smart Recommendations & Weekly Updates)

## ⚙️ Setup Guide

### 1. Clone the Repository
```bash
git clone <repository-url>
cd competitive_intel
```

### 2. Backend Setup
The server handles RSS fetching, API aggregation, and OpenAI communication.

```bash
cd server
npm install
```

**Configuration**: Create a `.env` file in the `server` directory:
```env
PORT=3001
OPENAI_API_KEY=sk-your-openai-api-key
```

**Start Server**:
```bash
npm run dev
```
*Runs on http://localhost:3001*

### 3. Frontend Setup
The client is a modern React application built with Vite.

Open a new terminal:
```bash
cd client
npm install
```

**Start Client**:
```bash
npm run dev
```
*Runs on http://localhost:5173*

## 📖 Usage Workflow

1. **Explore the Feed**: Browse the latest headlines.
2. **Define Interests**: Go to the **Interests** tab and add topics like "Cardiology" or "Gene Therapy".
3. **Get Insights**: Click **Weekly Update** to see AI-generated summaries for your specific topics.
4. **Train the AI**: Upvote content you like to improve the **"For You"** recommendations.

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
