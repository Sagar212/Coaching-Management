
// Student Management Logic
function loadStudents() {
    const students = db.getRecords('students');
    const batches = db.getRecords('batches');

    if (students.length === 0) {
        document.getElementById('studentsTable').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No students enrolled yet.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Name</th><th>Roll No</th><th>Batches</th><th>Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    students.forEach(student => {
        const studentBatches = student.batches ?
            student.batches.map(b => `<span class="batch-badge">${b}</span>`).join('') :
            (student.batch ? `<span class="batch-badge">${student.batch}</span>` : '-');

        const paid = student.paidAmount || 0;
        const total = student.totalFee || 0;
        const statusClass = paid >= total ? 'paid' : (paid > 0 ? 'partial' : 'pending');
        const statusText = paid >= total ? 'Paid' : (paid > 0 ? 'Partial' : 'Pending');

        // Payment Schedule Progress
        let scheduleAdvice = '';
        if (student.paymentPlan === 'monthly' && paid < total) {
            const months = Math.max(1, Math.floor((new Date() - new Date(student.createdAt)) / (30 * 24 * 60 * 60 * 1000)));
            const expected = (total / 12) * months;
            if (paid < expected) {
                scheduleAdvice = `<div style="font-size: 10px; color: var(--danger);"><i class="fas fa-exclamation-circle"></i> Behind (Exp: ₹${Math.round(expected)})</div>`;
            } else {
                scheduleAdvice = `<div style="font-size: 10px; color: var(--success);"><i class="fas fa-check-circle"></i> On Track</div>`;
            }
        }

        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${student.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${student.phone}</div>
                </td>
                <td>${student.rollNumber || student.student_code || '-'}</td>
                <td><div style="display: flex; gap: 5px; flex-wrap: wrap;">${studentBatches}</div></td>
                <td>
                    <div style="font-weight: 600;">₹${paid} / ₹${total}</div>
                    ${scheduleAdvice}
                </td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-small" onclick="editStudent('${student.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-success btn-small" onclick="window.open('https://wa.me/${(student.phone || '').replace(/\D/g, '')}', '_blank')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-info btn-small" onclick="window.open('mailto:${student.email || ''}', '_blank')" title="Email"><i class="fas fa-envelope"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('studentsTable').innerHTML = html;
}



function calculateTotalFee() {
    const checkboxes = document.querySelectorAll('#studentBatchesContainer input[type="checkbox"]:checked');
    const plan = document.getElementById('studentPaymentPlan').value;
    let baseTotal = 0;

    checkboxes.forEach(cb => {
        const fee = parseFloat(cb.dataset.fee) || 0;
        baseTotal += fee;
    });

    const display = document.getElementById('selectedTotalFeeDisplay');
    if (display) display.textContent = `Batch Sum: ₹${baseTotal}${plan === 'monthly' ? '/mo' : ''}`;

    // Simplified Calculation: Batch Fee IS the Total Fee for the duration
    // No multiplication by 12.
    // The Plan selection only affects how the breakdown is displayed/calculated for installments.
    let finalTotal = baseTotal;

    const feeInput = document.getElementById('studentFees');
    if (feeInput) feeInput.value = finalTotal;

    updateFeeBreakdown();
}

function renderBatchCheckboxes(selectedBatches = []) {
    const batches = db.getRecords('batches');
    const container = document.getElementById('studentBatchesContainer');
    if (!container) return;

    if (batches.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; text-align: center; padding: 20px;">No batches available.</p>';
        return;
    }

    const rows = batches.map(b => {
        const fee = b.fee || b.monthFee || 0;
        const isChecked = selectedBatches.includes(b.name);
        return `
            <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="const cb = this.querySelector('input'); if(event.target !== cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }">
                <td style="padding: 6px 4px; text-align: center; width: 30px;">
                    <input type="checkbox" name="student_batch_select" value="${b.name}" data-fee="${fee}" 
                        ${isChecked ? 'checked' : ''} 
                        onchange="calculateTotalFee()"
                        style="cursor: pointer;">
                </td>
                <td style="padding: 6px 4px;">
                    <div style="font-weight: 500; font-size: 13px;">${b.name}</div>
                    <div style="font-size: 10px; color: var(--text-secondary); line-height: 1.2;">
                        ${b.schedule ? b.schedule.substring(0, 20) + (b.schedule.length > 20 ? '...' : '') : ''}
                    </div>
                </td>
                <td style="padding: 6px 4px; text-align: right; white-space: nowrap;">
                    ${fee > 0 ? `<span style="font-size: 11px; font-weight: 600; color: var(--success);">₹${fee}</span>` : '<span style="font-size: 10px; color: var(--text-secondary);">Free</span>'}
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}


function openStudentModal() {
    renderBatchCheckboxes();
    const display = document.getElementById('selectedTotalFeeDisplay');
    if (display) display.textContent = `Batch Sum: ₹0`;

    // Attach listener to Plan select to trigger recalcs
    document.getElementById('studentPaymentPlan').onchange = calculateTotalFee;
    // Attach listener to Fee input to trigger detailed breakdown on manual edit
    document.getElementById('studentFees').oninput = updateFeeBreakdown;

    // Reset form
    document.getElementById('studentForm').reset();
    document.getElementById('studentFees').value = '';

    // Reset Paid Amount tracker
    document.getElementById('studentFees').dataset.paid = '0';

    const modal = document.getElementById('studentModal');
    if (modal) delete modal.dataset.editId;

    openModal('studentModal');
}

function saveStudent(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('studentModal');
    const editId = modal?.dataset.editId;

    // Get checked batches
    const checkedBoxes = document.querySelectorAll('#studentBatchesContainer input[type="checkbox"]:checked');
    const selectedBatches = Array.from(checkedBoxes).map(cb => cb.value);

    const studentData = {
        name: document.getElementById('studentName').value,
        rollNumber: document.getElementById('studentRollNumber').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        address: document.getElementById('studentAddress').value,
        batches: selectedBatches,
        batch: selectedBatches[0] || '', // Fallback
        totalFee: parseFloat(document.getElementById('studentFees').value) || 0,
        paymentPlan: document.getElementById('studentPaymentPlan').value,
        reminderDate: document.getElementById('studentReminderDate').value,
        parentName: document.getElementById('studentParentName').value,
        parentPhone: document.getElementById('studentParentPhone').value,
        parentEmail: document.getElementById('studentParentEmail').value
    };

    if (!editId) {
        tuitionManager.enrollStudent(studentData);
        showNotification('Student enrolled successfully!');
    } else {
        const student = db.getRecords('students').find(s => s.id === editId);
        if (student) {
            studentData.paidAmount = student.paidAmount || 0;
            studentData.attendance = student.attendance || [];
            studentData.profilePic = student.profilePic;
            studentData.createdAt = student.createdAt; // Preserve creation date
        }
        db.updateRecord('students', editId, studentData);
        showNotification('Student details updated!');
    }

    closeModal('studentModal');
    loadStudents();
    loadDashboard();
}

function updateFeeBreakdown() {
    const totalFee = parseFloat(document.getElementById('studentFees').value) || 0;
    const paidAmount = parseFloat(document.getElementById('studentFees').dataset.paid) || 0;
    const balance = totalFee - paidAmount;

    const plan = document.getElementById('studentPaymentPlan').value;
    const hint = document.getElementById('feeBreakdownHint');
    if (!hint) return;

    let text = '';
    let statusColor = balance <= 0 ? 'var(--success)' : 'var(--danger)';
    let statusText = balance <= 0 ? 'Fully Paid' : `Balance: ₹${balance}`;

    // Fee Structure Table
    const monthly = totalFee / 12;
    const quarterly = totalFee / 4;
    const semiAnnual = totalFee / 2;
    const annual = totalFee;

    const breakdownTable = `
        <div style="margin-top: 10px; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden;">
            <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                <thead style="background: var(--bg-secondary); color: var(--text-primary);">
                    <tr>
                        <th style="text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border-color);">Mode</th>
                        <th style="text-align: right; padding: 6px 8px; border-bottom: 1px solid var(--border-color);">Installment</th>
                    </tr>
                </thead>
                <tbody>
                    <tr style="${plan === 'monthly' ? 'background: rgba(99, 102, 241, 0.1); font-weight: 600;' : ''}">
                        <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color);">Monthly (12x)</td>
                        <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${monthly.toFixed(0)}</td>
                    </tr>
                    <tr style="${plan === 'quarterly' ? 'background: rgba(99, 102, 241, 0.1); font-weight: 600;' : ''}">
                        <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color);">Quarterly (4x)</td>
                        <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${quarterly.toFixed(0)}</td>
                    </tr>
                    <tr style="${plan === 'semiannual' ? 'background: rgba(99, 102, 241, 0.1); font-weight: 600;' : ''}">
                        <td style="padding: 6px 8px; border-bottom: 1px solid var(--border-color);">Semi-Annual (2x)</td>
                        <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${semiAnnual.toFixed(0)}</td>
                    </tr>
                    <tr style="${plan === 'annual' ? 'background: rgba(99, 102, 241, 0.1); font-weight: 600;' : ''}">
                        <td style="padding: 6px 8px;">Annual (1x)</td>
                        <td style="padding: 6px 8px; text-align: right;">₹${annual.toFixed(0)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    text = `
        <div style="display: flex; justify-content: space-between; font-weight: 500; margin-bottom: 5px;">
            <span>Total: ₹${totalFee}</span>
            <span style="color: ${statusColor}">${statusText}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-secondary);">
            PAID: ₹${paidAmount} | Selected Plan: <strong>${plan.charAt(0).toUpperCase() + plan.slice(1)}</strong>
        </div>
        ${breakdownTable}
    `;

    hint.innerHTML = text;
}


function editStudent(id) {
    const student = db.getRecords('students').find(s => s.id === id);
    if (!student) return;

    // Populate fields
    document.getElementById('studentName').value = student.name;
    document.getElementById('studentRollNumber').value = student.rollNumber || '';
    document.getElementById('studentEmail').value = student.email || '';
    document.getElementById('studentPhone').value = student.phone || '';
    document.getElementById('studentAddress').value = student.address || '';

    // Fee & Plan
    document.getElementById('studentPaymentPlan').value = student.paymentPlan || 'monthly';
    document.getElementById('studentReminderDate').value = student.reminderDate || '';

    // Parent Info
    document.getElementById('studentParentName').value = student.parentName || '';
    document.getElementById('studentParentPhone').value = student.parentPhone || '';
    document.getElementById('studentParentEmail').value = student.parentEmail || '';

    // Render Checkboxes with selection
    let currentBatches = [];
    if (student.batches && Array.isArray(student.batches)) {
        currentBatches = student.batches;
    } else if (student.batch) {
        currentBatches = [student.batch];
    }

    renderBatchCheckboxes(currentBatches);

    // Calculate expected fee from batches
    // We do NOT auto-overwrite the stored fee on edit open, because user might have custom override
    // We just update the display text
    const checkboxes = document.querySelectorAll('#studentBatchesContainer input[type="checkbox"]:checked');
    let batchTotal = 0;
    checkboxes.forEach(cb => batchTotal += (parseFloat(cb.dataset.fee) || 0));

    const display = document.getElementById('selectedTotalFeeDisplay');
    if (display) display.textContent = `Batch Sum: ₹${batchTotal}`;

    // Set Stored Fee
    document.getElementById('studentFees').value = student.totalFee || '';

    // Set Paid Amount for Calculator
    document.getElementById('studentFees').dataset.paid = student.paidAmount || 0;

    updateFeeBreakdown();

    const modal = document.getElementById('studentModal');
    if (modal) modal.dataset.editId = id;

    openModal('studentModal');
}



function deleteStudent(id) {
    confirmAction({
        title: 'Delete Student?',
        message: 'All academic and fee records for this student will be permanently removed.',
        onConfirm: () => {
            db.deleteRecord('students', id);
            showNotification('Student records deleted!');
            loadStudents();
            loadDashboard();
        }
    });
}
