const SupabaseBackup = {
    SUPABASE_URL: 'https://dujxruuoebpmextqtnpw.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1anhydXVvZWJwbWV4dHF0bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzgyMjksImV4cCI6MjA4NjQ1NDIyOX0.bt6fbwZtutTvrnOQH9RgpVHqvT4ddpn4eL-EvfbL7zI',
    TABLE_NAME: 'backups',
    PROJECT_ID: 'coaching_management_pro', // Unique ID for this project
    client: null,
    isConnected: false,

    init() {
        try {
            if (typeof supabase !== 'undefined' && supabase.createClient) {
                this.client = supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
                console.log('☁️ Supabase client initialized');
                this.testConnection(true);
            } else {
                console.warn('☁️ Supabase library not loaded');
                this.updateStatus(false, 'Library Missing');
            }
        } catch (err) {
            console.error('☁️ Supabase init error:', err);
            this.updateStatus(false, 'Init Error');
        }
    },

    async testConnection(silent = false) {
        if (!this.client) {
            if (!silent) showNotification('Cloud not configured.', 'error');
            return false;
        }

        try {
            const { data, error } = await this.client.from(this.TABLE_NAME).select('id').limit(1);
            if (error) throw error;

            this.isConnected = true;
            this.updateStatus(true, 'Connected');
            if (!silent) showNotification('Cloud connection successful!');
            return true;
        } catch (err) {
            console.error('☁️ Connection test failed:', err);
            this.isConnected = false;
            this.updateStatus(false, 'Disconnected');
            if (!silent) showNotification('Cloud connection failed. Check console.', 'error');
            return false;
        }
    },

    updateStatus(connected, text) {
        const dot = document.getElementById('cloudStatusDot');
        const label = document.getElementById('cloudStatusText');
        if (dot) dot.className = `cloud-status-dot ${connected ? 'connected' : ''}`;
        if (label) label.textContent = text;
    },

    async saveToCloud() {
        if (!await this.testConnection()) return;

        const btn = document.getElementById('btnSaveCloud');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }

        try {
            const data = db.getData();
            data.cm_lastSaved = Date.now(); // Add sync timestamp
            db.saveData(data);

            const jsonString = JSON.stringify(data);
            const payload = {
                project_name: this.PROJECT_ID,
                backup_data: data,
                backup_size: jsonString.length,
                version: '2.0',
                compression_type: 'none',
                checksum: btoa(jsonString.substring(0, 100)), // Simple checksum for DDL compliance
                audit_trail: {
                    user: db.getData().settings?.adminName || 'Admin',
                    action: 'manual_backup',
                    timestamp: new Date().toISOString()
                }
            };

            const { error } = await this.client.from(this.TABLE_NAME).insert(payload);
            if (error) throw error;

            showNotification('Backup saved to cloud successfully!');
        } catch (err) {
            console.error('☁️ Save failed:', err);
            showNotification('Cloud save failed: ' + err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    },

    async restoreLatest() {
        if (!await this.testConnection()) return;

        if (!confirm('This will replace ALL local data with the latest cloud backup. Continue?')) return;

        try {
            const { data, error } = await this.client
                .from(this.TABLE_NAME)
                .select('backup_data')
                .eq('project_name', this.PROJECT_ID)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;
            if (!data || data.length === 0) {
                showNotification('No backups found in cloud.', 'warning');
                return;
            }

            db.saveData(data[0].backup_data);
            showNotification('System restored from cloud! Reloading...');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            console.error('☁️ Restore failed:', err);
            showNotification('Cloud restore failed.', 'error');
        }
    },

    async openManager() {
        if (!await this.testConnection()) return;

        openModal('backupManagerModal');
        const body = document.getElementById('backupListBody');
        if (!body) return;

        body.innerHTML = '<tr><td colspan="3" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading backups...</td></tr>';

        try {
            const { data, error } = await this.client
                .from(this.TABLE_NAME)
                .select('id, created_at, backup_size')
                .eq('project_name', this.PROJECT_ID)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                body.innerHTML = '<tr><td colspan="3" style="text-align:center;">No backups found.</td></tr>';
                return;
            }

            body.innerHTML = data.map(b => `
                <tr>
                    <td>${new Date(b.created_at).toLocaleString()}</td>
                    <td>${(b.backup_size / 1024).toFixed(1)} KB</td>
                    <td>
                        <button class="btn btn-restore btn-small" onclick="SupabaseBackup.restoreBackup('${b.id}')">Restore</button>
                        <button class="btn btn-danger btn-small" onclick="SupabaseBackup.deleteBackup('${b.id}')">Delete</button>
                    </td>
                </tr>
            `).join('');
        } catch (err) {
            body.innerHTML = '<tr><td colspan="3" style="color:var(--danger); text-align:center;">Error loading backups.</td></tr>';
        }
    },

    async restoreBackup(id) {
        if (!confirm('Restore this specific backup? Current data will be lost.')) return;

        try {
            const { data, error } = await this.client
                .from(this.TABLE_NAME)
                .select('backup_data')
                .eq('id', id)
                .single();

            if (error) throw error;

            db.saveData(data.backup_data);
            showNotification('Backup restored! Reloading...');
            setTimeout(() => location.reload(), 1500);
        } catch (err) {
            showNotification('Restore failed: ' + err.message, 'error');
        }
    },

    async deleteBackup(id) {
        if (!confirm('Permanently delete this cloud backup?')) return;

        try {
            const { error } = await this.client
                .from(this.TABLE_NAME)
                .delete()
                .eq('id', id);

            if (error) throw error;
            showNotification('Backup deleted.');
            this.openManager(); // Refresh list
        } catch (err) {
            showNotification('Delete failed.', 'error');
        }
    },

    async autoLoadFromCloud() {
        try {
            const localData = db.getData();
            const { data, error } = await this.client
                .from(this.TABLE_NAME)
                .select('backup_data')
                .eq('project_name', this.PROJECT_ID)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error || !data || data.length === 0) return;

            const cloudData = data[0].backup_data;
            if (cloudData.cm_lastSaved > (localData.cm_lastSaved || 0)) {
                console.log('☁️ Newer cloud data found. Auto-syncing...');
                db.saveData(cloudData);
                // Only reload if we are on dashboard or just started
                if (location.hash === '' || location.hash === '#dashboard') {
                    location.reload();
                }
            }
        } catch (err) {
            console.log('☁️ Auto-load skipped:', err);
        }
    }
};

// Auto-init embedded in global listener (in app.js calling SupabaseBackup.init())
// Or we can auto-init here if DOM is ready?
// Better to let app.js call it, or export it globally.
window.SupabaseBackup = SupabaseBackup;
