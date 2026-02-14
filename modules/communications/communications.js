
// Parent Communication Logic
function openParentMessageModal() {
    populateBatchDropdown('parentMessageBatch');
    populateStudentDropdown('parentMessageStudent');
    openModal('parentMessageModal');
}

function updateRecipientInfo() {
    const recipient = document.getElementById('parentMessageRecipient').value;
    const parentBatchGroup = document.getElementById('parentBatchGroup');
    const parentStudentGroup = document.getElementById('parentStudentGroup');

    if (parentBatchGroup) parentBatchGroup.style.display = recipient === 'batch' ? 'block' : 'none';
    if (parentStudentGroup) parentStudentGroup.style.display = recipient === 'student' ? 'block' : 'none';
}

function loadMessageTemplate(templateName) {
    const template = tuitionManager.messageTemplates[templateName];
    if (template) {
        document.getElementById('parentMessageText').value = template;
        showNotification('Template loaded!', 'info');
    }
}

function sendParentMessage(e) {
    if (e) e.preventDefault();
    const type = document.getElementById('parentMessageType').value;
    const recipientType = document.getElementById('parentMessageRecipient').value;
    const message = document.getElementById('parentMessageText').value;
    const subject = document.getElementById('parentMessageSubject').value;

    let recipients = [];
    const students = db.getRecords('students');

    if (recipientType === 'all') {
        recipients = students.map(s => ({
            studentId: s.id,
            studentName: s.name,
            parentName: s.parentName || 'Parent',
            phone: s.parentPhone || s.phone,
            email: s.parentEmail || s.email,
            subject
        }));
    } else if (recipientType === 'batch') {
        const batchId = document.getElementById('parentMessageBatch').value;
        const batch = db.getRecords('batches').find(b => b.id === batchId);
        recipients = students.filter(s => (batch?.students || []).includes(s.id)).map(s => ({
            studentId: s.id,
            batchId: batchId,
            studentName: s.name,
            parentName: s.parentName || 'Parent',
            phone: s.parentPhone || s.phone,
            email: s.parentEmail || s.email,
            subject
        }));
    } else if (recipientType === 'student') {
        const studentId = document.getElementById('parentMessageStudent').value;
        const student = students.find(s => s.id === studentId);
        if (student) {
            recipients = [{
                studentId: student.id,
                studentName: student.name,
                parentName: student.parentName || 'Parent',
                phone: student.parentPhone || student.phone,
                email: student.parentEmail || student.email,
                subject
            }];
        }
    }

    if (recipients.length === 0) {
        showNotification('No recipients selected', 'warning');
        return;
    }

    tuitionManager.sendMessage(recipients, message, type);
    closeModal('parentMessageModal');
    loadParentCommunications();
    showNotification(`Message sent to ${recipients.length} recipient(s)! (Placeholder - integrate with SMS/WhatsApp API)`, 'success');
}

function loadParentCommunications() {
    const filterStudentId = document.getElementById('parentCommStudentFilter')?.value || '';
    const communications = tuitionManager.getMessageHistory(filterStudentId || null);
    const students = db.getRecords('students');

    if (communications.length === 0) {
        document.getElementById('parentCommunicationsTable').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No messages sent yet.</p>';
        return;
    }

    let html = '<table><thead><tr><th>Date</th><th>Student/Group</th><th>Type</th><th>Message</th><th>Status</th><th>Actions</th></tr></thead><tbody>';

    communications.reverse().slice(0, 50).forEach(comm => {
        let recipientName = 'N/A';
        let recipientPhone = comm.recipientPhone;
        let recipientEmail = comm.recipientEmail;

        if (comm.studentId) {
            const student = students.find(s => s.id === comm.studentId);
            recipientName = student ? student.name : 'Unknown Student';
        } else if (comm.batchId) {
            const batch = db.getRecords('batches').find(b => b.id === comm.batchId);
            recipientName = batch ? `Batch: ${batch.name}` : 'Unknown Batch';
        }

        const icon = comm.messageType === 'sms' ? '📱' : comm.messageType === 'whatsapp' ? '💬' : '📧';

        html += `
            <tr>
                <td>${new Date(comm.sentAt).toLocaleString()}</td>
                <td>${recipientName}</td>
                <td>${icon} ${comm.messageType.toUpperCase()}</td>
                <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${comm.message}">${comm.message}</td>
                <td><span class="status-badge ${comm.status === 'sent' ? 'paid' : 'pending'}">${comm.status}</span></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                    ${comm.messageType === 'whatsapp' && recipientPhone ?
                `<button class="btn btn-small btn-success" onclick="window.open('https://wa.me/${recipientPhone.replace(/\\D/g, '')}?text=${encodeURIComponent(comm.message)}', '_blank')" title="Open WhatsApp"><i class="fab fa-whatsapp"></i> Open</button>` : ''}
                    ${comm.messageType === 'email' && recipientEmail ?
                `<button class="btn btn-small btn-info" onclick="window.open('mailto:${recipientEmail}?subject=${encodeURIComponent(comm.subject)}&body=${encodeURIComponent(comm.message)}')" title="Open Email"><i class="fas fa-envelope"></i> Open</button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    document.getElementById('parentCommunicationsTable').innerHTML = html;
}
