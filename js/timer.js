// ════════════════════════════════════════════════════════════════
        // STATE
        // ════════════════════════════════════════════════════════════════
        let intervalId = null;
        let isRunning = false;
        let timeElapsed = 0;
        let startTime = null;
        let totalDuration = 600;
        let historyData = {};
        let chartInstance = null;
        let monthlyChartInstance = null;
        let panoramaMonthOffset = 0;  // 0 = current, -1 = last month, etc.
        let currentUser = null;
        let hourlyRate = 0;
        let selectedCurrency = 'BRL'; // 'BRL' | 'USD' | 'EUR'
        let isSaving = false; // debounce cloud saves

        // DOM refs
        const timerDisplay = document.getElementById('timerDisplay');
        const progressBar = document.getElementById('progressBar');
        const progressContainer = document.getElementById('progressContainer');
        const btnStart = document.getElementById('btnStart');
        const iconContainer = document.getElementById('iconContainer');
        const btnStartText = document.getElementById('btnStartText');
        const statusText = document.getElementById('statusText');
        const targetDisplay = document.getElementById('targetDisplay');
        const taskCountDisplay = document.getElementById('taskCount');
        const totalTimeDisplay = document.getElementById('totalTimeDisplay');
        const inputMinutes = document.getElementById('targetMinutes');
        const htmlElement = document.documentElement;
        const hourlyRateInput = document.getElementById('hourlyRateInput');
        const defaultTitle = "Gerenciador de Tarefas";

        
// ════════════════════════════════════════════════════════════════
        // TIMER
        // ════════════════════════════════════════════════════════════════
        function getDateString(d) {
            const y = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const da = String(d.getDate()).padStart(2, '0');
            return `${y}-${mo}-${da}`;
        }

        function getTodayString() { return getDateString(new Date()); }

        function getTodayData() {
            const today = getTodayString();
            if (!historyData[today]) historyData[today] = { tasks: 0, totalTime: 0 };
            return historyData[today];
        }

        function startTimer() {
            const mins = parseInt(inputMinutes.value) || 10;
            totalDuration = mins * 60;
            isRunning = true;
            startTime = Date.now() - (timeElapsed * 1000);

            btnStart.classList.remove('bg-green-700', 'hover:bg-green-600');
            btnStart.classList.add('bg-yellow-600', 'hover:bg-yellow-500');
            iconContainer.innerHTML = ICON_PAUSE;
            btnStartText.textContent = "Pausar";
            statusText.innerHTML = `Meta: <span class="font-bold">${formatTime(totalDuration)}</span>`;
            statusText.className = "text-blue-700 dark:text-blue-400 text-sm font-medium mb-6";

            intervalId = setInterval(updateTimerFromTimestamp, 100);
        }

        function updateTimerFromTimestamp() {
            if (!isRunning) return;
            timeElapsed = Math.floor((Date.now() - startTime) / 1000);
            updateTimerDisplay();
            if (timeElapsed >= totalDuration) finishTask();
        }

        function pauseTimer() {
            isRunning = false;
            clearInterval(intervalId);
            updateTimerDisplay();
            btnStart.classList.remove('bg-yellow-600', 'hover:bg-yellow-500');
            btnStart.classList.add('bg-green-700', 'hover:bg-green-600');
            iconContainer.innerHTML = ICON_PLAY;
            btnStartText.textContent = "Continuar";
        }

        function resetTimer() {
            pauseTimer();
            timeElapsed = 0;
            startTime = null;
            const mins = parseInt(inputMinutes.value) || 10;
            totalDuration = mins * 60;
            updateTimerDisplay();
            updateTargetDisplay();
            iconContainer.innerHTML = ICON_PLAY;
            btnStartText.textContent = "Iniciar";
            statusText.innerHTML = `Meta: <span>${formatTime(totalDuration)}</span>`;
            statusText.className = "text-slate-600 dark:text-slate-400 text-sm font-medium mb-6";
            progressBar.style.width = '0%';
            progressContainer.setAttribute('aria-valuenow', '0');
            document.title = defaultTitle;
        }

        function saveData() {
            // Always save device prefs + local history backup
            const data = {
                history: historyData,
                prefMinutes: inputMinutes.value,
                theme: htmlElement.classList.contains('dark') ? 'dark' : 'light'
            };
            localStorage.setItem('rws_tracker_data', JSON.stringify(data));

            // Cloud save if logged in
            if (currentUser && FIREBASE_READY) saveCloudData();

            updateChart();
            if (currentUser) updateEarningsDisplay();
        }

        function loadLocalData() {
            const raw = localStorage.getItem('rws_tracker_data');
            if (raw) {
                const data = JSON.parse(raw);
                // Migrate old format
                if (data.tasks !== undefined || data.totalTime !== undefined) {
                    const today = getTodayString();
                    historyData[today] = { tasks: data.tasks || 0, totalTime: data.totalTime || 0 };
                }
                if (data.history) historyData = data.history;
                if (data.prefMinutes) inputMinutes.value = data.prefMinutes;
                if (data.theme === 'light') htmlElement.classList.remove('dark');
                else htmlElement.classList.add('dark');
            }
            const mins = parseInt(inputMinutes.value) || 10;
            totalDuration = mins * 60;
            updateStats();
            initChart();
        }

        function clearAllData() {
            if (!confirm("Tem certeza? Isso vai zerar TODO o seu histórico de tarefas e tempo acumulado.")) return;
            historyData = {};
            saveData();
            updateStats();
            if (currentUser) updateEarningsDisplay();
            resetTimer();
            showToast('Histórico apagado', 'info');
        }

        function toggleTheme() {
            htmlElement.classList.toggle('dark');
            // Fix user name color on theme toggle
            if (currentUser) {
                document.getElementById('userNameDisplay').style.color =
                    htmlElement.classList.contains('dark') ? '#e2e8f0' : '#334155';
            }
            saveData();
        }

        function formatTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }

        function formatTotalTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            if (h > 0) return `${h}h ${m}m`;
            return `${m}m`;
        }

        function updateTargetDisplay() {
            const mins = parseInt(inputMinutes.value) || 10;
            totalDuration = mins * 60;
            targetDisplay.textContent = formatTime(totalDuration);
        }

        function updateTimerDisplay() {
            const formatted = formatTime(timeElapsed);
            timerDisplay.textContent = formatted;
            if (isRunning) document.title = `${formatted} - Foco`;
            else if (timeElapsed > 0) document.title = `Pausado (${formatted})`;
            else document.title = defaultTitle;

            let pct = (timeElapsed / totalDuration) * 100;
            if (pct > 100) pct = 100;
            progressBar.style.width = `${pct}%`;
            progressContainer.setAttribute('aria-valuenow', Math.round(pct));
        }

        function toggleTimer() {
            if (isRunning) pauseTimer(); else startTimer();
        }

        function finishTask() {
            playAlarm();
            pauseTimer();
            const todayData = getTodayData();
            todayData.tasks++;
            const mins = parseInt(inputMinutes.value) || 10;
            todayData.totalTime += (mins * 60);
            updateStats();
            saveData();
            statusText.textContent = "Tarefa Concluída!";
            statusText.className = "text-green-700 dark:text-green-400 text-sm font-bold mb-6";
            document.title = "Concluído! ✅";
            setTimeout(() => { resetTimer(); }, 3000);
        }

        function manualAdjustTask(amount) {
            const todayData = getTodayData();
            const mins = parseInt(inputMinutes.value) || 10;
            if (amount > 0) {
                todayData.tasks++;
                todayData.totalTime += (mins * 60);
            } else {
                if (todayData.tasks > 0) {
                    todayData.tasks--;
                    todayData.totalTime -= (mins * 60);
                    if (todayData.totalTime < 0) todayData.totalTime = 0;
                }
            }
            updateStats();
            saveData();
        }

        function updateStats() {
            const d = getTodayData();
            taskCountDisplay.textContent = d.tasks;
            totalTimeDisplay.textContent = formatTotalTime(d.totalTime);
        }

        function adjustTimeInput(val) {
            let v = parseInt(inputMinutes.value) || 10;
            v += val;
            if (v < 1) v = 1;
            inputMinutes.value = v;
            saveData();
            updateTargetDisplay();
            if (!isRunning) resetTimer();
        }


        
// ════════════════════════════════════════════════════════════════
        // ALARMS & AUDIO PROCESSING
        // ════════════════════════════════════════════════════════════════
        let customAlarms = [];
        let selectedAlarmId = 'default'; // 'default' or document ID
        let currentPreviewAudio = null;

        function openAlarmModal() {
            const modal = document.getElementById('alarmModal');
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modal.firstElementChild.classList.remove('scale-95');
                modal.firstElementChild.classList.add('scale-100');
            });
            renderAlarmsList();
        }

        function closeAlarmModal() {
            const modal = document.getElementById('alarmModal');
            modal.classList.add('opacity-0');
            modal.firstElementChild.classList.remove('scale-100');
            modal.firstElementChild.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.remove('flex');
                modal.classList.add('hidden');
            }, 300);

            if (currentPreviewAudio) {
                currentPreviewAudio.pause();
                currentPreviewAudio = null;
            }
        }

        async function loadAlarms() {
            if (!currentUser) return;
            try {
                const snapshot = await db.collection('users').doc(currentUser.uid).collection('alarms').get();
                customAlarms = [];
                snapshot.forEach(doc => {
                    customAlarms.push({ id: doc.id, ...doc.data() });
                });

                // Load selected from profile
                const docSnap = await db.collection('users').doc(currentUser.uid).get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data.profile && data.profile.selectedAlarmId) {
                        selectedAlarmId = data.profile.selectedAlarmId;
                    } else {
                        selectedAlarmId = 'default';
                    }
                }
            } catch (err) {
                console.error('Erro ao carregar alarmes:', err);
            }
        }

        function renderAlarmsList() {
            const list = document.getElementById('alarmsList');
            // Keep default alarm HTML, wipe others
            const defaultHtml = list.firstElementChild.outerHTML;
            let htmlList = defaultHtml;

            customAlarms.forEach(alarm => {
                const isSelected = alarm.id === selectedAlarmId;
                const isPlaying = currentPreviewId === alarm.id;
                const svgPlay = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>';
                const svgPause = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';
                htmlList += `
                <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <div class="flex items-center gap-3 w-full overflow-hidden">
                        <input type="radio" name="alarmSelect" id="alarm_${alarm.id}" value="${alarm.id}" ${isSelected ? 'checked' : ''} class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 flex-shrink-0">
                        <label for="alarm_${alarm.id}" class="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer truncate flex-1">${alarm.name}</label>
                    </div>
                    <div class="flex gap-1 flex-shrink-0">
                        <button id="btn_play_${alarm.id}" onclick="previewAlarm('${alarm.id}')" class="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 p-1" title="Ouvir">
                            ${isPlaying ? svgPause : svgPlay}
                        </button>
                        <button onclick="deleteAlarm('${alarm.id}')" class="text-red-500 hover:text-red-600 p-1" title="Excluir">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                    </div>
                </div>
                `;
            });
            list.innerHTML = htmlList;

            // Re-select proper radio if default is selected
            if (selectedAlarmId === 'default') {
                const def = document.getElementById('alarm_default');
                if (def) def.checked = true;
            }
        }

        let currentPreviewId = null;

        function resetAllPlayIcons() {
            const svgPlay = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>';
            document.querySelectorAll('[id^="btn_play_"]').forEach(btn => btn.innerHTML = svgPlay);
            currentPreviewId = null;
        }

        function previewAlarm(id) {
            const svgPause = '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>';

            if (currentPreviewId === id) {
                if (currentPreviewAudio) currentPreviewAudio.pause();
                currentPreviewAudio = null;
                resetAllPlayIcons();
                return;
            }

            if (currentPreviewAudio) {
                currentPreviewAudio.pause();
                currentPreviewAudio = null;
            }
            resetAllPlayIcons();

            if (id === 'default') {
                const btn = document.getElementById('btn_play_default');
                if (btn) btn.innerHTML = svgPause;
                currentPreviewId = 'default';
                playSyntheticAlarm();
                setTimeout(() => resetAllPlayIcons(), 2800);
                return;
            }
            const alarm = customAlarms.find(a => a.id === id);
            if (alarm) {
                currentPreviewAudio = new Audio(alarm.base64);
                currentPreviewId = id;
                const btn = document.getElementById(`btn_play_${id}`);
                if (btn) btn.innerHTML = svgPause;

                currentPreviewAudio.onended = () => resetAllPlayIcons();
                currentPreviewAudio.play();
            }
        }

        async function saveSelectedAlarm() {
            const radios = document.getElementsByName('alarmSelect');
            let selected = 'default';
            for (const r of radios) {
                if (r.checked) { selected = r.value; break; }
            }

            selectedAlarmId = selected;
            if (currentUser) {
                await db.collection('users').doc(currentUser.uid).set({
                    profile: { selectedAlarmId: selected }
                }, { merge: true });
                showToast('Preferência de toque salva!', 'success');
            }
            closeAlarmModal();
        }

        async function deleteAlarm(id) {
            if (!confirm('Deseja excluir este toque?')) return;
            if (!currentUser) return;
            try {
                await db.collection('users').doc(currentUser.uid).collection('alarms').doc(id).delete();
                customAlarms = customAlarms.filter(a => a.id !== id);
                if (selectedAlarmId === id) {
                    selectedAlarmId = 'default';
                }
                renderAlarmsList();
                showToast('Toque excluído', 'success');
            } catch (e) {
                console.error(e);
                showToast('Erro ao excluir', 'error');
            }
        }

        // Web Audio API magic to trim and compress
        async function handleNewAlarmUpload(event) {
            const file = event.target.files[0];
            if (!file || !currentUser) return;
            event.target.value = ''; // Reset input

            const loader = document.getElementById('uploadLoading');
            loader.classList.remove('hidden');

            try {
                const base64Wav = await compressAudioToWavBase64(file, 7);

                // Generate a unique ID
                const newAlarm = {
                    name: file.name,
                    base64: base64Wav,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                const docRef = await db.collection('users').doc(currentUser.uid).collection('alarms').add(newAlarm);

                // Add to local state
                customAlarms.push({ id: docRef.id, name: file.name, base64: base64Wav });
                renderAlarmsList();
                showToast('Toque comprimido e salvo com sucesso!', 'success');

            } catch (err) {
                console.error('Upload Error:', err);
                showToast('Erro ao processar áudio.', 'error');
            } finally {
                loader.classList.add('hidden');
            }
        }

        async function compressAudioToWavBase64(file, maxDurationSeconds = 7) {
            const AC = window.AudioContext || window.webkitAudioContext;
            const audioContext = new AC();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const sampleRate = 16000; // Low quality enough, great compression
            const duration = Math.min(audioBuffer.duration, maxDurationSeconds);
            const length = duration * sampleRate;

            const offlineContext = new OfflineAudioContext(1, length, sampleRate);
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start(0);

            const renderedBuffer = await offlineContext.startRendering();
            const wavBlob = audioBufferToWav(renderedBuffer);

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(wavBlob);
            });
        }

        function audioBufferToWav(buffer) {
            const numOfChan = buffer.numberOfChannels;
            const length = buffer.length * numOfChan * 2 + 44;
            const bufferWav = new ArrayBuffer(length);
            const view = new DataView(bufferWav);
            const channels = [];
            const sampleRate = buffer.sampleRate;
            let offset = 0, pos = 0;

            function setUint16(data) { view.setUint16(offset, data, true); offset += 2; }
            function setUint32(data) { view.setUint32(offset, data, true); offset += 4; }

            setUint32(0x46464952); // "RIFF"
            setUint32(length - 8); // file length - 8
            setUint32(0x45564157); // "WAVE"

            setUint32(0x20746d66); // "fmt " chunk
            setUint32(16); // length = 16
            setUint16(1); // PCM (uncompressed)
            setUint16(numOfChan);
            setUint32(sampleRate);
            setUint32(sampleRate * 2 * numOfChan); // avg. bytes/sec
            setUint16(numOfChan * 2); // block-align
            setUint16(16); // 16-bit

            setUint32(0x61746164); // "data" - chunk
            setUint32(length - pos - 4); // chunk length

            for (let i = 0; i < buffer.numberOfChannels; i++)
                channels.push(buffer.getChannelData(i));

            while (pos < buffer.length) {
                for (let i = 0; i < numOfChan; i++) {
                    let sample = Math.max(-1, Math.min(1, channels[i][pos]));
                    sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                    view.setInt16(offset, sample, true);
                    offset += 2;
                }
                pos++;
            }

            return new Blob([bufferWav], { type: "audio/wav" });
        }

        function playAlarm() {
            if (selectedAlarmId !== 'default' && customAlarms.length > 0) {
                const alarm = customAlarms.find(a => a.id === selectedAlarmId);
                if (alarm) {
                    const audio = new Audio(alarm.base64);
                    audio.play().catch(e => {
                        console.error('Erro ao tocar', e);
                        playSyntheticAlarm();
                    });
                    return;
                }
            }
            playSyntheticAlarm();
        }

        function playSyntheticAlarm() {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            const ctx = new AC();
            const now = ctx.currentTime;
            const gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.3, now);
            const note = (f, t, d) => {
                const o = ctx.createOscillator();
                o.type = 'triangle';
                o.frequency.setValueAtTime(f, t);
                o.connect(gain);
                o.start(t); o.stop(t + d);
            };
            const n = [523.25, 659.25, 783.99, 1046.50], s = 0.15;
            note(n[0], now, s);
            note(n[1], now + s, s);
            note(n[2], now + s * 2, s);
            note(n[3], now + s * 3, s * 3);
            const p2 = now + 0.8;
            note(n[0], p2, s);
            note(n[1], p2 + s, s);
            note(n[2], p2 + s * 2, s);
            note(n[3], p2 + s * 3, 1.5);
            gain.gain.setValueAtTime(0.3, p2 + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.0001, p2 + 2.0);
        }

        