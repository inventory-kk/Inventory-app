    init() {
        this.loadData();
        if (!this.data.items.length) this.loadDemoData();
        
        // Auto set user sebagai Manager
        this.currentUser = { username: 'Manager', role: 'MANAGER' };
        localStorage.setItem('kk_user', JSON.stringify(this.currentUser));
        this.switchView('dashboard');
    },
