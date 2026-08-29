    login() {
        // Tambahkan .trim().toLowerCase() agar "Manager" tetap terbaca sebagai "manager"
        const user = document.getElementById('login-username').value.trim().toLowerCase();
        const pass = document.getElementById('login-password').value.trim();
        
        if (user === 'manager' && pass === '1234') {
            this.currentUser = { username: 'Manager', role: 'MANAGER' };
            localStorage.setItem('kk_user', JSON.stringify(this.currentUser));
            document.getElementById('login-page').style.display = 'none';
            document.getElementById('main-app').style.display = 'block';
            this.switchView('dashboard');
        } else {
            alert('Login gagal. Cek username dan password.');
        }
    },
