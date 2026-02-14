
// Expense Management Logic
function loadExpenses() {
    const expenses = db.getRecords('expenses');
    const table = document.getElementById('expensesTable');
    if (!table) return;

    if (expenses.length) {
        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${expenses.map(e => `
                        <tr>
                            <td>${new Date(e.date).toLocaleDateString()}</td>
                            <td>${e.category}</td>
                            <td style="color: var(--danger); font-weight: 600;">₹${e.amount}</td>
                            <td>${e.mode}</td>
                            <td>
                                <div class="row-actions">
                                    <button class="btn btn-secondary btn-small" onclick="editExpense('${e.id}')" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-danger btn-small" onclick="deleteExpense('${e.id}')" title="Delete"><i class="fas fa-trash"></i></button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        table.innerHTML = '<p style="color: var(--text-secondary);">No expenses recorded</p>';
    }
}

function openExpenseModal(id = null) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');

    if (id) {
        const expense = db.getRecords('expenses').find(e => e.id === id);
        if (expense) {
            document.getElementById('expenseCategory').value = expense.category;
            document.getElementById('expenseAmount').value = expense.amount;
            document.getElementById('expenseDate').value = expense.date;
            document.getElementById('expenseMode').value = expense.mode;
            document.getElementById('expenseDescription').value = expense.description || '';
            modal.dataset.editId = id;
            modal.querySelector('.modal-title').textContent = 'Edit Expense';
        }
    } else {
        if (form) form.reset();
        document.getElementById('expenseDate').valueAsDate = new Date();
        delete modal.dataset.editId;
        modal.querySelector('.modal-title').textContent = 'Add Expense';
    }
    openModal('expenseModal');
}

function editExpense(id) {
    openExpenseModal(id);
}

function saveExpense(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('expenseModal');
    const editId = modal?.dataset.editId;

    const expense = {
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        mode: document.getElementById('expenseMode').value,
        description: document.getElementById('expenseDescription').value
    };

    if (editId) {
        db.updateRecord('expenses', editId, expense);
        showNotification('Expense updated successfully!');
    } else {
        db.addRecord('expenses', expense);
        showNotification('Expense recorded!');
    }

    closeModal('expenseModal');
    loadExpenses();
    if (typeof loadDashboard === 'function') loadDashboard();
}

function deleteExpense(id) {
    confirmAction({
        title: 'Delete Expense?',
        message: 'This will remove the expense record from history.',
        onConfirm: () => {
            db.deleteRecord('expenses', id);
            showNotification('Expense deleted!');
            loadExpenses();
            if (typeof loadDashboard === 'function') loadDashboard();
        }
    });
}
