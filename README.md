# Zteeel

Zteeel is a cross-platform mobile application connecting customers with local restaurants and stores offering time-based deals (clearance and slow-hour deals). The application features two distinct personas (Customer and Vendor) with tailored UI/UX and functionalities.

## Technical Overview

### Architecture & Tech Stack
*   **Frontend**: React Native (with Expo), Expo Router for navigation, Async Storage for local data, and native maps (`react-native-maps`).
*   **Backend**: FastAPI (Python), serving RESTful APIs.
*   **Database**: PostgreSQL 15 with PostGIS 3.3 extension for geospatial queries and location-based deal discovery.
*   **Authentication**: JWT-based authentication and Google OAuth.
*   **Payments**: Razorpay (currently configured in test/mock mode).
*   **Styling Strategy**: Dual Persona System ("Neo-Brutalist Pop" for Customers, "Swiss Utility" for Vendors).

### Key Features
*   **Customer App**: Deal discovery (slow-hour & clearance), PostGIS radius search, cart and checkout flow with reward tier progress, map view to find nearby vendors, order history.
*   **Vendor App**: Dashboard with analytics and daily revenue, menu item management, dynamic deal creation (slow hour/clearance), order lifecycle management (accept/decline/status updates).

## Setup & Installation Instructions

### Prerequisites
*   Node.js (v18+)
*   Python (3.9+)
*   PostgreSQL (v15+) with PostGIS (v3.3+) extension installed.

### Backend Setup
1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create and activate a Python virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\\Scripts\\activate`
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Ensure PostgreSQL is running and the `zteeel_db` database is created with the PostGIS extension enabled. (The backend will auto-create tables on startup).
5.  Set up environment variables (if any required in `.env`), such as database credentials and Razorpay test keys.

### Frontend Setup
1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies using Yarn or npm:
    ```bash
    yarn install
    # or
    npm install
    ```
3.  Ensure you have Expo CLI installed globally, or use `npx expo`.

## Running the Application

### Running the Backend
1.  From the `backend` directory with the virtual environment activated, run:
    ```bash
    ./start_backend.sh
    # Alternatively, run Uvicorn directly:
    uvicorn server:app --host 0.0.0.0 --port 8001 --reload
    ```
    *The API will be available at `http://localhost:8001`.*

### Running the Frontend
1.  From the `frontend` directory, start the Expo development server:
    ```bash
    yarn start
    # or
    npm run start
    ```
2.  Use the **Expo Go** app on your physical device to scan the QR code, or press `a` to run on an Android emulator, or `i` to run on an iOS simulator.

## Default Demo Accounts
The backend is seeded with the following test vendor accounts:
*   **Vendor 1**: maharaja@zteeel.com / password: `vendor123`
*   **Vendor 2**: freshjuice@zteeel.com / password: `vendor123`
*   **Vendor 3**: pizzahub@zteeel.com / password: `vendor123`

*Customers can create a new account via the registration screen to test the customer flow.*
