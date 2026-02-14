# Coaching Management System (CMS)

A comprehensive, modular web application designed for coaching institutes to manage students, batches, fees, exams, and more. Built with vanilla JavaScript, HTML, and CSS, it features a modern, responsive UI and uses Supabase for cloud backups.

## 🚀 Key Features

*   **Student Management**: 
    *   Enroll students with detailed profiles.
    *   Track academic history, fees, and attendance.
    *   Generate student ID cards and reports.

*   **Batch Management**:
    *   Create and manage batches with schedules.
    *   Assign tutors and track batch-wise progress.
    *   Handle session adjustments (cancellations/rescheduling).

*   **Fee Management**:
    *   Track pending and collected fees.
    *   Generate automated receipts.
    *   Dashboard insights on revenue.

*   **Exam & Results**:
    *   Schedule exams and capture marks.
    *   **New:** Detailed Exam Performance Analytics with charts.
    *   Share results via WhatsApp integration.
    *   Generate report cards.

*   **Attendance System**:
    *   Mark attendance batch-wise.
    *   Track absenteeism and send alerts.

*   **Homework & Syllabus**:
    *   Assign homework and track submission status.
    *   Monitor syllabus completion percentage per batch.

*   **Communication**:
    *   Send SMS/WhatsApp/Email notifications to parents/students.
    *   Pre-defined templates for fee reminders, exam alerts, etc.

*   **Cloud Backup & Restore**:
    *   Securely backup data to Supabase cloud.
    *   Restore data on any device.
    *   **Note:** Requires Supabase project setup.

*   **Staff & Payroll**:
    *   Manage tutors and staff profiles.
    *   Process payroll with history tracking.

## 🛠️ Tech Stack

*   **Frontend**: HTML5, CSS3 (Custom Design System), JavaScript (ES6+)
*   **Database**: LocalStorage (for offline-first capability) + Supabase (PostgreSQL) for Cloud Backup
*   **Charts**: Chart.js for analytics
*   **Styling**: Modern, responsive UI with dark/light theme support.

## 📦 Installation & Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/coaching-management.git
    ```

2.  **Open the Application**:
    Simply open `index.html` in any modern web browser. No build step required!

    ```bash
    # Or serve locally using python
    python -m http.server 8000
    ```

3.  **Cloud Backup Setup (Optional)**:
    To enable cloud backups, you need a Supabase project.
    
    *   Create a project on [Supabase](https://supabase.com).
    *   Run the provided SQL script `coaching_backup_fix.sql` in your Supabase SQL Editor to create the `coaching_backups` table.
    *   Update `assets/js/backup-service.js` with your project URL and Anon Key (public key only).

## 📂 Project Structure

```
├── assets/
│   ├── css/            # Stylesheets
│   └── js/             # Core scripts (app.js, data-manager.js, backup-service.js)
├── modules/            # Feature modules
│   ├── analytics/      # Business analytics
│   ├── attendance/     # Attendance tracking
│   ├── batches/        # Batch management
│   ├── dashboard/      # Main dashboard with stats
│   ├── exams/          # Exam & results (includes analytics)
│   ├── fees/           # Fee collection & receipts
│   ├── students/       # Student profiles
│   ├── tutors/         # Staff management
│   └── ...             # Other modules
├── index.html          # Main application entry point
└── README.md           # Project documentation
```

## 🔐 Security Note

*   This application uses a client-side architecture. **Do not commit your Supabase Service Role (Secret) Key.** Only use the Anon (Public) Key in the frontend code.
*   Configure Supabase Row Level Security (RLS) policies to restrict access as needed.

## 📄 License

This project is licensed under the MIT License.
