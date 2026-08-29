    init() {
        this.loadData();
        if (!this.data.items.length) this.loadDemoData();
        
        // Auto set user sebagai Manager
        this.currentUser = { username: 'Manager', role: 'MANAGER' };    closeAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        document.getElementById('modal-overlay').style.display = 'none';
    },

        localStorage.setItem('kk_user', JSON.stringify(this.currentUser));
        this.switchView('dashboard');
    },
