# TeamPulse - Team Performance & Productivity Analyzer

A modern, full-stack web application designed to help engineering managers track team real-time productivity, sprint task progression, and automated insights. 

Built natively with **React 18**, **Vite**, **TailwindCSS**, **Node.js**, **Express**, and **MongoDB**.

## 🎯 About The Project

TeamPulse is a comprehensive performance and productivity analysis tool for modern software engineering teams. It provides managers with a real-time, data-driven overview of team performance, project velocity, and individual developer contributions.

By integrating directly with GitHub and providing AI-powered insights, TeamPulse helps to:
*   **Monitor Progress:** Track task completion, sprint velocity, and project milestones in real-time.
*   **Identify Bottlenecks:** Quickly see overdue tasks and developer workload distribution.
*   **Improve Productivity:** Use AI-generated insights to run more effective stand-ups and coach the team.
*   **Automate Reporting:** Generate and export detailed performance reports.

This tool is designed to replace manual tracking and spreadsheet-based reporting with an intelligent, automated, and centralized platform.

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

## 🏛️ Project Architecture

The application is built on a **MERN stack** (MongoDB, Express, React, Node.js) with a client-server architecture.

*   **Frontend:** A single-page application (SPA) built with **React** and **Vite**. It uses React Router for navigation and communicates with the backend via a RESTful API and **WebSockets** for real-time updates.
*   **Backend:** A **Node.js** and **Express** server that provides a RESTful API for data management. It connects to a **MongoDB** database for data persistence. **Socket.io** is used for real-time, bidirectional communication between the client and server.
*   **Real-time Features:** WebSockets are used to push real-time updates to clients, such as when a task is updated or a new insight is generated.

## 🛠️ Technology Stack

**Frontend:**

*   **React 18:** For building the user interface.
*   **Vite:** As the build tool and development server.
*   **TailwindCSS:** For styling the application.
*   **React Router:** For client-side routing.
*   **Socket.io-client:** For WebSocket communication.
*   **jsPDF:** For generating printable PDF reports.

**Backend:**

*   **Node.js:** As the JavaScript runtime.
*   **Express:** As the web framework.
*   **MongoDB:** As the database.
*   **Mongoose:** As the ODM (Object Data Modeling) library for MongoDB.
*   **Socket.io:** For enabling real-time, bidirectional communication.
*   **JSON Web Tokens (JWT):** For authentication.
*   **Groq API:** For AI-powered features like task generation and team insights.

## 📖 API Endpoint Documentation

Here is a summary of the available API endpoints:

**Authentication (`/api/auth`)**

*   `POST /signup`: Register a new user.
*   `POST /login`: Log in a user.
*   `GET /me`: Get the currently authenticated user's information.

**AI (`/api/ai`)**

*   `POST /generate-task`: Generate a task description using AI.
*   `GET /team-insights`: Get AI-generated insights about the team's performance.

**Analytics (`/api/analytics`)**

*   `GET /team`: Get team-wide analytics and performance metrics.

**Developers (`/api/developers`)**

*   `GET /`: Get a list of all developers.
*   `GET /:id`: Get a specific developer's details, tasks, and activities.
*   `GET /:id/stats`: Get a specific developer's performance statistics.
*   `POST /`: Add a new developer (manager only).

**GitHub (`/api/github`)**

*   `POST /sync/:id`: Sync a developer's GitHub profile and stats (manager only).
*   `POST /webhook`: Handle incoming GitHub webhooks for real-time updates.

**Sprints (`/api/sprints`)**

*   `GET /`: Get a list of all sprints.
*   `POST /`: Create a new sprint (manager only).
*   `PUT /:id`: Update a sprint's details or status (manager only).

**Tasks (`/api/tasks`)**

*   `GET /`: Get a list of tasks with filtering and sorting options.
*   `POST /`: Create a new task (manager only).

