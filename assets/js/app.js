
// Initialize Global Instances
const db = new DataManager();
const tuitionManager = new TuitionManager(db);

// Expose to window for inline HTML access (if any)
window.db = db;
window.tuitionManager = tuitionManager;

// Global UI Variables
let currentCalendarMonth = new Date().getMonth();
let currentCalendarYear = new Date().getFullYear();
let studentChart = null;
let feeChart = null;
let currentSortColumn = null;
let currentSortOrder = 'asc';

// Helper: Show Notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    notification.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    notification.className = `notification ${type} active`;

    setTimeout(() => {
        notification.classList.remove('active');
    }, 4000);
}

// Helper: Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        const form = modal.querySelector('form');
        if (form) form.reset();
        // Reset edit states
        delete modal.dataset.editId;
        modal.removeAttribute('data-edit-id');
    }
}

// Global Custom Confirmation
function confirmAction(options = {}) {
    const {
        title = 'Are you sure?',
        message = 'This action cannot be undone.',
        onConfirm = () => { },
        confirmText = 'Yes, Delete',
        icon = 'fa-exclamation-triangle',
        color = 'var(--danger)'
    } = options;

    const modal = document.getElementById('confirmModal');
    if (!modal) return;

    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const btn = document.getElementById('confirmActionBtn');
    const iconEl = document.getElementById('confirmIcon');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (iconEl) {
        iconEl.innerHTML = `<i class="fas ${icon}"></i>`;
        iconEl.style.color = color;
    }
    if (btn) {
        btn.textContent = confirmText;
        btn.className = `btn ${color === 'var(--danger)' ? 'btn-danger' : 'btn-primary'}`;
        btn.onclick = () => {
            onConfirm();
            closeModal('confirmModal');
        };
    }

    openModal('confirmModal');
}

// Helper: Theme Management
function toggleThemeDropdown() {
    const dropdown = document.getElementById('themeDropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function changeTheme(theme) {
    console.log('Changing theme to:', theme);
    document.documentElement.setAttribute('data-theme', theme);

    // Update class for legacy support
    document.documentElement.className = theme === 'dark' ? 'dark-mode' : '';

    // Save to DB
    const data = db.getData();
    if (data && data.settings) {
        data.settings.theme = theme;
        db.saveData(data);
    }

    // Update active state on tiles
    document.querySelectorAll('.theme-tile').forEach(tile => {
        tile.classList.remove('active');
        if (tile.classList.contains(theme)) {
            tile.classList.add('active');
        }
    });

    showNotification(`Theme changed to ${theme}`, 'info');
}

// Helper: Populate Batch Dropdown (used by exams, communications)
function populateBatchDropdown(elementId) {
    const batches = db.getRecords('batches');
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Batch...</option>';
    batches.forEach(batch => {
        select.innerHTML += `<option value="${batch.id}">${batch.name}</option>`;
    });
}

// Helper: Populate Student Dropdown (used by communications)
function populateStudentDropdown(elementId) {
    const students = db.getRecords('students');
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Student...</option>';
    students.forEach(student => {
        select.innerHTML += `<option value="${student.id}">${student.name}</option>`;
    });
}

// Helper: Populate Tutor Dropdown (used by batches, payroll)
function populateTutorDropdown(elementId) {
    const tutors = db.getRecords('tutors');
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Tutor...</option>';
    tutors.forEach(tutor => {
        select.innerHTML += `<option value="${tutor.name}">${tutor.name}</option>`;
    });
}

// Helper: Filter Students search
function filterStudents() {
    const search = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#studentsTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

// Helper: Filter Batches search
function filterBatches() {
    const search = document.getElementById('batchSearch')?.value?.toLowerCase() || '';
    const rows = document.querySelectorAll('#batchesTable tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

// Helper: Save Homework Tracking
function saveHomeworkTracking() {
    const checkboxes = document.querySelectorAll('#homeworkTrackerContent input[type="checkbox"]');
    const homeworkId = document.getElementById('homeworkTrackerModal')?.dataset?.homeworkId;
    if (!homeworkId) return;

    const tracking = [];
    checkboxes.forEach(cb => {
        tracking.push({ studentId: cb.dataset.studentId, submitted: cb.checked });
    });

    const homework = db.getRecords('homework').find(h => h.id === homeworkId);
    if (homework) {
        db.updateRecord('homework', homeworkId, { tracking });
        showNotification('Tracking saved!');
        closeModal('homeworkTrackerModal');
        if (typeof loadHomework === 'function') loadHomework();
    }
}

// Helper: Sort Table (generic)
function sortTable(columnIndex, tableId) {
    const table = document.querySelector(`#${tableId} table`);
    if (!table) return;
    const tbody = table.querySelector('tbody');
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));

    if (currentSortColumn === columnIndex) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnIndex;
        currentSortOrder = 'asc';
    }

    rows.sort((a, b) => {
        const aText = a.cells[columnIndex]?.textContent?.trim() || '';
        const bText = b.cells[columnIndex]?.textContent?.trim() || '';
        const aNum = parseFloat(aText.replace(/[₹,]/g, ''));
        const bNum = parseFloat(bText.replace(/[₹,]/g, ''));

        if (!isNaN(aNum) && !isNaN(bNum)) {
            return currentSortOrder === 'asc' ? aNum - bNum : bNum - aNum;
        }
        return currentSortOrder === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
    });

    rows.forEach(row => tbody.appendChild(row));
}

// Backward compatibility alias
function showSection(pageId) {
    navigateToPage(pageId);
}

// Navigation Logic
function navigateToPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageId) {
            item.classList.add('active');
        }
    });

    // Update header title
    const titles = {
        'dashboard': 'Dashboard',
        'students': 'Student Management',
        'batches': 'Batch Management',
        'tutors': 'Tutor Management',
        'fees': 'Fee Management',
        'expenses': 'Expense Tracker',
        'attendance': 'Attendance Manager',
        'calendar': 'Academic Calendar',
        'reports': 'Reports & Analytics',
        'settings': 'System Settings',
        'homework': 'Homework & Assignments',
        'syllabus': 'Syllabus Tracker',
        'exams': 'Exams & Results',
        'payroll': 'Tutor Payroll',
        'analytics': 'Analytics & Insights',
        'parents': 'Parent Communication Portal'
    };

    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) pageTitle.textContent = titles[pageId] || 'Dashboard';

    // Load page-specific data
    switch (pageId) {
        case 'dashboard': if (typeof loadDashboard === 'function') loadDashboard(); break;
        case 'students': if (typeof loadStudents === 'function') loadStudents(); break;
        case 'batches': if (typeof loadBatches === 'function') loadBatches(); break;
        case 'tutors': if (typeof loadTutors === 'function') loadTutors(); break;
        case 'fees': if (typeof loadFees === 'function') loadFees(); break;
        case 'expenses': if (typeof loadExpenses === 'function') loadExpenses(); break;
        case 'attendance': if (typeof loadAttendancePage === 'function') loadAttendancePage(); break;
        case 'calendar': if (typeof loadCalendar === 'function') loadCalendar(); break;
        case 'reports': if (typeof loadReportsPage === 'function') loadReportsPage(); break;
        case 'settings': if (typeof loadSettings === 'function') loadSettings(); break;
        case 'homework': if (typeof loadHomework === 'function') loadHomework(); break;
        case 'syllabus': if (typeof loadSyllabus === 'function') loadSyllabus(); break;
        case 'exams': if (typeof loadExams === 'function') loadExams(); break;
        case 'payroll': if (typeof loadPayrollData === 'function') loadPayrollData(); break;
        case 'analytics': if (typeof loadAnalytics === 'function') loadAnalytics(); break;
        case 'parents': if (typeof loadParentCommunications === 'function') loadParentCommunications(); break;
    }

    // Close sidebar on mobile if needed
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
        }
    }
}

// Global Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Load Theme from DB
    const data = db.getData();
    if (data.settings && data.settings.theme) {
        const theme = data.settings.theme;
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.className = theme === 'dark' ? 'dark-mode' : '';

        // Mark active tile
        setTimeout(() => {
            document.querySelectorAll('.theme-tile').forEach(tile => {
                if (tile.classList.contains(theme)) tile.classList.add('active');
            });
        }, 500);
    }

    // Wire up sidebar navigation clicks
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            if (page) navigateToPage(page);
        });
    });

    // Initialize Navigation - Default to dashboard
    navigateToPage('dashboard');

    // Close modals on outside click
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
        if (!event.target.matches('.theme-btn') && !event.target.closest('.theme-dropdown')) {
            const dropdown = document.getElementById('themeDropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
            }
        }
    };

    console.log('✅ Coaching Management System Initialized (Modular)');
});
