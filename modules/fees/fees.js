
// Fee Management Logic
function loadFees() {
    const students = db.getRecords('students');
    const payments = db.getRecords('payments');

    const filterSelect = document.getElementById('paymentStudentFilter');
    if (filterSelect) {
        const currentVal = filterSelect.value;
        filterSelect.innerHTML = '<option value="">All Students</option>' + students.map(s =>
            `<option value="${s.id}" ${s.id === currentVal ? 'selected' : ''}>${s.name}</option>`
        ).join('');
    }

    const paymentSelect = document.getElementById('paymentStudent');
    if (paymentSelect) {
        paymentSelect.innerHTML = '<option value="">Select Student</option>' + students.map(s =>
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
    }

    const filterId = filterSelect ? filterSelect.value : '';
    const filtered = filterId ? students.filter(s => s.id === filterId) : students;

    const totalFees = filtered.reduce((sum, s) => sum + (parseFloat(s.totalFee) || 0), 0);
    const collectedFees = filtered.reduce((sum, s) => sum + (parseFloat(s.paidAmount) || 0), 0);
    const pendingFees = totalFees - collectedFees;

    const feeStats = document.getElementById('feeStats');
    if (feeStats) {
        feeStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon fees">💰</div>
                <div class="stat-value">₹${totalFees.toLocaleString()}</div>
                <div class="stat-label">Total Fees</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">✓</div>
                <div class="stat-value">₹${collectedFees.toLocaleString()}</div>
                <div class="stat-label">Collected</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: linear-gradient(135deg, #ef4444, #dc2626);">⏱</div>
                <div class="stat-value">₹${pendingFees.toLocaleString()}</div>
                <div class="stat-label">Pending</div>
            </div>
        `;
    }

    const feesTable = document.getElementById('feesTable');
    if (feesTable) {
        feesTable.innerHTML = filtered.length ? `
            <table>
                <thead>
                    <tr>
                        <th>Student</th>
                        <th>Total Fee</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.map(s => {
            const balance = (s.totalFee || 0) - (s.paidAmount || 0);
            return `
                        <tr>
                            <td><strong>${s.name}</strong></td>
                            <td>₹${s.totalFee}</td>
                            <td>₹${s.paidAmount || 0}</td>
                            <td>₹${balance}</td>
                            <td><span class="status-badge ${s.paidAmount >= s.totalFee ? 'paid' : (s.paidAmount > 0 ? 'partial' : 'pending')}">
                                ${s.paidAmount >= s.totalFee ? 'Paid' : (s.paidAmount > 0 ? 'Partial' : 'Pending')}
                            </span></td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary);">No fee data</p>';
    }

    const filteredPayments = filterId ? payments.filter(p => p.studentId === filterId) : payments;
    // Sort by date descending
    filteredPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const paymentHistory = document.getElementById('paymentHistory');
    if (paymentHistory) {
        paymentHistory.innerHTML = filteredPayments.length ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Student</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredPayments.map(p => {
            const student = students.find(s => s.id === p.studentId);
            return `
                        <tr>
                            <td>${new Date(p.date).toLocaleDateString()}</td>
                            <td>${student ? student.name : 'Unknown'}</td>
                            <td style="color: var(--success); font-weight: 600;">₹${p.amount}</td>
                            <td>${p.mode}</td>
                            <td>
                                <button class="btn btn-small btn-secondary" onclick="editPayment('${p.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-small btn-danger" onclick="deletePayment('${p.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
        ` : '<p style="color: var(--text-secondary);">No payment history</p>';
    }
}

function clearPaymentFilter() {
    const filter = document.getElementById('paymentStudentFilter');
    if (filter) {
        filter.value = '';
        loadFees();
    }
}

function openPaymentModal(paymentId = null) {
    const modal = document.getElementById('paymentModal');
    const students = db.getRecords('students');
    const paymentStudentSelect = document.getElementById('paymentStudent');

    if (paymentStudentSelect) {
        paymentStudentSelect.innerHTML = '<option value="">Select Student</option>' + students.map(s =>
            `<option value="${s.id}">${s.name}</option>`
        ).join('');
    }

    if (paymentId) {
        const payment = db.getRecords('payments').find(p => p.id === paymentId);
        if (payment) {
            if (paymentStudentSelect) {
                paymentStudentSelect.value = payment.studentId;
                paymentStudentSelect.disabled = true;
            }
            document.getElementById('paymentAmount').value = payment.amount;
            document.getElementById('paymentDate').value = payment.date;
            document.getElementById('paymentMode').value = payment.mode;
            modal.dataset.editId = paymentId;
        }
    } else {
        document.getElementById('paymentDate').valueAsDate = new Date();
        if (paymentStudentSelect) {
            paymentStudentSelect.value = '';
            paymentStudentSelect.disabled = false;
        }
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentMode').value = 'Cash';
        modal.dataset.editId = '';
    }
    openModal('paymentModal');
}

function editPayment(id) {
    openPaymentModal(id);
}

function savePayment(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('paymentModal');
    const editId = modal?.dataset.editId;

    const studentId = document.getElementById('paymentStudent').value;
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const date = document.getElementById('paymentDate').value;
    const mode = document.getElementById('paymentMode').value;

    if (!studentId || !amount || !date) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    const student = db.getRecords('students').find(s => s.id === studentId);
    if (!student) {
        showNotification('Student not found', 'error');
        return;
    }

    if (editId) {
        const oldPayment = db.getRecords('payments').find(p => p.id === editId);
        if (oldPayment) {
            const diff = amount - parseFloat(oldPayment.amount);
            student.paidAmount = (student.paidAmount || 0) + diff;

            db.updateRecord('payments', editId, { studentId, amount, date, mode });
            db.updateRecord('students', studentId, { paidAmount: student.paidAmount });
            showNotification('Payment updated!');
        }
    } else {
        const payment = { studentId, amount, date, mode };
        db.addRecord('payments', payment);

        student.paidAmount = (student.paidAmount || 0) + amount;
        db.updateRecord('students', studentId, { paidAmount: student.paidAmount });
        showNotification('Payment recorded!');
    }

    closeModal('paymentModal');
    loadFees();
    loadDashboard ? loadDashboard() : null;
}

function deletePayment(id) {
    confirmAction({
        title: 'Delete Payment?',
        message: 'This will remove the transaction record and revert the student\'s balance. This action cannot be undone.',
        onConfirm: () => {
            const payment = db.getRecords('payments').find(p => p.id === id);
            if (payment && payment.studentId) {
                const student = db.getRecords('students').find(s => s.id === payment.studentId);
                if (student) {
                    const newPaid = (parseFloat(student.paidAmount) || 0) - (parseFloat(payment.amount) || 0);
                    db.updateRecord('students', student.id, { paidAmount: Math.max(0, newPaid) });
                }
            }
            db.deleteRecord('payments', id);
            loadFees();
            showNotification('Payment deleted and balance reverted.');
            if (typeof loadDashboard === 'function') loadDashboard();
        }
    });
}

function exportPaymentPDF() {
    const studentId = document.getElementById('paymentStudentFilter').value;
    const students = db.getRecords('students');
    const student = studentId ? students.find(s => s.id === studentId) : null;
    const payments = db.getRecords('payments');

    let filteredPayments = studentId ? payments.filter(p => p.studentId === studentId) : payments;
    // Map student names
    filteredPayments = filteredPayments.map(p => {
        const s = students.find(st => st.id === p.studentId);
        return { ...p, studentName: s ? s.name : 'Unknown' };
    });

    const institute = db.getData().settings;

    const html = `
        <div style="padding: 30px; font-family: 'Inter', sans-serif; color: #333; background: white;">
            <div style="text-align: center; border-bottom: 2px solid var(--primary); padding-bottom: 20px; margin-bottom: 25px;">
                <h1 style="color: var(--primary); margin: 0; font-size: 24px;">${institute.name || 'Coaching Institute'}</h1>
                <p style="margin: 5px 0; color: #64748b; font-size: 13px;">${institute.address || ''}</p>
                <div style="margin-top: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-size: 16px; color: #1e293b;">Payment Transaction Statement</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
                <div>
                    ${student ? `
                        <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Student Details</div>
                        <div style="font-weight: 700; font-size: 18px; color: #1e293b;">${student.name}</div>
                        <div style="font-size: 13px; color: #475569; margin-top: 4px;">
                            <strong>Roll No:</strong> ${student.rollNumber || student.student_code || 'N/A'}<br>
                            <strong>Contact:</strong> ${student.phone || ''}
                        </div>
                    ` : '<strong style="font-size: 16px;">All Students Transaction Log</strong>'}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Statement Info</div>
                    <div style="font-size: 13px; color: #475569;">
                        <strong>Date:</strong> ${new Date().toLocaleDateString()}<br>
                        <strong>Total Records:</strong> ${filteredPayments.length}
                    </div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                <thead>
                    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 12px; text-align: left; font-size: 12px; color: #475569;">DATE</th>
                        <th style="padding: 12px; text-align: left; font-size: 12px; color: #475569;">RECEIPT #</th>
                        ${!student ? '<th style="padding: 12px; text-align: left; font-size: 12px; color: #475569;">STUDENT</th>' : ''}
                        <th style="padding: 12px; text-align: left; font-size: 12px; color: #475569;">MODE</th>
                        <th style="padding: 12px; text-align: right; font-size: 12px; color: #475569;">AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredPayments.map(p => `
                        <tr style="border-bottom: 1px solid #edf2f7;">
                            <td style="padding: 10px; font-size: 13px;">${new Date(p.paymentDate || p.date).toLocaleDateString()}</td>
                            <td style="padding: 10px; font-size: 13px; color: #64748b;">${p.receipt_number || '-'}</td>
                            ${!student ? `<td style="padding: 10px; font-size: 13px; font-weight: 500;">${p.studentName}</td>` : ''}
                            <td style="padding: 10px; font-size: 13px; text-transform: capitalize;">${p.mode || 'Cash'}</td>
                            <td style="padding: 10px; text-align: right; font-weight: 700; color: #1e293b;">₹${p.amount}</td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr style="background: #f8fafc; font-weight: bold;">
                        <td colspan="${student ? '3' : '4'}" style="padding: 15px; text-align: right; font-size: 14px;">Total Amount Received:</td>
                        <td style="padding: 15px; text-align: right; color: #059669; font-size: 18px;">₹${filteredPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0).toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>
            
            ${student ? `
                <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: #64748b;">Full Course Fee:</span>
                        <span style="font-weight: 700; color: #1e293b;">₹${(parseFloat(student.totalFee) || 0).toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                        <span style="color: #64748b;">Balance Outstanding:</span>
                        <span style="font-weight: 800; color: #dc2626; font-size: 16px;">₹${((parseFloat(student.totalFee) || 0) - (parseFloat(student.paidAmount) || 0)).toLocaleString()}</span>
                    </div>
                </div>
            ` : ''}

            <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="color: #94a3b8; font-size: 11px;">
                    Generated on ${new Date().toLocaleString()}<br>
                    ID: ${Date.now()}
                </div>
                <div style="text-align: center;">
                    <div style="width: 200px; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 12px; color: #64748b;">Authorized Signature</div>
                </div>
            </div>
        </div>
    `;

    const opt = {
        margin: 0,
        filename: student ? `Payment_Statement_${student.name.replace(/\s+/g, '_')}.pdf` : 'All_Payments_Log.pdf',
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(html).save();
}
