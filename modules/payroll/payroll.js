
// Payroll Management Logic
function openPayrollModal() {
    populateTutorDropdown('payrollTeacher');
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('payrollMonth').value = currentMonth;

    // Auto-calculate total when inputs change
    ['payrollBaseSalary', 'payrollBonus', 'payrollDeductions'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', calculatePayrollTotal);
    });

    openModal('payrollModal');
}

function loadTeacherSalaryInfo() {
    const teacherId = document.getElementById('payrollTeacher').value;
    if (!teacherId) return;

    const teacher = db.getRecords('tutors').find(t => t.id === teacherId);
    if (teacher) {
        document.getElementById('payrollBaseSalary').value = teacher.salary || 0;
        // Default classes taken - can be calculated from attendance if available
        document.getElementById('payrollClassesTaken').value = 20;
        calculatePayrollTotal();
    }
}

function calculatePayrollTotal() {
    const base = parseFloat(document.getElementById('payrollBaseSalary').value) || 0;
    const classes = parseInt(document.getElementById('payrollClassesTaken').value) || 0;
    const bonus = parseFloat(document.getElementById('payrollBonus').value) || 0;
    const deductions = parseFloat(document.getElementById('payrollDeductions').value) || 0;

    const teacher = db.getRecords('tutors').find(t => t.id === document.getElementById('payrollTeacher').value);
    let total = base;

    if (teacher && teacher.salaryType === 'per_class') {
        total = base * classes;
    }

    const finalAmount = total + bonus - deductions;
    document.getElementById('payrollTotalAmount').value = finalAmount.toFixed(2);
}

function savePayroll(e) {
    if (e) e.preventDefault();

    const teacherId = document.getElementById('payrollTeacher').value;
    const amount = parseFloat(document.getElementById('payrollTotalAmount').value);

    if (!teacherId || isNaN(amount)) {
        showNotification('Please fill all required fields correctly', 'error');
        return;
    }

    const payrollData = {
        teacherId: teacherId,
        teacherName: document.getElementById('payrollTeacher').options[document.getElementById('payrollTeacher').selectedIndex].text,
        month: document.getElementById('payrollMonth').value,
        baseSalary: parseFloat(document.getElementById('payrollBaseSalary').value),
        classesTaken: parseInt(document.getElementById('payrollClassesTaken').value) || 0,
        bonus: parseFloat(document.getElementById('payrollBonus').value) || 0,
        deductions: parseFloat(document.getElementById('payrollDeductions').value) || 0,
        totalAmount: parseFloat(document.getElementById('payrollTotalAmount').value),
        paymentDate: document.getElementById('payrollPaymentDate').value || new Date().toISOString().split('T')[0],
        paymentMode: document.getElementById('payrollPaymentMode').value,
        notes: document.getElementById('payrollNotes').value,
        status: 'paid'
    };

    tuitionManager.recordPayrollPayment(payrollData);
    closeModal('payrollModal');
    loadPayrollData();
    showNotification('Payroll payment recorded successfully!');
}

function loadPayrollData() {
    const filterTeacherSelect = document.getElementById('payrollTeacherFilter');
    const filterMonth = document.getElementById('payrollMonthFilter')?.value || '';

    // Populate filter dropdown if empty
    if (filterTeacherSelect && filterTeacherSelect.options.length <= 1) {
        populateTutorDropdown('payrollTeacherFilter');
    }

    const filterTeacherId = filterTeacherSelect?.value || '';

    const payroll = tuitionManager.getPayrollHistory(
        filterTeacherId || null,
        filterMonth || null
    );
    const tutors = db.getRecords('tutors');

    // Update stats
    const stats = tuitionManager.calculatePayrollStats();

    // Update stats UI if container exists
    const statsContainer = document.getElementById('payrollStats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon tutors">💵</div>
                <div>
                    <div class="stat-value">₹${stats.monthlyPaid.toLocaleString()}</div>
                    <div class="stat-label">This Month</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon fees">₹</div>
                <div>
                    <div class="stat-value">₹${stats.totalPaid.toLocaleString()}</div>
                    <div class="stat-label">Total Paid</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon calendar">⏳</div>
                <div>
                    <div class="stat-value">₹${stats.totalPending.toLocaleString()}</div>
                    <div class="stat-label">Pending</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon students">👨‍🏫</div>
                <div>
                    <div class="stat-value">${stats.teacherCount}</div>
                    <div class="stat-label">Teachers</div>
                </div>
            </div>
        `;
    }

    const tableContainer = document.getElementById('payrollTable');
    if (!tableContainer) return;

    if (payroll.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No payroll records found.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Teacher</th><th>Month</th><th>Base Salary</th><th>Bonus</th><th>Deductions</th><th>Total</th><th>Payment Date</th><th>Status</th></tr></thead><tbody>';

    payroll.forEach(p => {
        const teacher = tutors.find(t => t.id === p.teacherId);
        const statusClass = p.status === 'paid' ? 'paid' : 'pending';

        html += `
            <tr>
                <td><strong>${teacher?.name || 'Unknown'}</strong></td>
                <td>${new Date(p.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                <td>₹${(p.baseSalary || 0).toLocaleString()}</td>
                <td>₹${(p.bonus || 0).toLocaleString()}</td>
                <td>₹${(p.deductions || 0).toLocaleString()}</td>
                <td><strong>₹${(p.totalAmount || 0).toLocaleString()}</strong></td>
                <td>${p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : 'N/A'}</td>
                <td><span class="status-badge ${statusClass}">${p.status}</span></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    tableContainer.innerHTML = html;
}

// Helper functions that might be needed globally or locally
function populateTutorDropdown(elementId) {
    const tutors = db.getRecords('tutors').filter(t => t.status === 'active');
    const select = document.getElementById(elementId);
    if (!select) return;
    select.innerHTML = '<option value="">Select Teacher...</option>';
    tutors.forEach(tutor => {
        select.innerHTML += `<option value="${tutor.id}">${tutor.name}</option>`;
    });
}
