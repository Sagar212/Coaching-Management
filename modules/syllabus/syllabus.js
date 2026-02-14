
// Syllabus Management Logic
function loadSyllabus() {
    const syllabus = db.getRecords('syllabus');
    const batches = db.getRecords('batches');

    if (syllabus.length === 0) {
        document.getElementById('syllabusContent').innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No syllabus items tracked.</p>';
        return;
    }

    let html = '';

    // Group by Batch
    const grouped = {};
    syllabus.forEach(item => {
        const batchName = batches.find(b => b.id === item.batchId)?.name || 'Unknown Batch';
        if (!grouped[batchName]) grouped[batchName] = [];
        grouped[batchName].push(item);
    });

    Object.keys(grouped).forEach(batchName => {
        html += `<h4 style="margin: 20px 0 10px; color: var(--primary);">${batchName}</h4>`;
        html += '<div class="syllabus-grid" style="display: grid; gap: 10px;">';

        grouped[batchName].forEach(item => {
            const statusColor = item.status === 'completed' ? 'var(--success)' : item.status === 'in-progress' ? 'var(--warning)' : 'var(--text-secondary)';
            const progress = item.status === 'completed' ? 100 : item.status === 'in-progress' ? 50 : 0;

            html += `
                <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; border-left: 4px solid ${statusColor};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 600; font-size: 15px;">${item.subject}</div>
                            <div style="font-size: 13px; margin-top: 4px;">${item.topics}</div>
                        </div>
                        <span class="status-badge ${item.status === 'completed' ? 'paid' : item.status === 'in-progress' ? 'partial' : 'pending'}">${item.status}</span>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px; color: var(--text-secondary);">
                        Duration: ${item.duration || 'N/A'}
                    </div>
                    <div class="progress-bar" style="margin-top: 8px; height: 4px;">
                        <div class="progress-fill" style="width: ${progress}%; background: ${statusColor};"></div>
                    </div>
                     <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 5px;">
                        <button class="btn btn-small btn-secondary" onclick="editSyllabus('${item.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-small btn-danger" onclick="deleteSyllabus('${item.id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
    });

    document.getElementById('syllabusContent').innerHTML = html;
}

function openSyllabusModal(id = null) {
    const modal = document.getElementById('syllabusModal');
    // Populate batch dropdown
    const batches = db.getRecords('batches');
    const select = document.getElementById('syllabusBatch');
    select.innerHTML = batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    if (id) {
        const item = db.getRecords('syllabus').find(s => s.id === id);
        if (item) {
            document.getElementById('syllabusBatch').value = item.batchId;
            document.getElementById('syllabusSubject').value = item.subject;
            document.getElementById('syllabusTopics').value = item.topics;
            document.getElementById('syllabusDuration').value = item.duration;
            document.getElementById('syllabusStatus').value = item.status;
            modal.dataset.editId = id;
        }
    } else {
        document.getElementById('syllabusForm').reset();
        modal.dataset.editId = '';
    }
    openModal('syllabusModal');
}

function saveSyllabus(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('syllabusModal');
    const editId = modal?.dataset.editId;

    const data = {
        batchId: document.getElementById('syllabusBatch').value,
        subject: document.getElementById('syllabusSubject').value,
        topics: document.getElementById('syllabusTopics').value,
        duration: document.getElementById('syllabusDuration').value,
        status: document.getElementById('syllabusStatus').value
    };

    if (editId) {
        db.updateRecord('syllabus', editId, data);
        showNotification('Syllabus updated!');
    } else {
        db.addRecord('syllabus', data);
        showNotification('Syllabus item added!');
    }

    closeModal('syllabusModal');
    loadSyllabus();
    loadDashboard();
}

function editSyllabus(id) {
    openSyllabusModal(id);
}

function deleteSyllabus(id) {
    if (confirm('Delete this syllabus item?')) {
        db.deleteRecord('syllabus', id);
        loadSyllabus();
        loadDashboard();
        showNotification('Item deleted!');
    }
}
