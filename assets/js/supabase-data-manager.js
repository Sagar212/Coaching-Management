class SupabaseDataManager {
    constructor() {
        this.client = null;
        this.PROJECT_ID = 'coaching_management_pro';
        this.isInitialized = false;
        this.localCache = null; // For offline support
        this.syncInProgress = {}; // Track ongoing syncs to prevent duplicates
        this.lastSyncTime = {}; // Track last sync time for debouncing
        this.SYNC_DEBOUNCE_MS = 30000; // Only sync once per 30 seconds per type
        this.initializeSupabase();
    }

    initializeSupabase() {
        try {
            // Get Supabase client from backup service if available
            if (window.SupabaseBackup && window.SupabaseBackup.client) {
                this.client = window.SupabaseBackup.client;
                console.log('✅ SupabaseDataManager using existing client');
                this.isInitialized = true;
            } else {
                // Create our own client
                const SUPABASE_URL = 'https://dujxruuoebpmextqtnpw.supabase.co';
                const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1anhydXVvZWJwbWV4dHF0bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NzgyMjksImV4cCI6MjA4NjQ1NDIyOX0.bt6fbwZtutTvrnOQH9RgpVHqvT4ddpn4eL-EvfbL7zI';

                let createClient = null;
                if (typeof supabase !== 'undefined' && supabase.createClient) {
                    createClient = supabase.createClient;
                } else if (window.supabase && window.supabase.createClient) {
                    createClient = window.supabase.createClient;
                }

                if (createClient) {
                    this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
                    console.log('✅ SupabaseDataManager created new client');
                    this.isInitialized = true;
                } else {
                    console.error('❌ Supabase library not available');
                }
            }
        } catch (err) {
            console.error('❌ SupabaseDataManager init error:', err);
        }

        // Initialize local cache from localStorage for offline support
        this.initializeLocalCache();
    }

    initializeLocalCache() {
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
            localStorage.setItem('tutionData', JSON.stringify(initialData));
        }
        this.localCache = JSON.parse(localStorage.getItem('tutionData'));
    }

    // Map localStorage types to Supabase table names
    getTableName(type) {
        const mapping = {
            'students': 'students',
            'batches': 'batches',
            'tutors': 'teachers', // Note: schema uses 'teachers' not 'tutors'
            'homework': 'homework',
            'expenses': 'expenses',
            'events': 'calendar_events',
            'attendance': 'attendance_records',
            'payments': 'fee_payments',
            'payroll': 'teacher_payroll',
            'syllabus': 'syllabus_topics'
        };
        return mapping[type] || type;
    }

    // Get all data (for compatibility with old code)
    async getData() {
        if (!this.isInitialized) {
            console.warn('⚠️ Supabase not initialized, using local cache');
            return this.localCache;
        }

        try {
            // Fetch all data from Supabase
            const data = { settings: this.localCache.settings }; // Settings stay local

            // Fetch each table
            const tables = ['students', 'batches', 'tutors', 'homework', 'expenses', 'events', 'attendance', 'payments', 'payroll'];

            for (const type of tables) {
                const tableName = this.getTableName(type);
                const { data: records, error } = await this.client
                    .from(tableName)
                    .select('*')
                    .eq('project_id', this.PROJECT_ID);

                if (error) {
                    console.error(`❌ Error fetching ${tableName}:`, error);
                    data[type] = this.localCache[type] || [];
                } else {
                    data[type] = records || [];
                }
            }

            // Update local cache
            this.localCache = data;
            localStorage.setItem('tutionData', JSON.stringify(data));

            return data;
        } catch (err) {
            console.error('❌ getData error:', err);
            return this.localCache;
        }
    }

    // Save all data (for compatibility)
    async saveData(data) {
        this.localCache = data;
        localStorage.setItem('tutionData', JSON.stringify(data));
        // Note: Full sync to Supabase would be complex, so we just cache locally
        // Individual operations (add/update/delete) handle Supabase sync
    }

    // Add a new record
    async addRecord(type, record) {
        if (!this.isInitialized) {
            console.warn('⚠️ Supabase not initialized, saving to local cache only');
            return this.addRecordLocal(type, record);
        }

        try {
            const tableName = this.getTableName(type);

            // Generate ID if not present
            if (!record.id) {
                record.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            }

            // Add metadata
            record.project_id = this.PROJECT_ID;
            record.created_at = new Date().toISOString();

            // Insert into Supabase
            const { data, error } = await this.client
                .from(tableName)
                .insert([record])
                .select()
                .single();

            if (error) {
                console.error(`❌ Error adding to ${tableName}:`, error);
                // Fallback to local
                return this.addRecordLocal(type, record);
            }

            // Update local cache
            if (!this.localCache[type]) this.localCache[type] = [];
            this.localCache[type].push(data);
            localStorage.setItem('tutionData', JSON.stringify(this.localCache));

            console.log(`✅ Added to ${tableName}:`, data);
            return data;
        } catch (err) {
            console.error('❌ addRecord error:', err);
            return this.addRecordLocal(type, record);
        }
    }

    // Local fallback for add
    addRecordLocal(type, record) {
        if (!record.id) {
            record.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        }
        record.createdAt = new Date().toISOString();
        if (!this.localCache[type]) this.localCache[type] = [];
        this.localCache[type].push(record);
        localStorage.setItem('tutionData', JSON.stringify(this.localCache));
        return record;
    }

    // Update a record
    async updateRecord(type, id, updatedRecord) {
        if (!this.isInitialized) {
            return this.updateRecordLocal(type, id, updatedRecord);
        }

        try {
            const tableName = this.getTableName(type);

            // Add metadata
            updatedRecord.updated_at = new Date().toISOString();

            // Update in Supabase
            const { data, error } = await this.client
                .from(tableName)
                .update(updatedRecord)
                .eq('id', id)
                .eq('project_id', this.PROJECT_ID)
                .select()
                .single();

            if (error) {
                console.error(`❌ Error updating ${tableName}:`, error);
                return this.updateRecordLocal(type, id, updatedRecord);
            }

            // Update local cache
            if (this.localCache[type]) {
                const index = this.localCache[type].findIndex(item => item.id === id);
                if (index !== -1) {
                    this.localCache[type][index] = data;
                    localStorage.setItem('tutionData', JSON.stringify(this.localCache));
                }
            }

            console.log(`✅ Updated in ${tableName}:`, data);
            return data;
        } catch (err) {
            console.error('❌ updateRecord error:', err);
            return this.updateRecordLocal(type, id, updatedRecord);
        }
    }

    // Local fallback for update
    updateRecordLocal(type, id, updatedRecord) {
        if (!this.localCache[type]) return null;
        const index = this.localCache[type].findIndex(item => item.id === id);
        if (index !== -1) {
            this.localCache[type][index] = { ...this.localCache[type][index], ...updatedRecord };
            localStorage.setItem('tutionData', JSON.stringify(this.localCache));
            return this.localCache[type][index];
        }
        return null;
    }

    // Delete a record
    async deleteRecord(type, id) {
        if (!this.isInitialized) {
            return this.deleteRecordLocal(type, id);
        }

        try {
            const tableName = this.getTableName(type);

            // Delete from Supabase
            const { error } = await this.client
                .from(tableName)
                .delete()
                .eq('id', id)
                .eq('project_id', this.PROJECT_ID);

            if (error) {
                console.error(`❌ Error deleting from ${tableName}:`, error);
                this.deleteRecordLocal(type, id);
                return;
            }

            // Update local cache
            if (this.localCache[type]) {
                this.localCache[type] = this.localCache[type].filter(item => item.id !== id);
                localStorage.setItem('tutionData', JSON.stringify(this.localCache));
            }

            console.log(`✅ Deleted from ${tableName}:`, id);
        } catch (err) {
            console.error('❌ deleteRecord error:', err);
            this.deleteRecordLocal(type, id);
        }
    }

    // Local fallback for delete
    deleteRecordLocal(type, id) {
        if (!this.localCache[type]) return;
        this.localCache[type] = this.localCache[type].filter(item => item.id !== id);
        localStorage.setItem('tutionData', JSON.stringify(this.localCache));
    }

    // Get records of a specific type (SYNCHRONOUS - returns cache immediately)
    getRecords(type) {
        // Return cached data immediately for backward compatibility
        const cachedData = this.localCache[type] || [];

        // Only trigger background sync if:
        // 1. Supabase is initialized
        // 2. Not already syncing this type
        // 3. Haven't synced recently (debounce)
        // DISABLED: Causing reload loops - only sync on write operations
        /*
        if (this.isInitialized && !this.syncInProgress[type]) {
            const now = Date.now();
            const lastSync = this.lastSyncTime[type] || 0;

            if (now - lastSync > this.SYNC_DEBOUNCE_MS) {
                this.syncRecordsInBackground(type);
            }
        }
        */

        return cachedData;
    }

    // Background sync (non-blocking)
    async syncRecordsInBackground(type) {
        // Prevent duplicate syncs
        if (this.syncInProgress[type]) {
            return;
        }

        this.syncInProgress[type] = true;
        this.lastSyncTime[type] = Date.now();

        try {
            const tableName = this.getTableName(type);

            const { data, error } = await this.client
                .from(tableName)
                .select('*')
                .eq('project_id', this.PROJECT_ID)
                .order('created_at', { ascending: false });

            if (error) {
                console.error(`❌ Background sync failed for ${tableName}:`, error);
                return;
            }

            // Update local cache silently
            if (!this.localCache[type]) this.localCache[type] = [];
            this.localCache[type] = data || [];
            localStorage.setItem('tutionData', JSON.stringify(this.localCache));

            console.log(`🔄 Synced ${data?.length || 0} records from ${tableName}`);
        } catch (err) {
            console.error(`❌ Background sync error for ${type}:`, err);
        } finally {
            this.syncInProgress[type] = false;
        }
    }

    // Sync method - pull all data from Supabase to local cache
    async syncFromCloud() {
        console.log('🔄 Syncing from cloud...');
        await this.getData();
        console.log('✅ Sync complete');
    }
}
