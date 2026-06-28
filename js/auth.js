// ════════════════════════════════════════════════════════════════
        // AUTH HANDLERS
        // ════════════════════════════════════════════════════════════════
        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const btn = document.getElementById('btnLogin');
            const errorEl = document.getElementById('loginError');

            setButtonLoading(btn, true, 'Entrar');
            try {
                await auth.signInWithEmailAndPassword(email, password);
                hideLoginModal();
                showToast('Bem-vindo de volta! ✓', 'success');
            } catch (e) {
                errorEl.textContent = translateAuthError(e.code);
                errorEl.classList.remove('hidden');
                setButtonLoading(btn, false, 'Entrar');
            }
        }

        async function handleRegister(event) {
            event.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const btn = document.getElementById('btnRegister');
            const errorEl = document.getElementById('registerError');

            setButtonLoading(btn, true, 'Criar conta');
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                await cred.user.updateProfile({ displayName: name });

                // Salvar perfil inicial no Firestore
                await db.collection('users').doc(cred.user.uid).set({
                    profile: { name, email, hourlyRate: 0 },
                    history: {}
                });

                hideLoginModal();
                showToast('Conta criada! Bem-vindo, ' + name + '! 🎉', 'success');

                // Oferecer importar dados locais
                if (hasSignificantLocalData()) {
                    setTimeout(() => {
                        if (confirm('Você tem dados salvos localmente (histórico de tarefas). Deseja importá-los para sua nova conta na nuvem?')) {
                            importLocalDataToCloud(cred.user.uid);
                        }
                    }, 600);
                }
            } catch (e) {
                errorEl.textContent = translateAuthError(e.code);
                errorEl.classList.remove('hidden');
                setButtonLoading(btn, false, 'Criar conta');
            }
        }

        async function handleGoogleLogin() {
            if (!FIREBASE_READY) { showToast('Configure o Firebase primeiro — veja o guia!', 'error'); return; }
            const btn = document.getElementById('btnGoogle');
            const origHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner" style="border-color:rgba(0,0,0,0.2);border-top-color:#1e293b;"></span>';
            try {
                const provider = new firebase.auth.GoogleAuthProvider();
                const cred = await auth.signInWithPopup(provider);
                const user = cred.user;
                // Criar perfil no Firestore se for a primeira vez
                const docRef = db.collection('users').doc(user.uid);
                const snap = await docRef.get();
                if (!snap.exists) {
                    await docRef.set({
                        profile: { name: user.displayName || '', email: user.email, hourlyRate: 0 },
                        history: {}
                    });
                    // Oferecer importar dados locais
                    if (hasSignificantLocalData()) {
                        setTimeout(() => {
                            if (confirm('Você tem dados salvos localmente. Deseja importá-los para sua conta?')) {
                                importLocalDataToCloud(user.uid);
                            }
                        }, 600);
                    }
                }
                hideLoginModal();
                showToast('Bem-vindo, ' + (user.displayName || user.email) + '! ✓', 'success');
            } catch (e) {
                if (e.code !== 'auth/popup-closed-by-user') {
                    showToast(translateAuthError(e.code), 'error');
                }
                btn.disabled = false;
                btn.innerHTML = origHTML;
            }
        }

        async function handleLogout() {
            if (!FIREBASE_READY || !auth) return;
            try {
                await auth.signOut();
                showToast('Você saiu da sua conta', 'info');
            } catch (e) {
                showToast('Erro ao sair', 'error');
            }
        }

        function translateAuthError(code) {
            const map = {
                'auth/user-not-found': 'Nenhuma conta encontrada com este e-mail.',
                'auth/wrong-password': 'Senha incorreta.',
                'auth/invalid-credential': 'E-mail ou senha incorretos.',
                'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
                'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
                'auth/invalid-email': 'Formato de e-mail inválido.',
                'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.',
                'auth/network-request-failed': 'Sem conexão com a internet.',
            };
            return map[code] || 'Ocorreu um erro. Tente novamente.';
        }

        // ════════════════════════════════════════════════════════════════
        // AUTH STATE CALLBACKS
        // ════════════════════════════════════════════════════════════════
        async function onUserLoggedIn(user) {
            // Show user bar, hide login btn
            document.getElementById('btnOpenLogin').style.display = 'none';
            const bar = document.getElementById('userInfoBar');
            bar.style.display = 'flex';

            const displayName = user.displayName || user.email.split('@')[0];
            document.getElementById('userNameDisplay').textContent = displayName;

            // Avatar: photo (Google) or initial letter
            const avatarEl = document.getElementById('userAvatar');
            if (user.photoURL) {
                avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;"`
                    + ` onerror="this.parentElement.textContent='${displayName.charAt(0).toUpperCase()}'">`;
            } else {
                avatarEl.textContent = displayName.charAt(0).toUpperCase();
            }
            // Dark mode fix for name
            document.getElementById('userNameDisplay').style.color =
                htmlElement.classList.contains('dark') ? '#e2e8f0' : '#334155';

            // Show earnings section
            document.getElementById('earningsSection').classList.add('show');
            document.getElementById('panoramaSection').style.display = 'block';

            // Load cloud data
            await loadCloudData(user.uid);
            await loadAlarms();
            document.getElementById('btnAlarmSettings').style.display = 'block';
        }

        function onUserLoggedOut() {
            document.getElementById('btnOpenLogin').style.display = 'inline-flex';
            const bar = document.getElementById('userInfoBar');
            bar.style.display = 'none';

            document.getElementById('earningsSection').classList.remove('show');
            document.getElementById('panoramaSection').style.display = 'none';
            document.getElementById('btnAlarmSettings').style.display = 'none';
            customAlarms = [];
            selectedAlarmId = 'default';

            // Reload from localStorage
            loadLocalData();
        }

        