
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

        html += `
            <tr>
                <td>
                    <div style="font-weight: 600;">${student.name}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">${student.phone}</div>
                </td>
                <td>${student.rollNumber || student.student_code || '-'}</td>
                <td><div style="display: flex; gap: 5px; flex-wrap: wrap;">${studentBatches}</div></td>
                <td>₹${paid} / ₹${total}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-small" onclick="editStudent('${student.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-success btn-small" onclick="window.open('https://wa.me/${(student.phone || '').replace(/\\D/g, '')}', '_blank')" title="WhatsApp"><i class="fab fa-whatsapp"></i></button>
                        <button class="btn btn-info btn-small" onclick="window.open('mailto:${student.email || ''}', '_blank')" title="Email"><i class="fas fa-envelope"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('studentsTable').innerHTML = html;
}

function openStudentModal() {
    // Populate batch select
    const batches = db.getRecords('batches');
    const select = document.getElementById('studentBatches');
    select.innerHTML = batches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

    // Reset form
    document.getElementById('studentForm').reset();
    document.getElementById('studentModal').removeAttribute('data-edit-id');

    openModal('studentModal');
}

function saveStudent(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('studentModal');
    const editId = modal.dataset.editId;

    // Handle multiple select for batches if applicable, but currently it's a single select in HTML
    // Logic below assumes single select based on provided HTML structure (Step 1454)
    // BUT TuitionManager supports array. We should adapt.
    // If <select> is multiple, we collect values. If not, single.
    const batchSelect = document.getElementById('studentBatches');
    const selectedBatches = Array.from(batchSelect.selectedOptions).map(opt => opt.value);

    // If existing logic used 'batch' (singular), we migrate to 'batches' (array)
    // For now, let's keep it robust.

    const studentData = {
        name: document.getElementById('studentName').value,
        rollNumber: document.getElementById('studentRollNumber').value,
        email: document.getElementById('studentEmail').value,
        phone: document.getElementById('studentPhone').value,
        address: document.getElementById('studentAddress').value,
        batches: selectedBatches,
        // Also keep 'batch' for backward compatibility if needed, or rely on 'batches'
        batch: selectedBatches[0] || '',
        totalFee: parseFloat(document.getElementById('studentFees').value) || 0,
        parentName: document.getElementById('studentParentName').value,
        parentPhone: document.getElementById('studentParentPhone').value,
        parentEmail: document.getElementById('studentParentEmail').value,
        status: 'active'
    };

    if (editId) {
        // Preserve paid amount
        const existing = db.getRecords('students').find(s => s.id === editId);
        if (existing) {
            studentData.paidAmount = existing.paidAmount || 0;
            studentData.student_code = existing.student_code;
        }
        db.updateRecord('students', editId, studentData);
        showNotification('Student updated successfully!');
    } else {
        tuitionManager.enrollStudent(studentData); // Auto-generates ID and Code
        showNotification('Student enrolled successfully!');
    }

    closeModal('studentModal');
    loadStudents();
    loadDashboard(); // Refresh dashboard stats
}

function editStudent(id) {
    const student = db.getRecords('students').find(s => s.id === id);
    if (!student) return;

    document.getElementById('studentName').value = student.name;
    document.getElementById('studentRollNumber').value = student.rollNumber || '';
    document.getElementById('studentEmail').value = student.email || '';
    document.getElementById('studentPhone').value = student.phone || '';
    document.getElementById('studentAddress').value = student.address || '';
    document.getElementById('studentFees').value = student.totalFee || '';
    document.getElementById('studentParentName').value = student.parentName || '';
    document.getElementById('studentParentPhone').value = student.parentPhone || '';
    document.getElementById('studentParentEmail').value = student.parentEmail || '';

    const batchSelect = document.getElementById('studentBatches');
    // Re-populate to ensure latest batches
    const batches = db.getRecords('batches');
    batchSelect.innerHTML = batches.map(b => `<option value="${b.name}">${b.name}</option>`).join('');

    // Set selected batches
    if (student.batches) {
        Array.from(batchSelect.options).forEach(opt => {
            opt.selected = student.batches.includes(opt.value);
        });
    } else if (student.batch) {
        batchSelect.value = student.batch;
    }

    document.getElementById('studentModal').dataset.editId = id;
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
