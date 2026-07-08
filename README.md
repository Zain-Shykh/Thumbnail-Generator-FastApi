# AI Thumbnail Generator 🖼️🤖

An automated AI-powered thumbnail generator built with a **FastAPI** backend and a **React (Vite)** frontend. The application takes a single headshot image and a prompt, then utilizes the **Google Gemini API** to generate high-quality thumbnails based on a selected custom style theme.

---

## 🚀 Key Features

* **Three Unique Design Styles:**
  * `bold_dramatic`: High contrast, punchy text, and intense styling.
  * `clean_minimal`: Sleek layouts, generous breathing room, and modern typography.
  * `vibrant_energetic`: Bright color palettes, high saturation, and dynamic framing.
* **Triple-Variation Output:** Automatically builds **3 distinct size variations** per generation request to perfectly match different platform requirements.
* **Server-Sent Events (SSE):** Features a live-streaming update pipeline to feed real-time generation tracking straight to the frontend—no manual page refreshing required.
* **Resilient Quota Management:** Combats the Gemini Free Tier `429 RESOURCE_EXHAUSTED` barriers using a strict sequential execution loop reinforced by an **Exponential Backoff Strategy with Jitter** (capped at 3 maximum retry attempts).
* **Cloud Asset Management:** Uses **ImageKit** for streamlined cloud storage and instant dynamic image transformations.
* **Production Database:** Powered by a robust **PostgreSQL** database backend managed via SQLModel.

---

## 🏗️ Project Architecture

```text
├── backend/          # FastAPI application, PostgreSQL schemas, and AI workers
└── frontend/         # React + Vite application (UI components)


🛠️ Backend Setup (FastAPI)
1. Environment Configuration

Navigate to the backend/ folder and create a local configuration file named .env:

GEMINI_API_KEY=your_google_gemini_api_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=[https://ik.imagekit.io/your_endpoint_id/](https://ik.imagekit.io/your_endpoint_id/)
DATABASE_URL=postgresql://username:password@localhost:5432/your_db_name

Dependency Installation
Create a virtual environment, activate it, and install the required dependencies:

cd backend
python -m venv myenv

# On Mac/Linux:
source myenv/bin/activate
# On Windows:
myenv\Scripts\activate

pip install -r requirements.txt


Frontend Setup:
cd frontend
npm install

 Processing raw headshot image bytes utilizes heavy input token volume, the Gemini Free Tier easily triggers rate limiting. This project implements a dual-layer approach to maintain stability:Sequential Queue Execution: Instead of firing simultaneous requests that trigger immediate 429 exceptions, the application processes variations one by one inside a sequential for loop, pacing requests with a 15-second delay.Exponential Backoff with Jitter: If a request still trips a 429 RESOURCE_EXHAUSTED limit, a dedicated retry controller intercepts the failure. It calculates an increasing mathematical delay ($base\_delay \times 2^{attempt}$) combined with a randomized time variance (Jitter) to prevent synchronized server hammering. The controller attempts a maximum of 3 retries before gracefully passing the error details to the PostgreSQL database to alert the frontend stream.