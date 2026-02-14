
// Analytics Logic
function loadAnalytics() {
    const students = db.getRecords('students');
    const batches = db.getRecords('batches');

    // Batch Distribution
    const batchCounts = {};
    students.forEach(s => {
        if (s.batches) {
            s.batches.forEach(b => {
                batchCounts[b] = (batchCounts[b] || 0) + 1;
            });
        } else if (s.batch) {
            batchCounts[s.batch] = (batchCounts[s.batch] || 0) + 1;
        }
    });

    if (studentChart) studentChart.destroy();
    const ctx1 = document.getElementById('studentChart');
    if (ctx1) {
        studentChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Object.keys(batchCounts),
                datasets: [{
                    label: 'Students per Batch',
                    data: Object.values(batchCounts),
                    backgroundColor: 'rgba(99, 102, 241, 0.5)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Fee Status
    const totalFees = students.reduce((sum, s) => sum + (parseFloat(s.totalFee) || 0), 0);
    const collected = students.reduce((sum, s) => sum + (parseFloat(s.paidAmount) || 0), 0);
    const pending = totalFees - collected;

    if (feeChart) feeChart.destroy();
    const ctx2 = document.getElementById('feeChart');
    if (ctx2) {
        feeChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Collected', 'Pending'],
                datasets: [{
                    data: [collected, pending],
                    backgroundColor: ['rgba(16, 185, 129, 0.5)', 'rgba(239, 68, 68, 0.5)'],
                    borderColor: ['rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}
