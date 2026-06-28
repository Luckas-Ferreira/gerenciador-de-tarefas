// ════════════════════════════════════════════════════════════════
        // ICONS
        // ════════════════════════════════════════════════════════════════
        const ICON_PLAY = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
        const ICON_PAUSE = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

        
// ════════════════════════════════════════════════════════════════
        // INIT
        // ════════════════════════════════════════════════════════════════
        function init() {
            loadLocalData();
            updateTimerDisplay();
            updateTargetDisplay();

            inputMinutes.addEventListener('change', () => {
                saveData();
                updateTargetDisplay();
                if (!isRunning) resetTimer();
            });

            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && isRunning) updateTimerFromTimestamp();
            });

            // Close modal when clicking backdrop
            document.getElementById('loginModal').addEventListener('click', function (e) {
                if (e.target === this) hideLoginModal();
            });

            // Firebase auth listener
            if (FIREBASE_READY && auth) {
                auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        currentUser = user;
                        await onUserLoggedIn(user);
                    } else {
                        currentUser = null;
                        onUserLoggedOut();
                    }
                });
            }
        }

        
// ════════════════════════════════════════════════════════════════
        // MODAL
        // ════════════════════════════════════════════════════════════════
        function showLoginModal() {
            if (!FIREBASE_READY) {
                showToast('Configure o Firebase primeiro — veja o guia!', 'error');
                return;
            }
            document.getElementById('loginModal').classList.add('open');
            setTimeout(() => document.getElementById('loginEmail').focus(), 300);
        }

        function hideLoginModal() {
            document.getElementById('loginModal').classList.remove('open');
            clearAuthErrors();
        }

        function switchTab(tab) {
            const loginForm = document.getElementById('loginForm');
            const registerForm = document.getElementById('registerForm');
            const tabLogin = document.getElementById('tabLogin');
            const tabRegister = document.getElementById('tabRegister');
            clearAuthErrors();
            if (tab === 'login') {
                loginForm.style.display = 'flex';
                registerForm.style.display = 'none';
                tabLogin.classList.add('active');
                tabRegister.classList.remove('active');
            } else {
                loginForm.style.display = 'none';
                registerForm.style.display = 'flex';
                tabLogin.classList.remove('active');
                tabRegister.classList.add('active');
            }
        }

        function clearAuthErrors() {
            ['loginError', 'registerError'].forEach(id => {
                const el = document.getElementById(id);
                el.classList.add('hidden');
                el.textContent = '';
            });
        }

        function setButtonLoading(btn, loading, originalText) {
            btn.disabled = loading;
            btn.innerHTML = loading ? '<span class="spinner"></span>' : originalText;
        }

        
// ════════════════════════════════════════════════════════════════
        // HOURLY RATE, CURRENCY & EARNINGS
        // ════════════════════════════════════════════════════════════════
        const CURRENCY_CONFIG = {
            BRL: { locale: 'pt-BR', code: 'BRL', symbol: 'R$' },
            USD: { locale: 'en-US', code: 'USD', symbol: 'US$' },
            EUR: { locale: 'de-DE', code: 'EUR', symbol: '€' }
        };

        function selectCurrency(code) {
            selectedCurrency = code;
            applyCurrencyUI(code);
            updateEarningsDisplay();
            if (currentUser && FIREBASE_READY) saveCloudData();
        }

        function applyCurrencyUI(code) {
            ['BRL', 'USD', 'EUR'].forEach(c => {
                const btn = document.getElementById('curr' + c);
                if (btn) {
                    btn.classList.toggle('active', c === code);
                    btn.setAttribute('aria-pressed', c === code ? 'true' : 'false');
                }
            });
            const sym = CURRENCY_CONFIG[code]?.symbol || 'R$';
            const lbl = document.getElementById('currencySymbolLabel');
            if (lbl) lbl.textContent = sym;
        }

        async function saveHourlyRate() {
            hourlyRate = parseFloat(hourlyRateInput.value) || 0;
            updateEarningsDisplay();
            if (currentUser && FIREBASE_READY) {
                await saveCloudData();
            }
        }

        function updateEarningsDisplay() {
            const rate = parseFloat(hourlyRateInput.value) || 0;
            const todayData = getTodayData();
            const todaySecs = todayData.totalTime || 0;
            const todayEarned = (todaySecs / 3600) * rate;

            let weekSecs = 0;
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = getDateString(d);
                if (historyData[ds]) weekSecs += historyData[ds].totalTime || 0;
            }
            const weekEarned = (weekSecs / 3600) * rate;

            document.getElementById('earningsTodayDisplay').textContent = formatCurrency(todayEarned);
            document.getElementById('earningsWeekDisplay').textContent = formatCurrency(weekEarned);
            document.getElementById('totalHoursDisplay').textContent = formatTotalTime(todaySecs);
        }

        function formatCurrency(v) {
            const cfg = CURRENCY_CONFIG[selectedCurrency] || CURRENCY_CONFIG.BRL;
            try {
                return new Intl.NumberFormat(cfg.locale, {
                    style: 'currency', currency: cfg.code,
                    minimumFractionDigits: 2, maximumFractionDigits: 2
                }).format(v);
            } catch {
                return cfg.symbol + ' ' + v.toFixed(2);
            }
        }

        
// ════════════════════════════════════════════════════════════════
        // TOAST
        // ════════════════════════════════════════════════════════════════
        let toastTimer;
        function showToast(msg, type = 'info') {
            const el = document.getElementById('toast');
            el.textContent = msg;
            el.className = type;
            el.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
        }

        
// ════════════════════════════════════════════════════════════════
        // CHART
        // ════════════════════════════════════════════════════════════════
        function initChart() {
            const canvas = document.getElementById('productivityChart');
            if (!canvas) return;
            if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
            const ctx = canvas.getContext('2d');
            const isDark = htmlElement.classList.contains('dark');
            const txtColor = isDark ? '#94a3b8' : '#64748b';
            const gridClr = isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)';

            chartInstance = new Chart(ctx, {
                type: 'bar',
                data: getChartData(),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { callbacks: { label: c => formatTotalTime(c.raw * 60) + " focados" } }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: txtColor },
                            grid: { color: gridClr },
                            title: { display: true, text: 'Minutos', color: txtColor, font: { size: 10 } }
                        },
                        x: { ticks: { color: txtColor }, grid: { display: false } }
                    }
                }
            });

            const obs = new MutationObserver(() => {
                if (!chartInstance) return;
                const dk = htmlElement.classList.contains('dark');
                const tc = dk ? '#94a3b8' : '#64748b';
                const gc = dk ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)';
                chartInstance.options.scales.x.ticks.color = tc;
                chartInstance.options.scales.y.ticks.color = tc;
                chartInstance.options.scales.y.grid.color = gc;
                chartInstance.options.scales.y.title.color = tc;
                chartInstance.update();
            });
            obs.observe(htmlElement, { attributes: true });
        }

        function updateChart() {
            if (chartInstance) { chartInstance.data = getChartData(); chartInstance.update(); }
        }

        function getChartData() {
            const labels = [], data = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const ds = getDateString(d);
                const mo = String(d.getMonth() + 1).padStart(2, '0');
                const da = String(d.getDate()).padStart(2, '0');
                labels.push(`${da}/${mo}`);
                data.push(historyData[ds] ? Math.round(historyData[ds].totalTime / 60) : 0);
            }
            return {
                labels,
                datasets: [{
                    label: 'Minutos Focados',
                    data,
                    backgroundColor: 'rgba(59,130,246,0.8)',
                    hoverBackgroundColor: 'rgba(37,99,235,1)',
                    borderRadius: 4
                }]
            };
        }

        
// ════════════════════════════════════════════════════════════════
        // PANORAMA MENSAL
        // ════════════════════════════════════════════════════════════════
        const MONTH_NAMES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        function togglePanorama() {
            const body = document.getElementById('panoramaBody');
            const toggle = document.getElementById('panoramaToggle');
            const isOpen = body.classList.toggle('open');
            toggle.classList.toggle('panorama-open', isOpen);
            if (isOpen) renderPanorama();
        }

        function shiftMonth(dir) {
            const now = new Date();
            const targetDate = new Date(now.getFullYear(), now.getMonth() + panoramaMonthOffset + dir, 1);
            if (targetDate > new Date(now.getFullYear(), now.getMonth(), 1)) return;
            panoramaMonthOffset += dir;
            document.getElementById('panoramaNextBtn').style.opacity =
                panoramaMonthOffset >= 0 ? '0.35' : '1';
            renderPanorama();
        }

        function renderPanorama() {
            const now = new Date();
            const tDate = new Date(now.getFullYear(), now.getMonth() + panoramaMonthOffset, 1);
            const tYear = tDate.getFullYear();
            const tMon = tDate.getMonth();

            document.getElementById('panoramaMonthLabel').textContent =
                MONTH_NAMES_PT[tMon] + ' ' + tYear;
            document.getElementById('panoramaNextBtn').style.opacity =
                panoramaMonthOffset >= 0 ? '0.35' : '1';

            const daysInMonth = new Date(tYear, tMon + 1, 0).getDate();
            let totalSecs = 0, totalTasks = 0, bestSecs = 0, bestDayNum = null;
            const labels = [], dataMin = [];

            for (let d = 1; d <= daysInMonth; d++) {
                const date = new Date(tYear, tMon, d);
                const ds = getDateString(date);
                const day = historyData[ds] || {};
                const secs = day.totalTime || 0;
                const tsk = day.taskCount || day.tasks || 0;
                totalSecs += secs;
                totalTasks += tsk;
                if (secs > bestSecs) { bestSecs = secs; bestDayNum = d; }
                labels.push(String(d));
                dataMin.push(Math.round(secs / 60));
            }

            const hh = Math.floor(totalSecs / 3600);
            const mm = Math.floor((totalSecs % 3600) / 60);
            document.getElementById('panoHours').textContent = hh ? `${hh}h ${mm}m` : `${mm}m`;
            document.getElementById('panoTasks').textContent = totalTasks;
            document.getElementById('panoEarnings').textContent =
                hourlyRate > 0 ? formatCurrency((totalSecs / 3600) * hourlyRate) : '—';
            document.getElementById('panoBestDay').textContent =
                bestDayNum ? `Dia ${bestDayNum}` : '—';

            renderMonthlyChart(labels, dataMin);
        }

        function renderMonthlyChart(labels, data) {
            const canvas = document.getElementById('monthlyChart');
            if (!canvas) return;
            if (monthlyChartInstance) { monthlyChartInstance.destroy(); monthlyChartInstance = null; }
            const ctx = canvas.getContext('2d');
            const isDark = htmlElement.classList.contains('dark');
            const txtColor = isDark ? '#94a3b8' : '#64748b';
            const gridClr = isDark ? 'rgba(51,65,85,0.5)' : 'rgba(226,232,240,0.8)';
            const grad = ctx.createLinearGradient(0, 0, 0, 140);
            grad.addColorStop(0, 'rgba(99,102,241,0.85)');
            grad.addColorStop(1, 'rgba(59,130,246,0.45)');

            monthlyChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'Minutos',
                        data,
                        backgroundColor: grad,
                        hoverBackgroundColor: 'rgba(99,102,241,1)',
                        borderRadius: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: c => {
                                    const m = c.raw;
                                    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: txtColor, maxTicksLimit: 5 },
                            grid: { color: gridClr },
                            title: { display: true, text: 'min', color: txtColor, font: { size: 9 } }
                        },
                        x: {
                            ticks: { color: txtColor, font: { size: 8 } },
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // ── Start ─────────────────────────────────────────────────────
        init();