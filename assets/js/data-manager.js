class DataManager {
    constructor() {
        this.initializeData();
    }

    initializeData() {
        if (!localStorage.getItem('tutionData')) {
            const initialData = {
                students: [],
                batches: [],
                tutors: [],
                homework: [],
                expenses: [],
                events: [],
                syllabus: [],
                attendance: [],
                dayNotes: [],
                payments: [],
                payroll: [],
                homework_submissions: [],
                settings: {
                    appName: 'TutionPro',
                    name: 'TutionPro Academy',
                    email: 'admin@tutionpro.com',
                    phone: '+91 98765-43210',
                    address: 'Mumbai, Maharashtra, India',
                    theme: 'light',
                    adminName: 'Admin',
                    adminPic: ''
                }
            };
            this.saveData(initialData);
        }
    }

    getData() {
        return JSON.parse(localStorage.getItem('tutionData'));
    }

    saveData(data) {
        localStorage.setItem('tutionData', JSON.stringify(data));
    }

    addRecord(type, record) {
        const data = this.getData();
        if (!record.id) {
            record.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
        record.createdAt = new Date().toISOString();
        if (!data[type]) data[type] = []; // Safety check
        data[type].push(record);
        this.saveData(data);
        return record;
    }

    updateRecord(type, id, updatedRecord) {
        const data = this.getData();
        if (!data[type]) return null;
        const index = data[type].findIndex(item => item.id === id);
        if (index !== -1) {
            data[type][index] = { ...data[type][index], ...updatedRecord };
            this.saveData(data);
            return data[type][index];
        }
        return null;
    }

    deleteRecord(type, id) {
        const data = this.getData();
        if (!data[type]) return;
        data[type] = data[type].filter(item => item.id !== id);
        this.saveData(data);
    }

    getRecords(type) {
        const data = this.getData();
        return (data && data[type]) ? data[type] : [];
    }
}
