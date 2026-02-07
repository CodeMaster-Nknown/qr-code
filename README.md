# QR Code Generator

A modern, interactive web application to generate QR codes from URLs. Built with Python (Flask) and a polished, animated frontend.

## Features
- **Instant Generation**: Create QR codes instantly from any URL.
- **History Tracking**: Automatically saves generated QR codes for easy retrieval.
- **Modern UI**: Smooth animations, glassmorphism design, and responsive layout.
- **Downloadable**: Save your QR codes directly to your device.

## Tech Stack
- **Backend**: Python 3, Flask, SQLAlchemy, QRCode
- **Frontend**: HTML5, CSS3 (Custom), JavaScript (Vanilla)
- **Database**: SQLite

## Setup Instructions

1.  **Clone the repository** (or download source).
2.  **Create a virtual environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Run the application**:
    ```bash
    python app.py
    ```
5.  Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

## Project Structure
Detailed in `documentation/implementation_plan.md`.
