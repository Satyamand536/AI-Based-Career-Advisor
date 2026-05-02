# Instructions to Run: AI-Based Career Advisor

Follow these steps to set up and run the project on your local machine.

## 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **MongoDB** (Running locally or a MongoDB Atlas connection string)

---

## 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add your configuration:
   ```env
   MONGO_URL=your_mongodb_connection_string
   PORT=8000
   JWT_SECRET=your_secret_key
   AI_SERVICE_URL=http://localhost:5001
   ALLOWED_ORIGINS=http://localhost:3000
   ```

---

## 3. AI Service Setup
1. Open a new terminal and navigate to the `ai` folder:
   ```bash
   cd ai
   ```
2. Create and activate a virtual environment:
   - **Windows:**
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **Mac/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `ai` folder:
   ```env
   OPENROUTER_API_KEY_B64=your_base64_encoded_key
   OPENROUTER_CHAT_API_KEY=your_plain_text_key
   ```

---

## 4. Frontend Setup
1. Open a third terminal and navigate to the `front` folder:
   ```bash
   cd front
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

---

## 5. Running the Application
You need to run all three services simultaneously.

- **Backend:** In the `backend` folder, run `npm run dev`
- **AI Service:** In the `ai` folder (with venv activated), run `python app.py`
- **Frontend:** In the `front` folder, run `npm start`

**Alternative (Windows Only):**
Double-click the `start_all.bat` file in the root directory to start all services in separate windows automatically.

---

## 6. Populating Job Data (Important)
Before getting recommendations, you must seed the database with sample jobs:
1. Ensure the **AI Service** is running.
2. In the `backend` folder, run:
   ```bash
   node scripts/seedJobs.js
   ```

---

## 7. Troubleshooting
- **Port Conflict:** If a port is already in use, check `backend/server.js` or `ai/app.py`.
- **MongoDB:** Ensure your MongoDB service is running before starting the backend.
- **AI Service:** If resume parsing fails, ensure your OpenRouter API keys are valid.
