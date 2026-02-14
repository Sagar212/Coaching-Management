
// Admin Profile & Settings
function loadSettings() {
    const data = db.getData();
    const settings = data.settings;
    if (document.getElementById('appNameInput')) document.getElementById('appNameInput').value = settings.appName || 'TutionPro';
    if (document.getElementById('instituteName')) document.getElementById('instituteName').value = settings.name;
    if (document.getElementById('instituteEmail')) document.getElementById('instituteEmail').value = settings.email;
    if (document.getElementById('institutePhone')) document.getElementById('institutePhone').value = settings.phone;
    if (document.getElementById('instituteAddress')) document.getElementById('instituteAddress').value = settings.address;
}

function saveSettings(e) {
    if (e) e.preventDefault();
    const data = db.getData();
    const newAppName = document.getElementById('appNameInput').value;
    data.settings.appName = newAppName;
    data.settings.name = document.getElementById('instituteName').value;
    data.settings.email = document.getElementById('instituteEmail').value;
    data.settings.phone = document.getElementById('institutePhone').value;
    data.settings.address = document.getElementById('instituteAddress').value;
    db.saveData(data);

    // UI Update
    if (document.getElementById('appName')) document.getElementById('appName').textContent = newAppName;
    if (document.getElementById('appTitle')) document.getElementById('appTitle').textContent = `${newAppName} - Management System`;

    showNotification('Settings saved!');
}

function createBackup() {
    const data = db.getData();
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${data.settings.appName}_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showNotification('Backup created!');
}

function restoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            confirmAction({
                title: 'Restore Backup?',
                message: 'This will replace all current data with the backup. This action cannot be undone and the page will reload.',
                confirmText: 'Yes, Restore',
                onConfirm: () => {
                    db.saveData(data);
                    showNotification('Data restored!');
                    setTimeout(() => window.location.reload(), 1000);
                }
            });
        } catch (error) {
            showNotification('Invalid backup file!', 'error');
        }
    };
    reader.readAsText(file);
}

// Profile Logic
function openProfileModal() {
    const settings = db.getData().settings;
    if (document.getElementById('adminFullName')) document.getElementById('adminFullName').value = settings.adminName || 'Admin';
    if (settings.adminPic && document.getElementById('adminPicPreview')) {
        document.getElementById('adminPicPreview').innerHTML = `<img src="${settings.adminPic}">`;
    }
    openModal('profileModal');
}

function previewAdminPic(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (document.getElementById('adminPicPreview')) {
                document.getElementById('adminPicPreview').innerHTML = `<img src="${e.target.result}">`;
            }
        }
        reader.readAsDataURL(file);
    }
}

function saveAdminProfile(e) {
    if (e) e.preventDefault();
    const data = db.getData();
    const picPreview = document.getElementById('adminPicPreview');
    const adminPic = picPreview && picPreview.querySelector('img') ? picPreview.querySelector('img').src : '';

    data.settings.adminName = document.getElementById('adminFullName').value;
    data.settings.adminPic = adminPic;
    db.saveData(data);

    // UI Update
    if (document.getElementById('adminName')) document.getElementById('adminName').textContent = data.settings.adminName;
    if (adminPic) {
        if (document.getElementById('adminAvatar')) document.getElementById('adminAvatar').innerHTML = `<img src="${adminPic}">`;
    } else {
        if (document.getElementById('adminAvatar')) document.getElementById('adminAvatar').textContent = data.settings.adminName.substring(0, 2).toUpperCase();
    }

    closeModal('profileModal');
    showNotification('Profile updated!');
}
