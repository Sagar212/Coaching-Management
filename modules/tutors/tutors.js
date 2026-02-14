
// Tutor Management Logic
function loadTutors() {
    const tutors = db.getRecords('tutors');
    renderTutorTable(tutors);
}

function renderTutorTable(tutors) {
    const tableContainer = document.getElementById('tutorsTable');
    if (!tableContainer) return;

    if (!tutors.length) {
        tableContainer.innerHTML = '<p style="color: var(--text-secondary);">No tutors added</p>';
        return;
    }
    tableContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th onclick="if(typeof sortTable === 'function') sortTable('tutors', 'name')">Name</th>
                    <th>Subjects</th>
                    <th>Phone</th>
                    <th>Qualification</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${tutors.map(t => `
                    <tr>
                        <td><strong>${t.name}</strong></td>
                        <td>${t.subjects}</td>
                        <td>${t.phone}</td>
                        <td>${t.qualification || 'N/A'}</td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="editTutor('${t.id}')">Edit</button>
                            <button class="btn btn-danger btn-small" onclick="deleteTutor('${t.id}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function filterTutors() {
    const query = document.getElementById('tutorSearch').value.toLowerCase();
    const tutors = db.getRecords('tutors');
    const filtered = tutors.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.subjects.toLowerCase().includes(query)
    );
    renderTutorTable(filtered);
}

function openTutorModal(id = null) {
    if (id) {
        const tutor = db.getRecords('tutors').find(t => t.id === id);
        if (tutor) {
            document.getElementById('tutorId').value = tutor.id;
            document.getElementById('tutorName').value = tutor.name;
            document.getElementById('tutorSubjects').value = tutor.subjects;
            document.getElementById('tutorPhone').value = tutor.phone;
            document.getElementById('tutorEmail').value = tutor.email || '';
            document.getElementById('tutorQualification').value = tutor.qualification || '';
        }
    } else {
        // Reset form
        const form = document.querySelector('#tutorModal form');
        if (form) form.reset();
        document.getElementById('tutorId').value = '';
    }
    openModal('tutorModal');
}

function saveTutor(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('tutorId').value;
    const tutor = {
        name: document.getElementById('tutorName').value,
        subjects: document.getElementById('tutorSubjects').value,
        phone: document.getElementById('tutorPhone').value,
        email: document.getElementById('tutorEmail').value,
        qualification: document.getElementById('tutorQualification').value,
        status: 'active' // Ensure status is set
    };

    if (id) {
        db.updateRecord('tutors', id, tutor);
        showNotification('Tutor updated!');
    } else {
        db.addRecord('tutors', tutor);
        showNotification('Tutor added!');
    }
    closeModal('tutorModal');
    loadTutors();
}

function editTutor(id) {
    openTutorModal(id);
}

function deleteTutor(id) {
    confirmAction({
        title: 'Delete Tutor?',
        message: 'This will remove the tutor record from the system. Associated batch assignments may need to be updated.',
        onConfirm: () => {
            db.deleteRecord('tutors', id);
            showNotification('Tutor deleted successfully!');
            loadTutors();
        }
    });
}
