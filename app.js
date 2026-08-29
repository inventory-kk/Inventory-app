    login() {
        // Bypass langsung login tanpa syarat agar langsung masuk
        this.currentUser = { username: 'Manager', role: 'MANAGER' };
        localStorage.setItem('kk_user', JSON.stringify(this.currentUser));
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        this.switchView('dashboard');
    },
