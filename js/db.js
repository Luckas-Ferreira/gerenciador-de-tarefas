// ════════════════════════════════════════════════════════════════
        // FIRESTORE
        // ════════════════════════════════════════════════════════════════
        async function loadCloudData(uid) {
            try {
                const snap = await db.collection('users').doc(uid).get();
                if (snap.exists) {
                    const data = snap.data();
                    if (data.history) historyData = data.history;
                    if (data.profile) {
                        hourlyRate = data.profile.hourlyRate || 0;
                        hourlyRateInput.value = hourlyRate;
                        if (data.profile.currency) {
                            selectedCurrency = data.profile.currency;
                            applyCurrencyUI(selectedCurrency);
                        }
                    }
                }
                // Device-specific prefs from localStorage
                const localRaw = localStorage.getItem('rws_tracker_data');
                if (localRaw) {
                    const local = JSON.parse(localRaw);
                    if (local.theme === 'light') htmlElement.classList.remove('dark');
                    else htmlElement.classList.add('dark');
                    if (local.prefMinutes) inputMinutes.value = local.prefMinutes;
                }
                const mins = parseInt(inputMinutes.value) || 10;
                totalDuration = mins * 60;
                updateStats();
                updateEarningsDisplay();
                if (chartInstance) updateChart();
                else initChart();
            } catch (e) {
                console.error('Erro ao carregar nuvem:', e);
                showToast('Erro ao carregar dados da nuvem', 'error');
            }
        }

        async function saveCloudData() {
            if (!currentUser || !FIREBASE_READY || !db) return;
            if (isSaving) return;
            isSaving = true;
            try {
                await db.collection('users').doc(currentUser.uid).set({
                    profile: {
                        name: currentUser.displayName || '',
                        email: currentUser.email,
                        hourlyRate,
                        currency: selectedCurrency
                    },
                    history: historyData
                }, { merge: true });
            } catch (e) {
                console.error('Erro ao salvar nuvem:', e);
            } finally {
                isSaving = false;
            }
        }

        function hasSignificantLocalData() {
            try {
                const raw = localStorage.getItem('rws_tracker_data');
                if (!raw) return false;
                const d = JSON.parse(raw);
                if (!d.history) return false;
                return Object.values(d.history).some(x => x.tasks > 0 || x.totalTime > 0);
            } catch { return false; }
        }

        async function importLocalDataToCloud(uid) {
            try {
                const raw = localStorage.getItem('rws_tracker_data');
                if (!raw) return;
                const local = JSON.parse(raw);
                if (!local.history) return;

                const snap = await db.collection('users').doc(uid).get();
                const cloudHistory = (snap.exists && snap.data().history) ? snap.data().history : {};

                // Merge: cloud data wins on same date, local fills gaps
                const merged = { ...local.history, ...cloudHistory };
                await db.collection('users').doc(uid).set({ history: merged }, { merge: true });

                historyData = merged;
                updateStats();
                updateChart();
                showToast('Dados locais importados com sucesso! ✓', 'success');
            } catch (e) {
                console.error('Erro ao importar:', e);
                showToast('Erro ao importar dados locais', 'error');
            }
        }

        