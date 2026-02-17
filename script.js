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
    const modalDate = document.getElementById('modalDate');
    const modalTextarea = document.getElementById('eventDiary');
    const saveBtn = document.getElementById('saveEventBtn');

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
            const title = document.getElementById('newCountdownTitle').value.trim();
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
            } else {
                alert('イベント名と日付を入力してね！');
            }
        });
    }

    // Interval Change
    const intervalInput = document.getElementById('countdownInterval');
    if (intervalInput) {
        intervalInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 1) val = 1;
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
            saveSettings();
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
    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideModal();
    });
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });

    // ===== PAGE NAVIGATION =====
    const navCalendarBtn = document.getElementById('navCalendar');
    const navMemoBtn = document.getElementById('navMemo');
    const pageCalendar = document.getElementById('pageCalendar');
    const pageMemo = document.getElementById('pageMemo');

    function switchPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
        // Deactivate all nav items
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

        if (pageName === 'calendar') {
            pageCalendar.classList.add('active');
            navCalendarBtn.classList.add('active');
        } else if (pageName === 'memo') {
            pageMemo.classList.add('active');
            navMemoBtn.classList.add('active');
            renderMemos();
        }
    }

    navCalendarBtn.addEventListener('click', () => switchPage('calendar'));
    navMemoBtn.addEventListener('click', () => switchPage('memo'));

    // ===== MEMO FUNCTIONALITY =====
    let memos = JSON.parse(localStorage.getItem('kawaiiMemos')) || [];
    let editingMemoId = null;
    let selectedMemoColor = '#ffb7c5';

    const memoModal = document.getElementById('memoModal');
    const closeMemoModalBtn = document.getElementById('closeMemoModal');
    const memoTitleInput = document.getElementById('memoTitleInput');
    const memoContentInput = document.getElementById('memoContentInput');
    const saveMemoBtn = document.getElementById('saveMemoBtn');
    const deleteMemoBtn = document.getElementById('deleteMemoBtn');
    const memoModalTitle = document.getElementById('memoModalTitle');
    const addMemoBtn = document.getElementById('addMemoBtn');
    const memoSearchInput = document.getElementById('memoSearchInput');

    // Memo Modal open/close
    closeMemoModalBtn.addEventListener('click', () => memoModal.classList.add('hidden'));
    memoModal.addEventListener('click', (e) => {
        if (e.target === memoModal) memoModal.classList.add('hidden');
    });

    // Add Memo
    addMemoBtn.addEventListener('click', () => openMemoModal(null));

    // Save Memo
    saveMemoBtn.addEventListener('click', saveMemo);

    // Delete Memo
    deleteMemoBtn.addEventListener('click', () => {
        if (editingMemoId && confirm('このメモを削除してもいい？')) {
            memos = memos.filter(m => m.id !== editingMemoId);
            saveMemos();
            memoModal.classList.add('hidden');
            renderMemos();
        }
    });

    // Color Selector
    document.querySelectorAll('#memoColorSelector .color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            document.querySelectorAll('#memoColorSelector .color-dot').forEach(d => d.classList.remove('selected'));
            dot.classList.add('selected');
            selectedMemoColor = dot.getAttribute('data-color');
        });
    });

    // Search
    memoSearchInput.addEventListener('input', () => renderMemos());

    function openMemoModal(memo) {
        if (memo) {
            // Editing existing
            editingMemoId = memo.id;
            memoModalTitle.textContent = '📝 メモを編集';
            memoTitleInput.value = memo.title;
            memoContentInput.value = memo.content;
            selectedMemoColor = memo.color || '#ffb7c5';
            deleteMemoBtn.style.display = 'block';
        } else {
            // New memo
            editingMemoId = null;
            memoModalTitle.textContent = '📝 新しいメモ';
            memoTitleInput.value = '';
            memoContentInput.value = '';
            selectedMemoColor = '#ffb7c5';
            deleteMemoBtn.style.display = 'none';
        }

        // Select color dot
        document.querySelectorAll('#memoColorSelector .color-dot').forEach(d => {
            d.classList.remove('selected');
            if (d.getAttribute('data-color') === selectedMemoColor) {
                d.classList.add('selected');
            }
        });

        memoModal.classList.remove('hidden');
        const mc = memoModal.querySelector('.modal-content');
        if (mc) mc.scrollTop = 0;
    }

    function saveMemo() {
        const title = memoTitleInput.value.trim();
        const content = memoContentInput.value.trim();

        if (!title && !content) {
            alert('タイトルか内容を入力してね！');
            return;
        }

        const now = new Date().toISOString();

        if (editingMemoId) {
            // Update existing
            memos = memos.map(m => {
                if (m.id === editingMemoId) {
                    return {
                        ...m,
                        title: title || '無題のメモ',
                        content,
                        color: selectedMemoColor,
                        updatedAt: now
                    };
                }
                return m;
            });
        } else {
            // New memo
            const newMemo = {
                id: Date.now(),
                title: title || '無題のメモ',
                content,
                color: selectedMemoColor,
                createdAt: now,
                updatedAt: now
            };
            memos.unshift(newMemo);
        }

        saveMemos();
        memoModal.classList.add('hidden');
        renderMemos();
    }

    function saveMemos() {
        localStorage.setItem('kawaiiMemos', JSON.stringify(memos));
    }

    function renderMemos() {
        const memoList = document.getElementById('memoList');
        const emptyState = document.getElementById('memoEmptyState');
        const searchQuery = memoSearchInput.value.trim().toLowerCase();

        memoList.innerHTML = '';

        // Filter memos by search
        let filtered = memos;
        if (searchQuery) {
            filtered = memos.filter(m =>
                m.title.toLowerCase().includes(searchQuery) ||
                m.content.toLowerCase().includes(searchQuery)
            );
        }

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            if (searchQuery) {
                emptyState.querySelector('p').textContent = '検索結果がないよ…';
                emptyState.querySelector('.empty-sub').textContent = '別のキーワードで探してみてね 🔍';
            } else {
                emptyState.querySelector('p').textContent = 'まだメモがないよ！';
                emptyState.querySelector('.empty-sub').textContent = '「＋ 新規メモ」から作ってみてね 🎀';
            }
        } else {
            emptyState.style.display = 'none';
        }

        filtered.forEach(memo => {
            const card = document.createElement('div');
            card.className = 'memo-card';
            card.style.setProperty('--memo-color', memo.color || '#ffb7c5');
            // Set color bar via inline style on ::before won't work, use border-left instead
            card.style.borderLeft = `5px solid ${memo.color || '#ffb7c5'}`;

            const titleEl = document.createElement('div');
            titleEl.className = 'memo-card-title';
            titleEl.textContent = memo.title || '無題のメモ';

            const previewEl = document.createElement('div');
            previewEl.className = 'memo-card-preview';
            previewEl.textContent = memo.content || '';

            const dateEl = document.createElement('div');
            dateEl.className = 'memo-card-date';
            const dateObj = new Date(memo.updatedAt || memo.createdAt);
            dateEl.textContent = dateObj.toLocaleDateString('ja-JP', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            card.appendChild(titleEl);
            card.appendChild(previewEl);
            card.appendChild(dateEl);

            card.addEventListener('click', () => openMemoModal(memo));

            memoList.appendChild(card);
        });
    }

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

            // Color weekends
            const dayOfWeek = (firstDay + i - 1) % 7;
            if (dayOfWeek === 0) {
                cell.style.color = '#ff6b6b';
            } else if (dayOfWeek === 6) {
                cell.style.color = '#4dabf7';
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

                // Show the dot if there is text
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
                    cell.style.textShadow = '0 0 3px white, 0 0 6px white';
                }
            }

            // Render multi-day events
            const dateObj = new Date(year, month, i);

            periodEvents.forEach(pEvent => {
                const start = new Date(pEvent.start);
                const end = new Date(pEvent.end);

                // Normalize time to 00:00:00 for accurate day comparison
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                const dateObjNorm = new Date(dateObj);
                dateObjNorm.setHours(0, 0, 0, 0);

                if (dateObjNorm >= start && dateObjNorm <= end) {
                    const bar = document.createElement('div');
                    bar.textContent = pEvent.title;
                    bar.classList.add('event-bar');

                    if (dateObjNorm.getTime() === start.getTime()) {
                        bar.classList.add('start');
                    }
                    if (dateObjNorm.getTime() === end.getTime()) {
                        bar.classList.add('end');
                    }
                    if (dateObjNorm > start && dateObjNorm < end) {
                        bar.classList.add('middle');
                        bar.textContent = pEvent.title;
                    }

                    // Handle click on bar to delete
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
            // Blur keyboard on mobile after adding
            todoInput.blur();
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
        if (confirm('この予定を削除していい？')) {
            todos = todos.filter(todo => todo.id !== id);
            saveTodos();
            renderTodos();
        }
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
                <div class="check-circle" data-id="${todo.id}"></div>
                <span>${escapeHtml(todo.text)}</span>
                <button class="delete-btn" data-id="${todo.id}">&times;</button>
            `;

            // Use event delegation instead of inline onclick
            li.querySelector('.check-circle').addEventListener('click', () => toggleTodo(todo.id));
            li.querySelector('.delete-btn').addEventListener('click', () => deleteTodo(todo.id));

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

        // Scroll modal content to top
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
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

        try {
            localStorage.setItem('kawaiiEvents', JSON.stringify(events));
        } catch (e) {
            console.error('LocalStorage save failed:', e);
            alert('保存に失敗しました。画像が大きすぎるかもしれません。画像を削除してもう一度試してね💦');
            return;
        }
        renderCalendar(); // Refresh
        hideModal();
    }

    function savePeriods() {
        localStorage.setItem('kawaiiPeriodEvents', JSON.stringify(periodEvents));
    }

    // --- New Feature Functions ---

    function applyTheme(theme) {
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

        const cdEvents = appSettings.countdowns || [];

        if (cdEvents.length === 0) {
            display.classList.add('hidden');
            return;
        }

        display.classList.remove('hidden');

        // Function to show one event
        const showEvent = () => {
            if (cdEvents.length === 0) return;

            // Wrap index
            if (currentCountdownIndex >= cdEvents.length) currentCountdownIndex = 0;

            const event = cdEvents[currentCountdownIndex];
            const targetDate = new Date(event.date);
            const today = new Date();
            targetDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            const diffTime = targetDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let html = '';
            if (diffDays > 0) {
                html = `${escapeHtml(event.title)}まで あと <span style="font-size:1.5em; color:var(--accent-color);">${diffDays}</span> 日！`;
            } else if (diffDays === 0) {
                html = `${escapeHtml(event.title)} 当日だよ！楽しんで🎉`;
            } else {
                html = `${escapeHtml(event.title)} 終了！お疲れ様 🎉`;
            }
            display.innerHTML = html;

            // Move to next for next interval
            currentCountdownIndex++;
        };

        // Show first immediately
        showEvent();

        // Set interval if multiple events
        if (cdEvents.length > 1) {
            const sec = appSettings.countdownInterval || 3;
            countdownIntervalId = setInterval(showEvent, sec * 1000);
        }
    }

    function renderCountdownList() {
        const listContainer = document.getElementById('countdownList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        const cdEvents = appSettings.countdowns || [];

        cdEvents.forEach((ev, index) => {
            const div = document.createElement('div');
            div.className = 'countdown-item';

            const span = document.createElement('span');
            span.textContent = `${ev.title} (${ev.date})`;

            const btn = document.createElement('button');
            btn.className = 'countdown-delete-btn';
            btn.textContent = '削除';
            btn.addEventListener('click', () => deleteCountdown(index));

            div.appendChild(span);
            div.appendChild(btn);
            listContainer.appendChild(div);
        });
    }

    // Countdown delete function
    function deleteCountdown(index) {
        if (confirm('削除してもいい？')) {
            appSettings.countdowns.splice(index, 1);
            saveSettings();
            renderCountdownList();
            updateCountdownDisplay();
        }
    }

    // Image Handling
    let currentImageBase64 = null;

    // Resize image to reduce storage usage
    function resizeImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(dataUrl);
                };
                img.onerror = reject;
                img.src = event.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('画像ファイルを選択してね！');
            e.target.value = '';
            return;
        }

        try {
            // Resize image to save localStorage space (max 800px, 70% quality JPEG)
            const resized = await resizeImage(file, 800, 800, 0.7);
            currentImageBase64 = resized;
            const preview = document.getElementById('imagePreview');
            preview.src = currentImageBase64;
            document.getElementById('imagePreviewContainer').classList.remove('hidden');
        } catch (err) {
            console.error('Image processing failed:', err);
            alert('画像の読み込みに失敗しました💦');
            e.target.value = '';
        }
    }

    function removeImage() {
        currentImageBase64 = null;
        document.getElementById('cameraInput').value = '';
        document.getElementById('galleryInput').value = '';
        document.getElementById('imagePreviewContainer').classList.add('hidden');
        document.getElementById('imagePreview').src = '';
    }

    function showCelebration() {
        const overlay = document.getElementById('celebrationOverlay');
        const messages = ["えらすぎ！天才！", "優勝！🏆", "かわいい！", "最強のJK！", "おつかれさま💖"];
        const msgEl = document.getElementById('celebrationMessage');

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
            memos: memos,
            version: 2
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
                if (data.memos) memos = data.memos;

                // Save to storage
                saveTodos();
                localStorage.setItem('kawaiiEvents', JSON.stringify(events));
                savePeriods();
                saveSettings();
                saveMemos();

                // Reload UI
                applyTheme(appSettings.theme);
                applyBackground(appSettings.bg || '');
                updateCountdownDisplay();
                renderCalendar();
                renderTodos();
                renderMemos();

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

    // Expose helpers globally (for backward compatibility)
    window.toggleTodo = toggleTodo;
    window.deleteTodo = deleteTodo;
    window.deleteCountdown = deleteCountdown;

    function init() {
        renderCalendar();
        renderTodos();
        applyTheme(appSettings.theme || 'pink');
        applyBackground(appSettings.bg || '');
        renderCountdownList();
        updateCountdownDisplay();
        updateCurrentDateDisplay();
    }

    init();
});
