
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
                                <button class="btn btn-danger btn-small" onclick="deleteExpense('${e.id}')">Delete</button>
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

function openExpenseModal() {
    document.getElementById('expenseDate').valueAsDate = new Date();
    openModal('expenseModal');
}

function saveExpense(e) {
    if (e) e.preventDefault();
    const expense = {
        category: document.getElementById('expenseCategory').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        mode: document.getElementById('expenseMode').value,
        description: document.getElementById('expenseDescription').value
    };
    db.addRecord('expenses', expense);
    showNotification('Expense recorded!');
    closeModal('expenseModal');
    loadExpenses();
    if (typeof loadDashboard === 'function') loadDashboard();
}

function deleteExpense(id) {
    if (confirm('Delete this expense?')) {
        db.deleteRecord('expenses', id);
        showNotification('Expense deleted!');
        loadExpenses();
        if (typeof loadDashboard === 'function') loadDashboard();
    }
}
