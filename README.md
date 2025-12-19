# 💰 Expense Splitter App

A modern, real-time expense sharing application built with React and Supabase. Split expenses with friends, track balances, and settle dues efficiently.

![React](https://img.shields.io/badge/React-18.x-blue?logo=react)
![Supabase](https://img.shields.io/badge/Supabase-v2-green?logo=supabase)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)
![License](https://img.shields.io/badge/License-MIT-success)

---

## ✨ Features

### 👤 User Management
- ✅ Email/Password authentication via Supabase Auth
- ✅ User profile with email and username
- ✅ Secure session management
- ✅ Sign up, Sign in, Sign out

### 👥 Group Management
- ✅ Create expense groups for different occasions
- ✅ View all user groups
- ✅ Add/Remove members dynamically
- ✅ Delete groups (admin only)
- ✅ View group member details

### 💸 Expense Management
- ✅ Add expenses with detailed information
- ✅ Three split types:
  - **EQUAL**: Split amount equally among members
  - **EXACT AMOUNT**: Set exact amount for each person
  - **PERCENTAGE**: Split by percentage (must sum to 100%)
- ✅ Dynamic member selection per expense
- ✅ Manual amount adjustment for splits
- ✅ Automatic split calculation
- ✅ Expense history per group
- ✅ Edit/Delete expenses

### 💳 Balance Tracking
- ✅ Real-time balance calculation
- ✅ Who owes whom tracking
- ✅ User owes amount display
- ✅ Owed to user amount display
- ✅ Net balance calculation (positive/negative)
- ✅ Balance simplification algorithm
- ✅ Detailed balance view per group
- ✅ Outstanding balances summary

### 🏦 Settlement Features
- ✅ Record settlement payments
- ✅ Settlement history with timestamps
- ✅ Track who paid whom
- ✅ Automatic balance updates on settlement
- ✅ Payment tracking and verification

### 📊 Analytics & Visualization
- ✅ Beautiful dashboard with real-time charts
- ✅ Expense timeline (line chart)
- ✅ Expenses by person (bar chart)
- ✅ Split types distribution (pie chart)
- ✅ Who owes what (bar chart)
- ✅ Statistics cards (total, average, balance, settlements)

### 🎨 UI/UX Features
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Dark mode support (system preference detection)
- ✅ Real-time data updates with Supabase subscriptions
- ✅ Beautiful UI with gradients and animations
- ✅ Loading states for all async operations
- ✅ Input validation on all forms
- ✅ Error handling with user-friendly messages
- ✅ Success notifications after actions

---

## 🛠 Tech Stack

### Frontend
- **React 18** - UI library
- **React Hooks** - State management
- **Recharts** - Data visualization charts
- **CSS3** - Styling with gradients and animations

### Backend
- **Supabase** - PostgreSQL database + Auth + Real-time
- **PostgreSQL** - Relational database
- **Row-Level Security (RLS)** - Data protection

### Deployment
- **Vercel** - Frontend hosting with auto-deploy
- **GitHub** - Version control

---

## 📋 Database Schema

-- Users Table
users (id, email, username, full_name, profile_picture_url, created_at, updated_at)

-- Groups Table
groups (id, group_name, description, created_by, created_at, updated_at)

-- Group Members Table
group_members (id, group_id, user_id, joined_at)

-- Expenses Table
expenses (id, group_id, paid_by, description, amount, split_type, created_at, updated_at)

-- Expense Splits Table
expense_splits (id, expense_id, user_id, amount, percentage, created_at)

-- Balances Table
balances (id, group_id, creditor_id, debtor_id, amount, created_at, updated_at)

-- Settlements Table
settlements (id, group_id, from_user, to_user, amount, settled_at)

