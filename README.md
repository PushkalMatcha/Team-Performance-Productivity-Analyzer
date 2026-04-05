# TeamPulse - Team Performance & Productivity Analyzer

A modern, full-stack web application designed to help engineering managers track team real-time productivity, sprint task progression, and automated insights. 

Built natively with **React 18**, **Vite**, **TailwindCSS**, **Node.js**, **Express**, and **MongoDB**.

## ✨ Key Features
- **Intelligent Dashboard:** Real-time metrics charting Task Completion, Overdue reports, and Team Velocity.
- **GitHub Integration webhook:** Auto-sync developer commits, PRs, and resolved issues directly into native performance calculations by tracking GitHub webhooks seamlessly.
- **AI Task Prediction:** Integrated with the incredibly fast Groq API (Llama 3 & Mixtral) to natively auto-generate comprehensive Jira-style task descriptions/acceptance criteria, and review/coach the team through automated Daily Standup Insights.
- **WebSocket Synchronization**: Multi-user concurrent architecture utilizing Socket.io so when developers update tasks in a sprint, managers see the Kanban and Dashboards react to data pushes directly in real-time.
- **Sprint Management**: Segment workflows into executable windows.
- **Printable PDFs:** Integrated native `jsPDF` reporting allowing complete export of team productivity charts into downloadable documents.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas (or local mongod)
- A Groq API Key (Optional for AI features)

### 1. Installation 
Clone the repo and navigate in to both client and server iteratively.

```bash
# Install Server
cd server
npm install

# Install Client
cd ../client
npm install
```

### 2. Configure Environments
Create a `.env` file in the `server` directory and add:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=super_secret_jwt_signature
GROQ_API_KEY=gsk_your_groq_api_token
```

### 3. Run the App
To start the stack in development:
```bash
# In terminal 1 (starts the express/socket server)
cd server
npm run dev # or node server.js

# In terminal 2 (starts the Vite dev rig)
cd client
npm run dev
```

Visit `http://localhost:5173` to view the application!
