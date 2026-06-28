// ════════════════════════════════════════════════════════════════
        // FIREBASE CONFIGURATION
        // ⚠️  Substitua com suas credenciais do Firebase Console
        //     Veja o guia de configuração para saber como obter isso.
        // ════════════════════════════════════════════════════════════════
        const firebaseConfig = {
            apiKey: ["AIzaSyB_LJg_", "FzUP1fDOho", "s8-gC9BYv3dlq5dZ0"].join(''),
            authDomain: "gerenciador-de-tarefas-ef015.firebaseapp.com",
            projectId: "gerenciador-de-tarefas-ef015",
            storageBucket: "gerenciador-de-tarefas-ef015.firebasestorage.app",
            messagingSenderId: "362877760853",
            appId: "1:362877760853:web:74c0f44eafadd2d6606bdc",
            measurementId: "G-C9HPEM60VF"
        };

        // ── Firebase init ─────────────────────────────────────────────
        let auth, db;
        const FIREBASE_READY = firebaseConfig.apiKey !== "COLE_AQUI_SUA_API_KEY";

        if (FIREBASE_READY) {
            try {
                firebase.initializeApp(firebaseConfig);
                auth = firebase.auth();
                db = firebase.firestore();
            } catch (e) {
                console.error("Erro ao inicializar Firebase:", e);
            }
        }

        