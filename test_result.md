
#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Build Zteeel - a cross-platform mobile app connecting customers with local restaurants/stores
  offering time-based deals. Two separate apps: Customer App and Vendor App.
  Tech: React Native with Expo, FastAPI backend, PostgreSQL with PostGIS.
  Auth: JWT + Google OAuth. Payments: Razorpay (test/mock mode).

backend:
  - task: "PostgreSQL database setup with PostGIS"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "PostgreSQL 15 installed with PostGIS 3.3. Database zteeel_db created. All tables created via SQLAlchemy. Seed data loaded (3 vendors, 13 menu items, 3 deals, 7 reward tiers)."

  - task: "User Authentication (register/login/JWT)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Register, login, Google OAuth endpoints implemented with PostgreSQL. JWT tokens issued. Demo accounts seeded."

  - task: "Vendor Profile Management"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Vendor setup/profile/update endpoints implemented with PostgreSQL."

  - task: "Menu Item CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Menu item create/read/update/delete implemented with PostgreSQL."

  - task: "Deal CRUD with dynamic pricing"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Deal CRUD with slow_hour and clearance types. Dynamic discount calculation for clearance deals."

  - task: "PostGIS nearby deals/vendors query"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "ST_DWithin + ST_Distance queries implemented. Tested with Mumbai coordinates - returns 3 deals correctly."

  - task: "Reward Tiers CRUD"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Reward tier create/read/delete implemented."

  - task: "Order Management"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Order creation, status updates, customer/vendor order history implemented."

  - task: "Razorpay payment (mock mode)"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Mock payment flow implemented. Creates mock order ID and verifies mock payments."

  - task: "Vendor Analytics"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Daily revenue, items sold, orders, peak hours analytics implemented."

frontend:
  - task: "App startup (no crash)"
    implemented: true
    working: true
    file: "frontend/contexts/CartContext.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "App loads successfully. Welcome screen renders. CartContext.tsx is clean."

  - task: "Auth flow (login/register/welcome)"
    implemented: true
    working: true
    file: "frontend/app/auth/"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Welcome, login, register screens implemented. JWT auth working with PostgreSQL backend."

  - task: "Customer home (deal discovery)"
    implemented: true
    working: true
    file: "frontend/app/(customer)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Deals list with filter tabs (All/Slow Hour/Clearance), location detection, pull to refresh."

  - task: "Vendor detail screen with menu & cart"
    implemented: true
    working: true
    file: "frontend/app/(customer)/vendor/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Vendor hero, active deals display, reward progress, category tabs, menu items with add/qty controls, sticky cart bar."

  - task: "Map screen"
    implemented: true
    working: true
    file: "frontend/app/(customer)/map.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Map screen with vendor list. Native map (react-native-maps) on mobile, fallback on web."

  - task: "Cart with reward progress bar"
    implemented: true
    working: true
    file: "frontend/app/(customer)/cart.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Cart with items, quantity controls, reward tier progress bar, bill summary, checkout button."

  - task: "Razorpay payment flow"
    implemented: true
    working: true
    file: "frontend/app/(customer)/cart.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Mock payment flow - shows test payment alert, simulates success, creates order and verifies."

  - task: "Customer orders screen"
    implemented: true
    working: true
    file: "frontend/app/(customer)/orders.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Order history list with status badges, item summary, totals."

  - task: "Vendor dashboard"
    implemented: true
    working: true
    file: "frontend/app/(vendor)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Vendor dashboard with stats, quick actions, recent orders with accept/decline/status workflow."

  - task: "Vendor deal management"
    implemented: true
    working: true
    file: "frontend/app/(vendor)/deals.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Deal list with toggle active/pause, delete, create new deal navigation."

  - task: "Vendor menu management"
    implemented: true
    working: true
    file: "frontend/app/(vendor)/menu.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Menu items CRUD with modal, category grouping, availability toggle."

  - task: "Vendor analytics dashboard"
    implemented: true
    working: true
    file: "frontend/app/(vendor)/analytics.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Analytics with metrics grid, bar chart for peak hours, growth tips."

metadata:
  created_by: "main_agent"
  version: "2.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "User Authentication (register/login/JWT)"
    - "PostGIS nearby deals/vendors query"
    - "Vendor Profile Management"
    - "Deal CRUD with dynamic pricing"
    - "Order Management"
  stuck_tasks: []
  test_all: true
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Major migration completed:
      1. Backend migrated from MongoDB to PostgreSQL 15 + PostGIS 3.3
      2. All API endpoints rewritten with SQLAlchemy async + raw SQL
      3. PostGIS ST_DWithin + ST_Distance used for geolocation queries
      4. All tables auto-created on startup, seed data loaded
      5. Frontend vendor detail screen improved with reward progress, qty controls
      
      Demo accounts:
      - Vendor: maharaja@zteeel.com / vendor123
      - Vendor: freshjuice@zteeel.com / vendor123
      - Vendor: pizzahub@zteeel.com / vendor123
      
      Please test all backend endpoints, especially:
      - Auth (register/login)
      - Nearby deals with PostGIS
      - Full order flow (create order → mock payment)
