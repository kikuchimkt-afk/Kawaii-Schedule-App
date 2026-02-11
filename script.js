document.addEventListener('DOMContentLoaded', () => {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthLabel = document.getElementById('monthLabel');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const todoInput = document.getElementById('todoInput');
    const addTodoBtn = document.getElementById('addTodoBtn');
    const todoList = document.getElementById('todoList');

    // Modal elements
    const modal = document.getElementById('eventModal');
    // const closeModal = document.querySelector('.close-btn'); // removed
    const modalDate = document.getElementById('modalDate');
    const modalTextarea = modal.querySelector('textarea');
    const saveBtn = document.querySelector('.save-btn');

    let currentDate = new Date();
    let selectedDateStr = null; // Format: YYYY-M-D
    let currentStamp = null;

    // State management
    let todos = JSON.parse(localStorage.getItem('kawaiiTodos')) || [];
    let events = JSON.parse(localStorage.getItem('kawaiiEvents')) || {};
    let periodEvents = JSON.parse(localStorage.getItem('kawaiiPeriodEvents')) || [];
    let appSettings = JSON.parse(localStorage.getItem('kawaiiAppSettings')) || {
        theme: 'pink',
        countdowns: [], // Array of {title, date}
        countdownInterval: 3 // seconds
    };

    // Migration for old format
    if (appSettings.countdown && !appSettings.countdowns) {
        if (appSettings.countdown.title) {
            appSettings.countdowns = [appSettings.countdown];
        } else {
            appSettings.countdowns = [];
        }
        delete appSettings.countdown;
        appSettings.countdownInterval = 3;
    }



    // Event Listeners
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));

    addTodoBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });

    const closeEventModalBtn = document.getElementById('closeEventModal');
    closeEventModalBtn.addEventListener('click', hideModal);

    // --- Settings Modal Listeners ---
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');
    const navSettingsBtn = document.getElementById('navSettings');

    navSettingsBtn.addEventListener('click', () => {
        renderCountdownList();
        document.getElementById('countdownInterval').value = appSettings.countdownInterval || 3;
        settingsModal.classList.remove('hidden');
    });
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // Theme Buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            saveSettings();
        });
    });

    // Add Countdown
    const addBtn = document.getElementById('addCountdownBtn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const title = document.getElementById('newCountdownTitle').value;
            const date = document.getElementById('newCountdownDate').value;
            if (title && date) {
                if (!appSettings.countdowns) appSettings.countdowns = [];
                appSettings.countdowns.push({ title, date });
                saveSettings();
                renderCountdownList();
                updateCountdownDisplay(); // Restart/Update loop
                // Reset inputs
                document.getElementById('newCountdownTitle').value = '';
                document.getElementById('newCountdownDate').value = '';
            }
        });
    }

    // Interval Change
    const intervalInput = document.getElementById('countdownInterval');
    if (intervalInput) {
        intervalInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 1) val = 1;
            appSettings.countdownInterval = val;
            saveSettings();
            updateCountdownDisplay(); // restart loop
        });
    }

    // Background Buttons
    document.querySelectorAll('.bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bg = btn.getAttribute('data-bg');
            applyBackground(bg);
            saveSettings(); // appSettings will store 'bg'
        });
    });

    // Image Input
    document.getElementById('cameraInput').addEventListener('change', handleImageUpload);
    document.getElementById('galleryInput').addEventListener('change', handleImageUpload);
    document.getElementById('removeImageBtn').addEventListener('click', removeImage);

    // Data Management
    const backupBtn = document.getElementById('backupBtn');
    const restoreBtn = document.getElementById('restoreBtn');
    if (backupBtn) backupBtn.addEventListener('click', backupData);
    if (restoreBtn) restoreBtn.addEventListener('click', restoreData);

    // Close modal when clicking outside content
    window.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    // Sticker selection in modal
    const stickers = document.getElementById('stickerSelector').querySelectorAll('span');
    stickers.forEach(s => {
        s.addEventListener('click', () => {
            // Remove selected from all
            stickers.forEach(el => el.classList.remove('selected'));

            const clickedStamp = s.getAttribute('data-stamp');
            if (currentStamp === clickedStamp) {
                // Deselect if already selected
                currentStamp = null;
            } else {
                // Select new
                s.classList.add('selected');
                currentStamp = clickedStamp;
            }
        });
    });

    saveBtn.addEventListener('click', saveEvent);

    function updateCurrentDateDisplay() {
        const display = document.getElementById('currentDate');
        const options = { year: 'numeric', month: 'long' };
        display.textContent = currentDate.toLocaleDateString('ja-JP', options);
    }

    function renderCalendar() {
        calendarGrid.innerHTML = '';

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Update header month label
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        monthLabel.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'empty');
            calendarGrid.appendChild(emptyCell);
        }

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.classList.add('day-cell');

            // Create date number element
            const dateNum = document.createElement('div');
            dateNum.textContent = i;
            cell.appendChild(dateNum);

            // Highlight today
            if (isCurrentMonth && i === today.getDate()) {
                cell.classList.add('today');
            }

            const dateKey = `${year}-${month + 1}-${i}`;

            // Check for events and add indicator
            const eventData = events[dateKey];
            if (eventData) {
                // If there is a stamp, show it
                if (eventData.stamp) {
                    const stampEl = document.createElement('div');
                    stampEl.textContent = eventData.stamp;
                    stampEl.classList.add('event-stamp');
                    cell.appendChild(stampEl);
                    cell.classList.add('has-stamp');
                }

                // If there is text, OR if there is a stamp (user wants to know if there is a schedule),
                // but usually if there is a stamp, that's enough visibility.
                // Let's show the dot ONLY if there is text, to differentiate "just a stamp" vs "comment written".
                if (eventData.text) {
                    const dot = document.createElement('div');
                    dot.classList.add('event-dot');
                    cell.appendChild(dot);
                }

                // Show Image Background
                if (eventData.image) {
                    cell.style.backgroundImage = `url(${eventData.image})`;
                    cell.style.backgroundSize = 'cover';
                    cell.style.backgroundPosition = 'center';
                    // Text might need shadow if image is present
                    cell.style.textShadow = '0 0 3px white';
                }
            }

            // Render multi-day events
            // We need to check if this day is part of any period event
            const dateObj = new Date(year, month, i);
            const dateStr = dateKey; // format is YYYY-M-D, but Date comparison is better with objects or zero-padded strings.
            // Let's standardise comparison using date objects for ranges

            // To properly render bars that span correctly, we need to know:
            // Is this the start? End? Middle?

            periodEvents.forEach(pEvent => {
                const start = new Date(pEvent.start);
                const end = new Date(pEvent.end);

                // Normalize time to 00:00:00 for accurate day comparison
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                dateObj.setHours(0, 0, 0, 0);

                if (dateObj >= start && dateObj <= end) {
                    const bar = document.createElement('div');
                    bar.textContent = pEvent.title;
                    bar.classList.add('event-bar');

                    if (dateObj.getTime() === start.getTime()) {
                        bar.classList.add('start');
                    }
                    if (dateObj.getTime() === end.getTime()) {
                        bar.classList.add('end');
                    }
                    if (dateObj > start && dateObj < end) {
                        bar.classList.add('middle');
                        bar.textContent = pEvent.title; // Repeat title for now, or empty string if we want continuous look
                        // CSS text-overflow will handle it, but for middle bars maybe we hide text or keep it?
                        // Keeping it allows seeing what it is if start is last week.
                    }

                    // Handle click on bar to delete (simple implementation)
                    bar.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`『${pEvent.title}』を削除しますか？`)) {
                            periodEvents = periodEvents.filter(ev => ev.id !== pEvent.id);
                            savePeriods();
                            renderCalendar();
                        }
                    });

                    cell.appendChild(bar);
                }
            });

            cell.addEventListener('click', () => openModal(dateKey));

            calendarGrid.appendChild(cell);
        }
    }

    function changeMonth(delta) {
        currentDate.setMonth(currentDate.getMonth() + delta);
        renderCalendar();
        updateCurrentDateDisplay();
    }

    // --- Todo Functions ---

    function addTodo() {
        const text = todoInput.value.trim();
        if (text) {
            const newTodo = {
                text,
                completed: false,
                id: Date.now()
            };
            todos.push(newTodo);
            todoInput.value = '';
            saveTodos();
            renderTodos();
        }
    }

    function toggleTodo(id) {
        todos = todos.map(todo => {
            if (todo.id === id) {
                const completed = !todo.completed;
                if (completed) showCelebration();
                return { ...todo, completed };
            }
            return todo;
        });
        saveTodos();
        renderTodos();
    }

    function deleteTodo(id) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
    }

    function saveTodos() {
        localStorage.setItem('kawaiiTodos', JSON.stringify(todos));
    }

    function renderTodos() {
        todoList.innerHTML = '';
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.classList.add('todo-item');
            if (todo.completed) li.classList.add('completed');

            li.innerHTML = `
                <div class="check-circle" onclick="window.toggleTodo(${todo.id})"></div>
                <span>${escapeHtml(todo.text)}</span>
                <button class="delete-btn" onclick="window.deleteTodo(${todo.id})">&times;</button>
            `;
            todoList.appendChild(li);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Modal Functions ---

    function openModal(dateStr) {
        selectedDateStr = dateStr;

        // Format date for display (cleaner output)
        const [y, m, d] = dateStr.split('-');
        modalDate.textContent = `${y}年 ${m}月 ${d}日 の予定`;

        // Load existing content
        const stickers = document.getElementById('stickerSelector').querySelectorAll('span');
        stickers.forEach(s => s.classList.remove('selected'));
        currentStamp = null;

        // Reset image
        currentImageBase64 = null;
        document.getElementById('cameraInput').value = '';
        document.getElementById('galleryInput').value = '';
        document.getElementById('imagePreviewContainer').classList.add('hidden');
        document.getElementById('imagePreview').src = '';

        if (events[dateStr]) {
            modalTextarea.value = events[dateStr].text || '';
            if (events[dateStr].stamp) {
                currentStamp = events[dateStr].stamp;
                const target = Array.from(stickers).find(s => s.getAttribute('data-stamp') === currentStamp);
                if (target) target.classList.add('selected');
            }
            if (events[dateStr].image) {
                currentImageBase64 = events[dateStr].image;
                document.getElementById('imagePreview').src = currentImageBase64;
                document.getElementById('imagePreviewContainer').classList.remove('hidden');
            }
        } else {
            modalTextarea.value = '';
        }

        // Reset period form
        document.getElementById('eventTitle').value = '';
        // Set default end date to start date (needs YYYY-MM-DD format for input type=date)
        const padM = m.padStart(2, '0');
        const padD = d.padStart(2, '0');
        document.getElementById('eventEndDate').value = `${y}-${padM}-${padD}`;

        modal.classList.remove('hidden');
    }

    function hideModal() {
        modal.classList.add('hidden');
    }

    function saveEvent() {
        if (!selectedDateStr) return;

        // 1. Single Day Event Logic
        const text = modalTextarea.value.trim();
        const stamp = currentStamp;
        const image = currentImageBase64;

        if (text || stamp || image) {
            events[selectedDateStr] = { text, stamp, image };
        } else {
            delete events[selectedDateStr];
        }

        // 2. Multi-Day Event Logic
        const title = document.getElementById('eventTitle').value.trim();
        const endDateVal = document.getElementById('eventEndDate').value;

        if (title && endDateVal) {
            // Create new period event
            const [yearStr, monthStr, dayStr] = selectedDateStr.split('-');
            const startDateStr = `${yearStr}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`; // Normalize to YYYY-MM-DD

            // Check if end date is valid (>= start date)
            if (new Date(endDateVal) < new Date(startDateStr)) {
                alert("終了日は開始日以降にしてね！");
                return;
            }

            const newPeriod = {
                id: Date.now(),
                title: title,
                start: startDateStr,
                end: endDateVal
            };
            periodEvents.push(newPeriod);
            savePeriods();
        }

        localStorage.setItem('kawaiiEvents', JSON.stringify(events));
        renderCalendar(); // Refresh
        hideModal();
    }

    function savePeriods() {
        localStorage.setItem('kawaiiPeriodEvents', JSON.stringify(periodEvents));
    }

    // --- New Feature Functions ---

    function applyTheme(theme) {
        // Remove all theme attributes first (or just set the new one)
        // We defined themes using [data-theme="name"]
        if (theme === 'pink') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
        appSettings.theme = theme;
    }

    function applyBackground(bg) {
        if (!bg) {
            document.documentElement.removeAttribute('data-bg');
            appSettings.bg = '';
        } else {
            document.documentElement.setAttribute('data-bg', bg);
            appSettings.bg = bg;
        }
    }

    function saveSettings() {
        localStorage.setItem('kawaiiAppSettings', JSON.stringify(appSettings));
    }

    let countdownIntervalId = null;
    let currentCountdownIndex = 0;

    function updateCountdownDisplay() {
        const display = document.getElementById('countdownDisplay');

        // Clear existing interval
        if (countdownIntervalId) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
        }

        const events = appSettings.countdowns || [];

        if (events.length === 0) {
            display.classList.add('hidden');
            return;
        }

        display.classList.remove('hidden');

        // Function to show one event
        const showEvent = () => {
            if (events.length === 0) return;

            // Wrap index
            if (currentCountdownIndex >= events.length) currentCountdownIndex = 0;

            const event = events[currentCountdownIndex];
            const targetDate = new Date(event.date);
            const today = new Date();
            targetDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let html = '';
            if (diffDays > 0) {
                html = `${event.title}まで あと <span style="font-size:1.5em; color:var(--accent-color);">${diffDays}</span> 日！`;
            } else if (diffDays === 0) {
                html = `${event.title} 当日だよ！楽しんで🎉`;
            } else {
                html = `${event.title} 終了！お疲れ様 🎉`;
            }
            display.innerHTML = html;

            // Move to next for next interval
            currentCountdownIndex++;
        };

        // Show first immediately
        showEvent();

        // Set interval if multiple events
        if (events.length > 1) {
            const sec = appSettings.countdownInterval || 3;
            countdownIntervalId = setInterval(showEvent, sec * 1000);
        }
    }

    function renderCountdownList() {
        const listContainer = document.getElementById('countdownList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const events = appSettings.countdowns || [];

        events.forEach((ev, index) => {
            const div = document.createElement('div');
            div.className = 'countdown-item';
            div.innerHTML = `
                <span>${ev.title} (${ev.date})</span>
                <button class="countdown-delete-btn" onclick="deleteCountdown(${index})">削除</button>
            `;
            listContainer.appendChild(div);
        });
    }

    // Expose delete helper
    window.deleteCountdown = function (index) {
        if (confirm('削除してもいい？')) {
            appSettings.countdowns.splice(index, 1);
            saveSettings();
            renderCountdownList();
            updateCountdownDisplay();
        }
    };

    // Image Handling
    let currentImageBase64 = null;

    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (event) {
            currentImageBase64 = event.target.result;
            const preview = document.getElementById('imagePreview');
            preview.src = currentImageBase64;
            document.getElementById('imagePreviewContainer').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    function removeImage() {
        currentImageBase64 = null;
        document.getElementById('cameraInput').value = '';
        document.getElementById('galleryInput').value = '';
        document.getElementById('imagePreviewContainer').classList.add('hidden');
    }

    function showCelebration() {
        const overlay = document.getElementById('celebrationOverlay');
        const messages = ["えらすぎ！天才！", "優勝！🏆", "かわいい！", "最強のJK！", "おつかれさま💖"];
        const msgEl = document.getElementById('celebrartionMessage');

        msgEl.textContent = messages[Math.floor(Math.random() * messages.length)];
        overlay.classList.remove('hidden');

        // Force reflow
        void overlay.offsetWidth;

        overlay.classList.add('active');

        setTimeout(() => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 500);
        }, 2000);
    }

    function backupData() {
        const data = {
            todos: todos,
            events: events,
            periodEvents: periodEvents,
            appSettings: appSettings,
            version: 1
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `kawaii_plan_backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function restoreData() {
        const input = document.getElementById('restoreInput');
        const file = input.files[0];
        if (!file) {
            alert('ファイルを選択してね！');
            return;
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);
                if (data.todos) todos = data.todos;
                if (data.events) events = data.events;
                if (data.periodEvents) periodEvents = data.periodEvents;
                if (data.appSettings) appSettings = data.appSettings;

                // Save to storage
                saveTodos();
                localStorage.setItem('kawaiiEvents', JSON.stringify(events));
                savePeriods();
                saveSettings();

                // Reload UI
                applyTheme(appSettings.theme);
                updateCountdownDisplay();
                renderCalendar();
                renderTodos();

                alert('復元完了！おかえりなさい🎀');
                document.getElementById('settingsModal').classList.add('hidden');
                input.value = '';
            } catch (err) {
                console.error(err);
                alert('データが壊れているかも？復元できませんでした💦');
            }
        };
        reader.readAsText(file);
    }

    // Expose helpers globally
    window.toggleTodo = toggleTodo;
    window.deleteTodo = deleteTodo;
    window.deleteCountdown = deleteCountdown; // Correctly expose this

    function init() {
        renderCalendar();
        renderTodos();
        applyTheme(appSettings.theme || 'pink');
        applyBackground(appSettings.bg || '');
        renderCountdownList();
        updateCountdownDisplay();
    }

    init();
});
