const STORAGE_QUESTIONS = 'profyne_questions';
const STORAGE_SUBMISSIONS = 'profyne_submissions';
const STORAGE_WRITTEN = 'profyne_written_submissions';
const STORAGE_WRITTEN_QUESTIONS = 'profyne_written_questions_list';
const STORAGE_TIMER = 'profyne_timer_setting';
const STORAGE_ADMIN_PASS = 'profyne_admin_pass';

const defaultQuestions = [
    {
        question: "What does HTML stand for?",
        options: ["Hyper Text Markup Language", "High Tech Multi Language", "Hyper Transfer Markup Language", "None of these"],
        correct: 0
    },
    {
        question: "Which Tailwind CSS class is used to make text bold?",
        options: ["font-normal", "font-bold", "text-bold", "weight-bold"],
        correct: 1
    }
];

let questions = JSON.parse(localStorage.getItem(STORAGE_QUESTIONS)) || defaultQuestions;
let submissions = JSON.parse(localStorage.getItem(STORAGE_SUBMISSIONS)) || [];
let writtenSubmissions = JSON.parse(localStorage.getItem(STORAGE_WRITTEN)) || [];
let writtenQuestions = JSON.parse(localStorage.getItem(STORAGE_WRITTEN_QUESTIONS)) || [
    "Describe your career goals and technical expertise.",
    "What are the main responsibilities of your trade?"
];
let quizTimerSetting = parseInt(localStorage.getItem(STORAGE_TIMER)) || 30;
let adminPassword = localStorage.getItem(STORAGE_ADMIN_PASS) || "profyne123";

let currentStudent = { name: '', trade: '', phone: '', avatar: '' };
let currentQuestionIndex = 0;
let score = 0;
let timerInterval = null;
let timeLeft = quizTimerSetting;
let isAdminLoggedIn = false;

window.onload = function () {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.documentElement.classList.add('dark');
    renderAdminWrittenQuestionsList();
};

function toggleDarkMode() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    const iconMobile = document.getElementById('theme-icon-mobile');
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        if (icon) icon.setAttribute('data-lucide', 'moon');
        if (iconMobile) iconMobile.setAttribute('data-lucide', 'moon');
    } else {
        html.classList.add('dark');
        if (icon) icon.setAttribute('data-lucide', 'sun');
        if (iconMobile) iconMobile.setAttribute('data-lucide', 'sun');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

const activeClass = "w-full sm:w-auto px-4 py-2 rounded-xl font-semibold text-sm transition bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg flex items-center justify-center sm:justify-start space-x-2";
const inactiveClass = "w-full sm:w-auto px-4 py-2 rounded-xl font-semibold text-sm transition text-slate-400 hover:text-white flex items-center justify-center sm:justify-start space-x-2";

function switchTab(tab) {
    const studentView = document.getElementById('student-view');
    const writtenView = document.getElementById('written-view');
    const adminView = document.getElementById('admin-view');
    
    const navStudent = document.getElementById('nav-student');
    const navWritten = document.getElementById('nav-written');
    const navAdmin = document.getElementById('nav-admin');

    navStudent.className = inactiveClass;
    if (navWritten) navWritten.className = inactiveClass;
    navAdmin.className = inactiveClass;

    studentView.classList.add('hidden');
    if (writtenView) writtenView.classList.add('hidden');
    adminView.classList.add('hidden');

    if (tab === 'student') {
        studentView.classList.remove('hidden');
        navStudent.className = activeClass;
        resetQuizStateUI();
    } else if (tab === 'written') {
        writtenView.classList.remove('hidden');
        if (navWritten) navWritten.className = activeClass;
        renderStudentWrittenQuestions();
    } else {
        adminView.classList.remove('hidden');
        navAdmin.className = activeClass;

        if (isAdminLoggedIn) {
            document.getElementById('admin-lockscreen').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.remove('hidden');
            renderAdminQuestions();
            renderAdminWrittenQuestionsList();
            renderSubmissionsTable();
            renderWrittenSubmissionsTable();
        } else {
            document.getElementById('admin-lockscreen').classList.remove('hidden');
            document.getElementById('admin-dashboard').classList.add('hidden');
        }
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

let temporaryAvatarBase64 = '';
function previewAvatar(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            temporaryAvatarBase64 = e.target.result;
            const container = document.getElementById('avatar-preview-container');
            container.innerHTML = `<img src="${temporaryAvatarBase64}" class="w-full h-full object-cover">`;
        }
        reader.readAsDataURL(file);
    }
}

function startQuiz(event) {
    event.preventDefault();
    const name = document.getElementById('student-name-input').value.trim();
    const trade = document.getElementById('student-trade-input').value.trim();
    const phone = document.getElementById('student-phone-input').value.trim();

    if (!name || !trade || !phone) {
        showProfynePopup("⚠️ Warning", "Please fill in all required fields!", "amber");
        return;
    }

    if (questions.length === 0) {
        showProfynePopup("⚠️ Warning", "No questions available!", "amber");
        return;
    }

    currentStudent = { 
        name, 
        trade, 
        phone, 
        avatar: temporaryAvatarBase64 || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' 
    };
    currentQuestionIndex = 0;
    score = 0;

    document.getElementById('quiz-start-card').classList.add('hidden');
    document.getElementById('quiz-box').classList.remove('hidden');
    document.getElementById('greeting-student').innerHTML = `<i data-lucide="user" class="w-3.5 h-3.5 inline mr-1 text-indigo-400"></i>Student: ${name}`;

    loadQuestion();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadQuestion() {
    clearInterval(timerInterval);
    if (currentQuestionIndex >= questions.length) {
        finishQuiz();
        return;
    }

    const q = questions[currentQuestionIndex];
    document.getElementById('question-progress').innerText = `Question ${currentQuestionIndex + 1} / ${questions.length}`;
    document.getElementById('question-text').innerText = q.question;

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 hover:border-indigo-500 hover:bg-indigo-500/10 transition font-medium text-white flex items-center justify-between group";
        btn.innerHTML = `<span><strong class="text-indigo-400 mr-2">${String.fromCharCode(65 + idx)}.</strong> ${opt}</span>`;
        btn.onclick = () => selectOption(idx);
        optionsContainer.appendChild(btn);
    });

    document.getElementById('next-btn').classList.add('hidden');
    startTimer();
}

function startTimer() {
    timeLeft = quizTimerSetting;
    document.getElementById('time-left').innerText = timeLeft;
    const progressBar = document.getElementById('timer-progress-bar');
    progressBar.style.width = '100%';

    const totalTime = timeLeft;
    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('time-left').innerText = timeLeft;
        progressBar.style.width = `${(timeLeft / totalTime) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            selectOption(-1);
        }
    }, 1000);
}

function selectOption(selectedIndex) {
    clearInterval(timerInterval);
    const q = questions[currentQuestionIndex];
    const buttons = document.getElementById('options-container').getElementsByTagName('button');

    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
        if (i === selectedIndex) {
            buttons[i].className = "w-full text-left p-4 rounded-2xl bg-indigo-600/30 border border-indigo-500 text-white font-medium flex items-center justify-between";
        }
    }

    if (selectedIndex === q.correct) {
        score++;
    }
    
    document.getElementById('next-btn').classList.remove('hidden');
}

function nextQuestion() {
    currentQuestionIndex++;
    loadQuestion();
}

function finishQuiz() {
    document.getElementById('quiz-box').classList.add('hidden');
    document.getElementById('quiz-result-card').classList.remove('hidden');

    const subDate = new Date().toLocaleString();

    document.getElementById('badge-avatar').src = currentStudent.avatar;
    document.getElementById('badge-name').innerText = currentStudent.name;
    document.getElementById('badge-trade').innerText = `Trade: ${currentStudent.trade}`;
    document.getElementById('badge-score').innerText = `${score} / ${questions.length}`;
    document.getElementById('badge-date').innerText = subDate;

    const submissionData = {
        name: currentStudent.name,
        trade: currentStudent.trade,
        phone: currentStudent.phone,
        avatar: currentStudent.avatar,
        score: `${score} / ${questions.length}`,
        date: subDate
    };
    submissions.unshift(submissionData);
    localStorage.setItem(STORAGE_SUBMISSIONS, JSON.stringify(submissions));
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function resetQuiz() {
    document.getElementById('quiz-result-card').classList.add('hidden');
    document.getElementById('quiz-start-card').classList.remove('hidden');
    document.getElementById('student-reg-form').reset();
    temporaryAvatarBase64 = '';
    document.getElementById('avatar-preview-container').innerHTML = `<i data-lucide="user" class="w-6 h-6 text-slate-400"></i>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function resetQuizStateUI() {
    document.getElementById('quiz-start-card').classList.remove('hidden');
    document.getElementById('quiz-box').classList.add('hidden');
    document.getElementById('quiz-result-card').classList.add('hidden');
}

// --- WRITTEN EXAM FUNCTIONS ---

function renderStudentWrittenQuestions() {
    const container = document.getElementById('written-questions-container');
    if (!container) return;
    container.innerHTML = '';

    if (writtenQuestions.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4">No written questions available right now.</p>`;
        return;
    }

    writtenQuestions.forEach((qText, index) => {
        const div = document.createElement('div');
        div.className = "bg-slate-900/80 p-5 rounded-2xl border border-white/5 space-y-3";
        div.innerHTML = `
            <label class="block text-sm font-bold text-purple-300">Question ${index + 1}: ${qText}</label>
            <textarea name="written_ans_${index}" rows="4" required placeholder="Write your answer here..."
                class="w-full rounded-2xl bg-slate-950 border border-slate-700/80 p-4 focus:border-indigo-500 outline-none text-white font-medium text-sm"></textarea>
        `;
        container.appendChild(div);
    });
}

function addWrittenExamQuestion(event) {
    event.preventDefault();
    const input = document.getElementById('admin-written-q-input');
    const qText = input.value.trim();
    if (!qText) return;

    writtenQuestions.push(qText);
    localStorage.setItem(STORAGE_WRITTEN_QUESTIONS, JSON.stringify(writtenQuestions));
    input.value = '';
    renderAdminWrittenQuestionsList();
    showProfynePopup("✅ Success", "Written question added successfully!", "purple");
}

function renderAdminWrittenQuestionsList() {
    const listContainer = document.getElementById('admin-written-questions-list');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    if (writtenQuestions.length === 0) {
        listContainer.innerHTML = `<p class="text-xs text-slate-400">No written questions added yet.</p>`;
        return;
    }

    writtenQuestions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = "bg-slate-900/90 p-3 rounded-xl border border-white/5 flex justify-between items-center text-sm";
        item.innerHTML = `
            <span class="text-slate-200 truncate pr-2"><strong>Q${index + 1}:</strong> ${q}</span>
            <button onclick="deleteWrittenQuestion(${index})" class="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        `;
        listContainer.appendChild(item);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteWrittenQuestion(index) {
    if (confirm("Are you sure you want to delete this written question?")) {
        writtenQuestions.splice(index, 1);
        localStorage.setItem(STORAGE_WRITTEN_QUESTIONS, JSON.stringify(writtenQuestions));
        renderAdminWrittenQuestionsList();
    }
}

function submitWrittenAnswers(event) {
    event.preventDefault();
    const name = document.getElementById('written-name').value.trim();
    const trade = document.getElementById('written-trade').value.trim();
    const phone = document.getElementById('written-phone').value.trim();

    if (!name || !trade || !phone) {
        showProfynePopup("⚠️ Warning", "Please fill in all required fields!", "amber");
        return;
    }

    let answersSummary = "";
    writtenQuestions.forEach((q, index) => {
        const ansField = document.querySelector(`textarea[name="written_ans_${index}"]`);
        const ansText = ansField ? ansField.value.trim() : "";
        answersSummary += `[Q${index + 1}: ${q}] Ans: ${ansText} || `;
    });

    const newSub = { 
        name, 
        trade, 
        phone, 
        answer: answersSummary, 
        date: new Date().toLocaleString() 
    };

    writtenSubmissions.unshift(newSub);
    localStorage.setItem(STORAGE_WRITTEN, JSON.stringify(writtenSubmissions));

    document.getElementById('written-form').reset();
    renderStudentWrittenQuestions();
    
    showProfynePopup("✨ Submitted Successfully!", "Your written answers have been recorded successfully.", "purple");
}

// --- CUSTOM POPUP FUNCTIONS ---
function showProfynePopup(title, message, theme = "purple") {
    const modal = document.getElementById('profyne-popup-modal');
    const titleEl = document.getElementById('popup-title');
    const msgEl = document.getElementById('popup-message');
    const iconContainer = document.getElementById('popup-icon-container');

    titleEl.innerText = title;
    msgEl.innerText = message;

    if (theme === "amber") {
        iconContainer.className = "w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30";
        iconContainer.innerHTML = `<i data-lucide="alert-circle" class="w-8 h-8"></i>`;
    } else {
        iconContainer.className = "w-16 h-16 bg-purple-500/20 text-purple-400 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/30";
        iconContainer.innerHTML = `<i data-lucide="check-circle-2" class="w-8 h-8"></i>`;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeProfynePopup() {
    const modal = document.getElementById('profyne-popup-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}

// --- ADMIN PANEL LOGIC ---

function handleAdminLogin(event) {
    event.preventDefault();
    const pass = document.getElementById('admin-password-input').value;
    if (pass === adminPassword) {
        isAdminLoggedIn = true;
        document.getElementById('admin-lockscreen').classList.add('hidden');
        document.getElementById('admin-dashboard').classList.remove('hidden');
        renderAdminQuestions();
        renderAdminWrittenQuestionsList();
        renderSubmissionsTable();
        renderWrittenSubmissionsTable();
        document.getElementById('admin-password-input').value = '';
    } else {
        showProfynePopup("❌ Error", "Incorrect Password!", "amber");
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleAdminLogout() {
    isAdminLoggedIn = false;
    document.getElementById('admin-dashboard').classList.add('hidden');
    document.getElementById('admin-lockscreen').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleFormSubmit(event) {
    event.preventDefault();
    const editIndex = parseInt(document.getElementById('edit-index').value);
    const qText = document.getElementById('q-text').value.trim();
    const opts = [
        document.getElementById('opt-0').value.trim(),
        document.getElementById('opt-1').value.trim(),
        document.getElementById('opt-2').value.trim(),
        document.getElementById('opt-3').value.trim()
    ];
    const correctOpt = parseInt(document.getElementById('correct-opt').value);

    const newQ = { question: qText, options: opts, correct: correctOpt };

    if (editIndex === -1) {
        questions.push(newQ);
    } else {
        questions[editIndex] = newQ;
        cancelEdit();
    }

    localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(questions));
    document.getElementById('question-form').reset();
    renderAdminQuestions();
    showProfynePopup("✅ Success", "Question saved successfully!", "purple");
}

function renderAdminQuestions() {
    const listContainer = document.getElementById('admin-questions-list');
    document.getElementById('admin-total-count').innerText = `${questions.length}`;
    listContainer.innerHTML = '';

    if (questions.length === 0) {
        listContainer.innerHTML = `<p class="text-center text-slate-400 py-4">No questions available.</p>`;
        return;
    }

    questions.forEach((q, index) => {
        const item = document.createElement('div');
        item.className = "bg-slate-900/85 p-4 rounded-2xl border border-white/5 flex justify-between items-center";
        item.innerHTML = `
            <div>
                <span class="text-xs font-bold text-indigo-400">Q${index + 1}</span>
                <p class="font-medium text-white text-sm">${q.question}</p>
            </div>
            <div class="flex items-center space-x-2">
                <button onclick="editQuestion(${index})" class="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button onclick="deleteQuestion(${index})" class="p-2 rounded-xl bg-rose-500/10 text-rose-400"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;
        listContainer.appendChild(item);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function editQuestion(index) {
    const q = questions[index];
    document.getElementById('edit-index').value = index;
    document.getElementById('q-text').value = q.question;
    for (let i = 0; i < 4; i++) document.getElementById(`opt-${i}`).value = q.options[i];
    document.getElementById('correct-opt').value = q.correct;
    document.getElementById('submit-btn').innerText = "Update";
    document.getElementById('cancel-edit-btn').classList.remove('hidden');
}

function cancelEdit() {
    document.getElementById('edit-index').value = "-1";
    document.getElementById('question-form').reset();
    document.getElementById('submit-btn').innerText = "Save Question";
    document.getElementById('cancel-edit-btn').classList.add('hidden');
}

function deleteQuestion(index) {
    if (confirm("Delete this question?")) {
        questions.splice(index, 1);
        localStorage.setItem(STORAGE_QUESTIONS, JSON.stringify(questions));
        renderAdminQuestions();
    }
}

function renderSubmissionsTable() {
    const container = document.getElementById('quiz-submissions-cards');
    if (!container) return;
    container.innerHTML = '';

    if (submissions.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4 col-span-full">No quiz submissions yet.</p>`;
        return;
    }

    submissions.forEach(sub => {
        const card = document.createElement('div');
        card.className = "bg-slate-900/80 p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4 shadow-lg";
        card.innerHTML = `
            <div class="flex items-center space-x-4">
                <img src="${sub.avatar || ''}" class="w-14 h-14 rounded-2xl object-cover border-2 border-indigo-500/30 shadow-md">
                <div>
                    <h4 class="font-bold text-white text-lg">${sub.name}</h4>
                    <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-semibold">${sub.trade}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 pt-3 border-t border-white/5 text-xs">
                <div>
                    <span class="text-slate-400 block font-medium">Phone:</span>
                    <span class="text-slate-200 font-bold">${sub.phone}</span>
                </div>
                <div>
                    <span class="text-slate-400 block font-medium">Score:</span>
                    <span class="text-amber-400 font-black text-sm">${sub.score}</span>
                </div>
            </div>
            <div class="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                <span>Submitted at: ${sub.date}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function clearSubmissions() {
    if (confirm("Clear quiz history?")) {
        submissions = [];
        localStorage.removeItem(STORAGE_SUBMISSIONS);
        renderSubmissionsTable();
    }
}

function renderWrittenSubmissionsTable() {
    const container = document.getElementById('written-submissions-cards');
    if (!container) return;
    container.innerHTML = '';

    if (writtenSubmissions.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4">No written submissions yet.</p>`;
        return;
    }

    writtenSubmissions.forEach(sub => {
        const card = document.createElement('div');
        card.className = "bg-slate-900/80 p-6 rounded-2xl border border-white/10 space-y-4 shadow-lg";
        card.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                <div>
                    <h4 class="font-bold text-white text-lg">${sub.name}</h4>
                    <span class="text-xs bg-purple-500/20 text-purple-300 px-2.5 py-0.5 rounded-full border border-purple-500/30 font-semibold">${sub.trade}</span>
                </div>
                <div class="text-xs text-slate-400 font-medium">
                    📞 <span class="text-slate-200">${sub.phone}</span>
                </div>
            </div>
            <div>
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Written Answers:</span>
                <div class="bg-slate-950/60 p-4 rounded-xl border border-white/5 text-sm text-slate-200 whitespace-pre-line leading-relaxed font-normal">
                    ${sub.answer}
                </div>
            </div>
            <div class="text-[10px] text-slate-500 pt-1">
                <span>Submitted at: ${sub.date}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function clearWrittenSubmissions() {
    if (confirm("Clear written submissions?")) {
        writtenSubmissions = [];
        localStorage.removeItem(STORAGE_WRITTEN);
        renderWrittenSubmissionsTable();
    }
}

function openSettingsModal() {
    document.getElementById('setting-timer-input').value = quizTimerSetting;
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}
function saveTimerSetting() {
    quizTimerSetting = parseInt(document.getElementById('setting-timer-input').value);
    localStorage.setItem(STORAGE_TIMER, quizTimerSetting);
    closeSettingsModal();
    showProfynePopup("✅ Success", "Timer updated successfully!", "purple");
}

function openPasswordModal() {
    const modal = document.getElementById('password-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}
function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
}
function saveAdminPassword() {
    const newPass = document.getElementById('new-admin-pass').value.trim();
    if(!newPass) return;
    adminPassword = newPass;
    localStorage.setItem(STORAGE_ADMIN_PASS, adminPassword);
    closePasswordModal();
    document.getElementById('new-admin-pass').value = '';
    showProfynePopup("✅ Success", "Admin password updated successfully!", "purple");
}