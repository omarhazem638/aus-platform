// ==================== CORE FUNCTIONS ====================

function showSection(sectionId) {
    // Leaving an in-progress certification exam must stop its countdown —
    // otherwise it keeps ticking in the hidden section and can auto-submit
    // blank answers through the whole exam before the student returns.
    if (sectionId !== 'certifications' && window._certStopActiveTimer) window._certStopActiveTimer();
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    // Activate the matching nav-tab whether the call came from a click or programmatically.
    try {
        const ev = (typeof event !== 'undefined') ? event : null;
        const fromClick = ev && ev.target && ev.target.closest ? ev.target.closest('.nav-tab') : null;
        // Programmatic call: prefer the tab whose onclick opens exactly this section, so two tabs that share a word
        // ("الأدوات" / "دليل الأدوات") never light up together. Sections without such a tab use the text map below.
        const exactTabs = fromClick ? [] : Array.from(document.querySelectorAll('.nav-tab'))
            .filter(t => (t.getAttribute('onclick') || '').startsWith("showSection('" + sectionId + "')"));
        if (fromClick) {
            fromClick.classList.add('active');
        } else if (exactTabs.length) {
            exactTabs.forEach(t => t.classList.add('active'));
        } else {
            const map = { home: 'الرئيسية', tools: 'الأدوات', leadership: 'الشخصية', challenges: 'التحديات', actions: 'تصرف', ceoai: 'CEO', careerdna: 'DNA', interview: 'مقابلة', crisis: 'أزمة', roadmap: 'خارطة', study: 'دراسة', dashboard: 'Dashboard', demo: 'Demo', achievements: 'الإنجازات', map: 'الخريطة', missions: 'مهام', english: 'English', vocab: 'Vocabulary Master', certifications: 'الشهادات الاحترافية', chat: 'الدردشة', store: 'المتجر' };
            const needle = map[sectionId];
            if (needle) {
                document.querySelectorAll('.nav-tab').forEach(t => {
                    if (t.textContent && t.textContent.includes(needle)) t.classList.add('active');
                });
            }
        }
    } catch {}

    if (sectionId === 'home') renderSpecialties();
    if (sectionId === 'tools') renderToolsList();
    if (sectionId === 'leadership') renderLeadership();
    if (sectionId === 'challenges') renderChallenges();
    if (sectionId === 'actions') renderActions();
    if (sectionId === 'careerdna')   renderCareerDNA();
    if (sectionId === 'interview')   renderInterviewSimulator();
    if (sectionId === 'crisis')      renderCrisisSimulation();
    if (sectionId === 'roadmap')     renderRoadmap();
    if (sectionId === 'study')       renderStudyAssistant();
    if (sectionId === 'dashboard')     renderDashboard();
    if (sectionId === 'achievements')  renderAchievements();
    if (sectionId === 'map')           renderUniversityMap();
    if (sectionId === 'missions')      renderMissions();
    if (sectionId === 'english')       renderEnglishCenter();
    if (sectionId === 'vocab')         renderVocabMaster();
    if (sectionId === 'certifications') window.renderCertificationsHub && window.renderCertificationsHub();
    if (sectionId === 'chat') window.renderChatHub && window.renderChatHub();
    if (sectionId === 'store') window.renderStoreHub && window.renderStoreHub();
    if (sectionId === 'toolsindex') window.renderToolsIndex && window.renderToolsIndex();
    if (sectionId === 'siteindex') window.renderSiteIndex && window.renderSiteIndex();
    _achTrack('section_' + sectionId);
    checkAchievements();
}

function updateStats() {
    document.getElementById('userXP').textContent = userXP + ' XP';
    document.getElementById('userLevel').textContent = 'المستوى ' + userLevel;
    let hearts = '';
    for (let i = 0; i < 3; i++) hearts += i < currentHearts ? '❤️' : '🖤';
    document.getElementById('userHearts').textContent = hearts;
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type + ' show';
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function addXP(amount) {
    userXP += amount;
    if (userXP >= userLevel * 1000) {
        userLevel++;
        showToast('🎉 تهانينا! وصلت للمستوى ' + userLevel, 'xp-toast');
    }
    updateStats();
    checkAchievements();
}

function loseHeart() {
    currentHearts--;
    updateStats();
    showToast('💔 خسرت قلباً! تبقى ' + currentHearts + ' قلوب', 'heart-toast');
    if (currentHearts <= 0) {
        showToast('😢 انتهت جميع القلوب! سيتم إعادة تعيين', 'heart-toast');
        setTimeout(() => { currentHearts = 3; updateStats(); }, 2000);
    }
}

// ==================== HOME ====================
function renderSpecialties() {
    const grid = document.getElementById('specialtiesGrid');
    grid.innerHTML = specialties.map(s => `
        <div class="card" onclick="selectSpecialty('${s.id}')">
            <div class="card-icon">${s.icon}</div>
            <h3>${s.name}</h3>
            <p>${s.desc}</p>
            <div class="card-stats">
                <span><i class="fas fa-tools"></i> ${s.tools} أدوات</span>
                <span><i class="fas fa-star"></i> ${Math.floor(Math.random() * 50)}% مكتمل</span>
            </div>
        </div>
    `).join('');
}

let selectedSpecialty = 'business';
function selectSpecialty(id) {
    selectedSpecialty = id;
    showSection('tools');
    renderToolsList();
}

// ==================== TOOLS ====================
function renderToolsList() {
    const content = document.getElementById('toolsContent');
    const tools = toolsData[selectedSpecialty] || toolsData.business;
    content.innerHTML = `
        <button class="back-btn" onclick="showSection('home')">
            <i class="fas fa-arrow-right"></i> العودة للتخصصات
        </button>
        <p class="cert-promo-line" style="text-align:center;cursor:pointer" onclick="showSection('certifications')">
            <i class="fas fa-graduation-cap"></i> احصل على شهادة احترافية من الجامعة الآن
        </p>
        <div class="tools-list">
            ${tools.map((t, i) => t.hidden ? '' : `
                <div class="tool-item" onclick="showToolLearn(${i})">
                    <i class="fas fa-${['bolt', 'chart-bar', 'bullseye', 'flask', 'rocket', 'desktop', 'handshake', 'chart-line', 'robot', 'sync'][i] || 'star'}"></i>
                    <div>
                        <h4>${t.icon} ${t.name}</h4>
                        <p>${t.desc}</p>
                    </div>
                </div>
            `).join('')}
        </div>
        <div id="toolQuizArea"></div>
    `;
}

function showToolLearn(toolIndex) {
    const tools = toolsData[selectedSpecialty] || toolsData.business;
    const tool = tools[toolIndex];
    const l = tool.learn;
    const area = document.getElementById('toolQuizArea');
    area.innerHTML = `
        <div class="quiz-container active learn-screen">
            <div class="learn-header">
                <div class="learn-icon">${tool.icon}</div>
                <h2>${tool.name}</h2>
                <p class="learn-desc">${tool.desc}</p>
            </div>
            <div class="learn-content">
                <section>
                    <h3><i class="fas fa-book"></i> ما هو ${tool.name}؟</h3>
                    <p>${l.intro}</p>
                </section>
                <section>
                    <h3><i class="fas fa-key"></i> المكونات والمفاهيم الأساسية</h3>
                    <ul>${l.points.map(p => `<li>${p}</li>`).join('')}</ul>
                </section>
                <section>
                    <h3><i class="fas fa-bullseye"></i> متى تُستخدم؟</h3>
                    <p>${l.useCase}</p>
                </section>
                <section>
                    <h3><i class="fas fa-gem"></i> الفوائد الرئيسية</h3>
                    <ul>${l.benefits.map(b => `<li>${b}</li>`).join('')}</ul>
                </section>
                <section class="section-example">
                    <h3><i class="fas fa-building"></i> مثال واقعي</h3>
                    <p>${l.example}</p>
                </section>
                <section class="section-pitfall">
                    <h3><i class="fas fa-exclamation-triangle"></i> تحدٍ شائع</h3>
                    <p>${l.pitfall}</p>
                </section>
            </div>
            <button class="learn-start-btn" onclick="startToolQuiz(${toolIndex})">
                <i class="fas fa-play"></i> ابدأ الاختبار (10 أسئلة)
            </button>
            <button class="learn-start-btn cert-entry-btn" style="margin-top:10px;background:linear-gradient(135deg,#d4af37,#f4d675);color:#0a0812;" onclick="window.openCertifications && window.openCertifications('${selectedSpecialty}', ${toolIndex})">
                <i class="fas fa-award"></i> الشهادات الاحترافية (Certifications)
            </button>
        </div>
    `;
    area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function startToolQuiz(toolIndex) {
    const tools = toolsData[selectedSpecialty] || toolsData.business;
    const tool = tools[toolIndex];
    currentQuiz = {
        name: tool.name,
        icon: tool.icon,
        desc: tool.desc,
        explanation: tool.learn.intro,
        questions: generateToolQuestions(tool)
    };
    currentQuestion = 0;
    quizScore = 0;
    currentHearts = 3;
    updateStats();
    renderToolQuestion();
}

function renderToolQuestion() {
    const area = document.getElementById('toolQuizArea');
    const q = currentQuiz.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / currentQuiz.questions.length) * 100;

    area.innerHTML = `
        <div class="quiz-container active">
            <div class="quiz-header">
                <div class="quiz-progress">
                    <span>السؤال ${currentQuestion + 1}/${currentQuiz.questions.length}</span>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                </div>
                <div class="hearts-display">
                    ${[0,1,2].map(i => `<span class="heart ${i < currentHearts ? '' : 'lost'}">❤️</span>`).join('')}
                </div>
            </div>
            ${currentQuestion === 0 ? `<div class="question-box"><div class="explanation-text"><strong>📚 شرح الأداة:</strong><br>${currentQuiz.explanation}</div></div>` : ''}
            <div class="question-box">
                <h2>${q.q}</h2>
            </div>
            <div class="options-grid">
                ${q.options.map((opt, i) => `
                    <button class="option-btn" onclick="answerToolQuestion(${i})">
                        <span class="option-letter">${['أ', 'ب', 'ج', 'د'][i]}</span>
                        ${opt}
                    </button>
                `).join('')}
            </div>
            <div class="feedback-box" id="toolFeedback"></div>
            <button class="next-btn" id="toolNextBtn" onclick="nextToolQuestion()">السؤال التالي</button>
        </div>
    `;
}

function answerToolQuestion(answerIndex) {
    const q = currentQuiz.questions[currentQuestion];
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.add('disabled');
        if (i === q.correct) btn.classList.add('correct');
        else if (i === answerIndex && i !== q.correct) btn.classList.add('wrong');
    });

    const feedback = document.getElementById('toolFeedback');
    if (answerIndex === q.correct) {
        quizScore++;
        addXP(10);
        feedback.className = 'feedback-box correct-feedback show';
        feedback.innerHTML = `<strong>✅ إجابة صحيحة!</strong><br>+10 XP<br>${q.explanation}`;
        showToast('+10 XP 🌟', 'xp-toast');
    } else {
        loseHeart();
        feedback.className = 'feedback-box wrong-feedback show';
        feedback.innerHTML = `<strong>❌ إجابة خاطئة!</strong><br>${q.explanation}`;
    }
    document.getElementById('toolNextBtn').classList.add('show');
}

function nextToolQuestion() {
    currentQuestion++;
    if (currentQuestion < currentQuiz.questions.length) {
        renderToolQuestion();
    } else {
        showToolResults();
    }
}

function showToolResults() {
    const area = document.getElementById('toolQuizArea');
    const percentage = Math.round((quizScore / currentQuiz.questions.length) * 100);
    const totalXP = quizScore * 10;
    area.innerHTML = `
        <div class="results-screen active">
            <div class="result-icon">${percentage >= 70 ? '🏆' : percentage >= 50 ? '🥈' : '📚'}</div>
            <div class="result-score">${percentage}%</div>
            <div class="result-message">
                ${percentage >= 70 ? 'أداء ممتاز! لديك فهم عميق للأداة.' : percentage >= 50 ? 'أداء جيد! يمكنك تحسين معرفتك أكثر.' : 'استمر في التعلم! راجع الشرح وحاول مرة أخرى.'}
            </div>
            <div class="xp-gained"><i class="fas fa-star"></i> +${totalXP} XP</div>
            <button class="btn-primary" onclick="renderToolsList()">العودة للأدوات</button>
        </div>
    `;
}

// ==================== LEADERSHIP ====================
function renderLeadership() {
    const content = document.getElementById('leadershipContent');
    if (currentLeadershipQ === 0) {
        leadershipAnswers = [];
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">👑</div>
                <h2 style="margin-bottom: 1rem;">اكتشف شخصيتك القيادية</h2>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem; line-height: 1.8;">
                    هذا الاختبار يحتوي على 50 سؤالاً selected randomly من 300 سؤال.<br>
                    كل إجابة تكشف عن جانب من شخصيتك القيادية.<br>
                    <strong>لن تظهر النتيجة حتى تنتهي من جميع الأسئلة.</strong>
                </p>
                <button class="btn-primary" onclick="startLeadershipQuiz()">بدء الاختبار</button>
            </div>
        `;
    } else if (currentLeadershipQ <= 50) {
        renderLeadershipQuestion();
    } else {
        showLeadershipResults();
    }
}

function startLeadershipQuiz() {
    currentLeadershipQ = 1;
    leadershipAnswers = [];
    // Shuffle and pick 50 questions
    const shuffled = [...leadershipQuestions].sort(() => Math.random() - 0.5);
    window.selectedLeadershipQuestions = shuffled.slice(0, 50);
    renderLeadershipQuestion();
}

function renderLeadershipQuestion() {
    const content = document.getElementById('leadershipContent');
    const q = window.selectedLeadershipQuestions[currentLeadershipQ - 1];
    const progress = (currentLeadershipQ / 50) * 100;

    content.innerHTML = `
        <div class="quiz-container active">
            <div class="quiz-header">
                <div class="quiz-progress">
                    <span>السؤال ${currentLeadershipQ}/50</span>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                </div>
            </div>
            <div class="question-box">
                <h2>${q.q}</h2>
            </div>
            <div class="options-grid">
                ${q.options.map((opt, i) => `
                    <button class="option-btn" onclick="answerLeadership(${i})">
                        <span class="option-letter">${['أ', 'ب', 'ج', 'د'][i]}</span>
                        ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function answerLeadership(answerIndex) {
    const q = window.selectedLeadershipQuestions[currentLeadershipQ - 1];
    leadershipAnswers.push({
        personality: q.personality[answerIndex],
        weight: 1
    });
    currentLeadershipQ++;
    if (currentLeadershipQ <= 50) {
        renderLeadershipQuestion();
    } else {
        showLeadershipResults();
    }
}

function showLeadershipResults() {
    const scores = { autocratic: 0, democratic: 0, transformational: 0, delegative: 0 };
    leadershipAnswers.forEach(a => { scores[a.personality] += a.weight; });
    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const percentages = {};
    for (let p in scores) percentages[p] = Math.round((scores[p] / total) * 100);

    const dominant = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const personalities = {
        autocratic: { name: 'القائد الأوتوقراطي', desc: 'الحازم الذي يتخذ القرارات وحده لضمان السرعة والانضباط.', color: 'autocratic' },
        democratic: { name: 'القائد الديمقراطي', desc: 'المشارك الذي يستشير فريقه ليصنع قراراً جماعياً بروح الفريق.', color: 'democratic' },
        transformational: { name: 'القائد التحويلي', desc: 'الملهم الذي يطور قدرات موظفيه ويحفزهم لتحقيق رؤية مستقبلية طموحة.', color: 'transformational' },
        delegative: { name: 'القائد التفويضي', desc: 'الواثق الذي يمنح فريقه حرية التصرف كاملةً لاعتماده على خبرتهم.', color: 'delegative' }
    };

    const content = document.getElementById('leadershipContent');
    content.innerHTML = `
        <div class="results-screen active">
            <div class="result-icon">👑</div>
            <div class="result-score">${personalities[dominant].name}</div>
            <div class="result-message">${personalities[dominant].desc}</div>

            <div class="personality-chart">
                ${Object.entries(percentages).map(([key, val]) => `
                    <div class="personality-bar">
                        <div class="personality-label">${personalities[key].name}</div>
                        <div class="personality-track">
                            <div class="personality-fill ${personalities[key].color}" style="width: ${val}%">${val}%</div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 2rem;">
                <button class="btn-primary" onclick="showLeadershipDevelopment()">هل تريد تطوير ومعرفة شخصيتك القيادية؟</button>
                <button class="btn-secondary" onclick="currentLeadershipQ=0; renderLeadership();">إعادة الاختبار</button>
            </div>
        </div>
    `;

    // Animate bars
    setTimeout(() => {
        document.querySelectorAll('.personality-fill').forEach(bar => {
            bar.style.width = bar.textContent;
        });
    }, 100);
}

function showLeadershipDevelopment() {
    const content = document.getElementById('leadershipContent');
    content.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
            <h2 style="margin-bottom: 2rem;">🎯 خطة تطوير شخصيتك القيادية</h2>
            <div style="display: grid; gap: 1.5rem; max-width: 800px; margin: 0 auto; text-align: right;">
                <div class="scenario-card">
                    <h3>📚 الدورات التدريبية الموصى بها</h3>
                    <ul style="line-height: 2; color: rgba(255,255,255,0.8);">
                        <li>دورة القيادة التحويلية - Harvard Business School</li>
                        <li>إدارة الفرق عن بُعد - Coursera</li>
                        <li>الذكاء العاطفي في العمل - LinkedIn Learning</li>
                        <li>اتخاذ القرارات الاستراتيجية - MIT OpenCourseWare</li>
                    </ul>
                </div>
                <div class="scenario-card">
                    <h3>📖 الكتب الموصى بها</h3>
                    <ul style="line-height: 2; color: rgba(255,255,255,0.8);">
                        <li>"The 7 Habits of Highly Effective People" - Stephen Covey</li>
                        <li>"Leaders Eat Last" - Simon Sinek</li>
                        <li>"Good to Great" - Jim Collins</li>
                        <li>"Emotional Intelligence" - Daniel Goleman</li>
                    </ul>
                </div>
                <div class="scenario-card">
                    <h3>🎯 التحديات العملية</h3>
                    <ul style="line-height: 2; color: rgba(255,255,255,0.8);">
                        <li>قيادة مشروع صغير لمدة 30 يوماً</li>
                        <li>تطبيق نظام feedback يومي مع فريقك</li>
                        <li>تطوير خطة تطوير مهني لكل عضو في فريقك</li>
                        <li>المشاركة في ورشة عمل للقيادة</li>
                    </ul>
                </div>
            </div>
            <button class="btn-secondary" style="margin-top: 2rem;" onclick="currentLeadershipQ=0; renderLeadership();">العودة</button>
        </div>
    `;
}

// ==================== CHALLENGES ====================
function renderChallenges() {
    const content = document.getElementById('challengesContent');
    if (!currentChallenge) {
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">🧠</div>
                <h2 style="margin-bottom: 1rem;">تحديات الذكاء</h2>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem;">
                    اختبر ذكائك في مواقف واقعية من عالم الأعمال.<br>
                    لكل تخصص 10 سيناريوهات تحدّي.<br>
                    نظام القلوب والنقاط XP ينطبق هنا أيضاً.
                </p>
                <div class="cards-grid" style="max-width: 800px; margin: 0 auto;">
                    ${specialties.map(s => `
                        <div class="card" onclick="startChallenge('${s.id}')">
                            <div class="card-icon">${s.icon}</div>
                            <h3>${s.name}</h3>
                            <p>10 سيناريوهات تحدّي</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        renderChallengeQuestion();
    }
}

// خلط خيارات تحدي مع توزيع متوازن للإجابة الصحيحة
function shuffleChallengeOptions(q, targetPos) {
    const indices = [0, 1, 2, 3];
    // الإجابة الصحيحة في q.correct، ننقلها للموضع المستهدف
    [indices[q.correct], indices[targetPos]] = [indices[targetPos], indices[q.correct]];
    return {
        scenario: q.scenario,
        options: indices.map(i => q.options[i]),
        xp: indices.map(i => q.xp[i]),
        correct: targetPos
    };
}

function startChallenge(specId) {
    currentChallenge = specId;
    currentChallengeQ = 0;
    currentHearts = 3;
    updateStats();
    const challenges = challengesData[specId] || challengesData.business;
    const picked = shuffleArray([...challenges]).slice(0, 10);
    const targetPositions = balancedPositions(picked.length, 4);
    window.selectedChallenges = picked.map((q, i) => shuffleChallengeOptions(q, targetPositions[i]));
    renderChallengeQuestion();
}

function renderChallengeQuestion() {
    const content = document.getElementById('challengesContent');
    const q = window.selectedChallenges[currentChallengeQ];
    const progress = ((currentChallengeQ + 1) / 10) * 100;

    content.innerHTML = `
        <button class="back-btn" onclick="currentChallenge=null; renderChallenges();">
            <i class="fas fa-arrow-right"></i> العودة
        </button>
        <div class="quiz-container active">
            <div class="quiz-header">
                <div class="quiz-progress">
                    <span>التحدي ${currentChallengeQ + 1}/10</span>
                    <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
                </div>
                <div class="hearts-display">
                    ${[0,1,2].map(i => `<span class="heart ${i < currentHearts ? '' : 'lost'}">❤️</span>`).join('')}
                </div>
            </div>
            <div class="scenario-card">
                <div class="scenario-header">
                    <div class="scenario-number">${currentChallengeQ + 1}</div>
                    <h3>سيناريو التحدي</h3>
                </div>
                <div class="scenario-text">${q.scenario}</div>
            </div>
            <div class="options-grid">
                ${q.options.map((opt, i) => `
                    <button class="option-btn" onclick="answerChallenge(${i})">
                        <span class="option-letter">${['أ', 'ب', 'ج', 'د'][i]}</span>
                        ${opt}
                    </button>
                `).join('')}
            </div>
            <div class="feedback-box" id="challengeFeedback"></div>
            <button class="next-btn" id="challengeNextBtn" onclick="nextChallenge()">التحدي التالي</button>
        </div>
    `;
}

function answerChallenge(answerIndex) {
    const q = window.selectedChallenges[currentChallengeQ];
    try { if (typeof recordStudentAnswer === 'function') recordStudentAnswer('التحديات', q.scenario || q.situation || q.question || q.title || 'تحدٍّ قيادي', (q.options && q.options[answerIndex]) || '', answerIndex === q.correct); } catch (e) {}
    const buttons = document.querySelectorAll('.option-btn');
    buttons.forEach((btn, i) => {
        btn.classList.add('disabled');
        if (i === q.correct) btn.classList.add('correct');
        else if (i === answerIndex && i !== q.correct) btn.classList.add('wrong');
    });

    const xp = q.xp[answerIndex];
    const feedback = document.getElementById('challengeFeedback');
    if (answerIndex === q.correct) {
        addXP(xp);
        feedback.className = 'feedback-box correct-feedback show';
        feedback.innerHTML = `<strong>✅ إجابة ممتازة!</strong><br>+${xp} XP<br>أظهرت ذكاءً عالياً في هذا الموقف.`;
        showToast('+' + xp + ' XP 🧠', 'xp-toast');
    } else {
        loseHeart();
        feedback.className = 'feedback-box wrong-feedback show';
        feedback.innerHTML = `<strong>❌ إجابة غير مثالية</strong><br>الإجابة الأفضل كانت: ${q.options[q.correct]}<br>فكر في المخاطر والفرص بشكل أكثر توازناً.`;
    }
    document.getElementById('challengeNextBtn').classList.add('show');
}

function nextChallenge() {
    currentChallengeQ++;
    if (currentChallengeQ < 10) {
        renderChallengeQuestion();
    } else {
        showChallengeResults();
    }
}

function showChallengeResults() {
    const content = document.getElementById('challengesContent');
    content.innerHTML = `
        <div class="results-screen active">
            <div class="result-icon">🧠</div>
            <div class="result-score">اكتملت التحديات!</div>
            <div class="result-message">لقد أكملت جميع سيناريوهات التحدي بنجاح.</div>
            <div class="xp-gained"><i class="fas fa-star"></i> +${userXP} XP المجموع</div>
            <button class="btn-primary" onclick="currentChallenge=null; renderChallenges();">تحديات جديدة</button>
        </div>
    `;
}

// ==================== BEST ACTION ====================
function renderActions() {
    const content = document.getElementById('actionsContent');
    if (!currentAction) {
        content.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <div style="font-size: 5rem; margin-bottom: 2rem;">💡</div>
                <h2 style="margin-bottom: 1rem;">أفضل تصرف</h2>
                <p style="color: rgba(255,255,255,0.7); margin-bottom: 2rem;">
                    مواقف حقيقية من الشركات مع 4 احتمالات مختلفة.<br>
                    كل احتمال يظهر إيجابياته وسلبياته.<br>
                    اختر التصرف الأفضل واعرف لماذا.
                </p>
                <div class="cards-grid" style="max-width: 800px; margin: 0 auto;">
                    ${specialties.map(s => `
                        <div class="card" onclick="startActions('${s.id}')">
                            <div class="card-icon">${s.icon}</div>
                            <h3>${s.name}</h3>
                            <p>100+ موقف تدريبي</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        renderActionQuestion();
    }
}

// خلط ترتيب actions في كل موقف مع نقل best للموضع المستهدف
function shuffleActionScenario(scenario, targetPos) {
    const indices = [0, 1, 2, 3];
    const bestIdx = scenario.actions.findIndex(a => a.best);
    if (bestIdx >= 0 && bestIdx !== targetPos) {
        [indices[bestIdx], indices[targetPos]] = [indices[targetPos], indices[bestIdx]];
    }
    return {
        scenario: scenario.scenario,
        actions: indices.map(i => scenario.actions[i])
    };
}

function startActions(specId) {
    currentAction = specId;
    currentActionQ = 0;
    const actions = actionsData[specId] || actionsData.business;
    const picked = shuffleArray([...actions]).slice(0, 10);
    const targetPositions = balancedPositions(picked.length, 4);
    window.selectedActions = picked.map((s, i) => shuffleActionScenario(s, targetPositions[i]));
    renderActionQuestion();
}

function renderActionQuestion() {
    const content = document.getElementById('actionsContent');
    const q = window.selectedActions[currentActionQ];

    content.innerHTML = `
        <button class="back-btn" onclick="currentAction=null; renderActions();">
            <i class="fas fa-arrow-right"></i> العودة
        </button>
        <div class="scenario-card">
            <div class="scenario-header">
                <div class="scenario-number">${currentActionQ + 1}</div>
                <h3>موقف واقعي</h3>
            </div>
            <div class="scenario-text">${q.scenario}</div>
        </div>
        <div id="actionsList">
            ${q.actions.map((act, i) => `
                <div class="action-card" id="action${i}" onclick="selectAction(${i})">
                    <strong>${['أ', 'ب', 'ج', 'د'][i]}) ${act.text}</strong>
                    <div class="action-pros-cons" id="prosCons${i}" style="display: none;">
                        <div class="pros">
                            <h4><i class="fas fa-check-circle"></i> الإيجابيات</h4>
                            <ul>${act.pros.map(p => `<li>${p}</li>`).join('')}</ul>
                        </div>
                        <div class="cons">
                            <h4><i class="fas fa-times-circle"></i> السلبيات</h4>
                            <ul>${act.cons.map(c => `<li>${c}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div id="actionFeedback" style="margin-top: 2rem; text-align: center;"></div>
        <button class="next-btn" id="actionNextBtn" onclick="nextAction()" style="display: none; margin: 2rem auto;">الموقف التالي</button>
    `;
}

function selectAction(index) {
    const q = window.selectedActions[currentActionQ];
    try { if (typeof recordStudentAnswer === 'function') { var _bi = q.actions.findIndex(a => a.best); recordStudentAnswer('أفضل تصرّف', q.scenario || q.situation || q.title || 'موقف عملي', (q.actions[index] && q.actions[index].text) || '', index === _bi); } } catch (e) {}
    // Show pros/cons for all options
    q.actions.forEach((act, i) => {
        document.getElementById('prosCons' + i).style.display = 'grid';
        const card = document.getElementById('action' + i);
        if (i === index) card.classList.add('selected');
    });

    const feedback = document.getElementById('actionFeedback');
    if (index === q.actions.findIndex(a => a.best)) {
        addXP(15);
        feedback.innerHTML = `<div class="feedback-box correct-feedback show"><strong>✅ اختيار ممتاز!</strong><br>+15 XP<br>هذا التصرف يوازن بين المخاطر والفرص بشكل أمثل.</div>`;
        showToast('+15 XP 💡', 'xp-toast');
    } else {
        feedback.innerHTML = `<div class="feedback-box wrong-feedback show"><strong>⚠️ اختيار مقبول لكنه ليس الأمثل</strong><br>فكر في التوازن بين القصير والطويل المدى.</div>`;
    }
    document.getElementById('actionNextBtn').style.display = 'block';
}

function nextAction() {
    currentActionQ++;
    if (currentActionQ < window.selectedActions.length) {
        renderActionQuestion();
    } else {
        showActionResults();
    }
}

function showActionResults() {
    const content = document.getElementById('actionsContent');
    content.innerHTML = `
        <div class="results-screen active">
            <div class="result-icon">💡</div>
            <div class="result-score">اكتملت المواقف!</div>
            <div class="result-message">لقد اكتسبت خبرة في التعامل مع مواقف حقيقية من الشركات.</div>
            <button class="btn-primary" onclick="currentAction=null; renderActions();">مواقف جديدة</button>
        </div>
    `;
}

// ==================== CEO AI ====================

// --- تطبيع النص العربي لمطابقة أفضل ---
function normalizeAr(text) {
    return (text || '')
        .toString()
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ًٌٍَُِّْـ]/g, '')
        .replace(/[^؀-ۿ\w\s]/g, ' ')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// --- قاعدة معرفة CEO AI: 25 مفهوم أعمال أساسي ---
const aiKnowledge = [
    { keys: ['porter', 'القوي الخمس', 'قوي بورتر', 'five forces', 'بورتر'],
      title: 'القوى الخمس لبورتر — Porter Five Forces',
      definition: 'إطار طوّره مايكل بورتر عام 1979 لتحليل البيئة التنافسية لقطاع ما عبر خمس قوى تحدد جاذبيته الربحية على المدى الطويل.',
      components: ['حدة المنافسة بين الشركات الحالية', 'تهديد الداخلين الجدد للسوق', 'تهديد المنتجات والخدمات البديلة', 'القوة التفاوضية للموردين', 'القوة التفاوضية للعملاء'],
      when: 'عند تقييم جاذبية دخول قطاع جديد، أو فهم ديناميكيات قطاعك الحالي قبل قرارات استراتيجية كبرى.',
      example: 'استخدمت Netflix الإطار لفهم قطاع البث، فقرّرت الاستثمار بالمليارات في الإنتاج الأصلي لتقليل قوة استوديوهات هوليوود التفاوضية كموردين.',
      pitfall: 'الإطار صورة ثابتة لا تلتقط ديناميكية الأسواق سريعة التغير كالتقنية — يحتاج تحديثاً ربع سنوي على الأقل.',
      references: ['Porter, M. (1979) — HBR', 'Magretta (2012) — Understanding Michael Porter'] },

    { keys: ['blue ocean', 'المحيط الازرق', 'محيط ازرق'],
      title: 'استراتيجية المحيط الأزرق — Blue Ocean Strategy',
      definition: 'منهج طوّره كيم وموبورن عام 2005 لخلق مساحة سوقية جديدة (محيط أزرق) بدلاً من التنافس في أسواق مزدحمة (محيط أحمر) عبر ابتكار القيمة.',
      components: ['إلغاء — عناصر تفترضها الصناعة لكنها غير ضرورية', 'تقليل — عناصر مبالغ فيها', 'رفع — عناصر يحتاج العميل أكثر منها', 'ابتكار — عناصر لم تقدمها الصناعة من قبل (ERRC Grid)'],
      when: 'حين يصبح قطاعك مشبعاً والمنافسة على السعر تُلغي الأرباح. مثالي لإطلاق فئة منتجات جديدة.',
      example: 'خلق Cirque du Soleil محيطاً أزرق بدمج السيرك مع المسرح الراقي، فألغى الحيوانات وقلّل النجوم ورفع البيئة الفنية، فحقّق 4 مليار دولار من شيء يعتبره الجميع صناعة محتضرة.',
      pitfall: 'الابتكار وحده لا يكفي إن لم يقابله طلب فعلي — كثير من المحيطات الزرقاء فارغة لأن لا أحد يريد السباحة فيها.',
      references: ['Kim & Mauborgne (2005) — Blue Ocean Strategy', 'HBR Reprint R0410D'] },

    { keys: ['bcg', 'مصفوفه bcg', 'بي سي جي', 'growth share'],
      title: 'مصفوفة BCG — Growth-Share Matrix',
      definition: 'إطار طوّرته Boston Consulting Group عام 1970 لتصنيف وحدات الأعمال أو المنتجات في محفظة الشركة بناء على نمو السوق والحصة السوقية النسبية.',
      components: ['النجوم (Stars) — حصة عالية في سوق ينمو بسرعة', 'الأبقار الحلوب (Cash Cows) — حصة عالية في سوق ناضج', 'علامات الاستفهام (Question Marks) — حصة منخفضة في سوق ينمو', 'الكلاب (Dogs) — حصة منخفضة في سوق ناضج'],
      when: 'لإدارة محفظة منتجات أو وحدات أعمال وقرار توزيع الاستثمار: استثمر في النجوم، احلب الأبقار، قرر مصير علامات الاستفهام، تخلص من الكلاب.',
      example: 'تستخدم Procter & Gamble المصفوفة لإدارة مئات العلامات — Tide بقرة حلوب، علامات النظافة الصحية نجوم، وقد تخلصت من Pringles لأنها أصبحت كلباً.',
      pitfall: 'المصفوفة تختزل الواقع في بُعدين فقط — قد توجد منتجات "كلاب" استراتيجية للعلامة الكلية أو لاستكمال السلة.',
      references: ['BCG Perspectives (1970)', 'Henderson, B. — The Product Portfolio'] },

    { keys: ['business model canvas', 'نموذج العمل', 'كانفاس', 'canvas'],
      title: 'نموذج العمل التجاري — Business Model Canvas',
      definition: 'أداة بصرية طوّرها Alexander Osterwalder عام 2010 لتصميم نموذج عمل عبر 9 لبنات أساسية تجيب عن: من؟ ماذا؟ كيف؟ بكم؟',
      components: ['شرائح العملاء', 'القيمة المقترحة', 'القنوات', 'العلاقات مع العملاء', 'تدفقات الإيرادات', 'الموارد الرئيسية', 'الأنشطة الرئيسية', 'الشركاء الرئيسيون', 'هيكل التكاليف'],
      when: 'عند إطلاق منتج جديد، إعادة هيكلة شركة قائمة، أو شرح فكرة استثمارية بسرعة لمستثمر.',
      example: 'تستخدم آلاف الشركات الناشئة Canvas لاختبار افتراضاتها قبل البناء — Airbnb طوّرت نموذجها على Canvas يصف شريحتين (مضيف ومسافر) وقيمة لكل منهما.',
      pitfall: 'Canvas لقطة لحظية وليس استراتيجية — يحتاج اختبار افتراضات الميدان قبل الاعتماد عليه.',
      references: ['Osterwalder & Pigneur (2010) — Business Model Generation', 'Strategyzer.com'] },

    { keys: ['lean startup', 'لين ستارت اب', 'ريادي', 'mvp', 'منتج اولي'],
      title: 'Lean Startup — منهج الشركات الناشئة الرشيقة',
      definition: 'منهج طوّره Eric Ries عام 2011 لبناء شركات ناشئة عبر دورات سريعة من بناء-قياس-تعلم (Build-Measure-Learn) لتجنّب بناء ما لا يريده السوق.',
      components: ['MVP — أبسط منتج قابل للاختبار', 'Validated Learning — تعلم مدعوم بالبيانات لا الحدس', 'Build-Measure-Learn loop', 'Pivot or Persevere — قرار تغيير المسار أو الاستمرار'],
      when: 'حين تواجه شك كبير حول ما يريده السوق فعلاً — مناسب لأي منتج/خدمة جديدة بدرجة عدم يقين عالية.',
      example: 'بنت Dropbox فيديو MVP بدل تطبيق فعلي لاختبار الطلب — انتقل تسجيلهم من 5,000 لـ 75,000 في ليلة، فأكدوا الفرضية قبل بناء التقنية.',
      pitfall: 'MVP رديء يُحرق ثقة المستخدم — "أبسط" لا تعني "غير صالح" وإلا أصبح التعلم سلبياً.',
      references: ['Ries, E. (2011) — The Lean Startup', 'HBR — Why the Lean Start-Up Changes Everything'] },

    { keys: ['agile', 'سكرم', 'scrum', 'كانبان', 'kanban', 'رشيق'],
      title: 'Agile / Scrum / Kanban — أطر العمل الرشيقة',
      definition: 'فلسفة تطوير ظهرت في 2001 (Agile Manifesto) تركّز على التسليم التدريجي السريع، التكيّف مع التغيير، والتعاون عبر دورات قصيرة بدل خطط طويلة جامدة.',
      components: ['Sprints — دورات 1-4 أسابيع', 'Daily Standups — اجتماع يومي 15 دقيقة', 'Product Backlog — قائمة العمل المرتبة', 'Retrospectives — تعلم مستمر بعد كل دورة', 'Kanban Board — لوحة لتدفّق العمل البصري'],
      when: 'مثالي لتطوير البرمجيات والمنتجات الرقمية ومشاريع عدم اليقين العالي. توسّع لاحقاً للتسويق والـ HR.',
      example: 'حوّلت ING البنك الهولندي 9 آلاف موظف لـ Agile بـ"قبائل" و"فصائل"، فاختصرت زمن إطلاق المنتجات من أشهر إلى أسابيع.',
      pitfall: 'Agile بلا انضباط يتحوّل لفوضى — احترام الطقوس (standups, sprints, retros) ضروري حتى لو بدت بيروقراطية.',
      references: ['Agile Manifesto (2001)', 'Sutherland & Schwaber — Scrum Guide'] },

    { keys: ['digital transformation', 'التحول الرقمي', 'تحول رقمي'],
      title: 'التحول الرقمي — Digital Transformation',
      definition: 'إعادة تشكيل جذرية للأعمال عبر الدمج العميق للتقنيات الرقمية في كل المجالات، بهدف تغيير طريقة العمل وتقديم القيمة للعميل.',
      components: ['تحديث البنية التحتية (السحابة)', 'رقمنة العمليات والأتمتة', 'استراتيجية بيانات وذكاء اصطناعي', 'تجربة عميل رقمية متكاملة', 'تغيير الثقافة وتطوير المهارات'],
      when: 'عند تهديد قطاعك من منافسين رقميين، أو تراجع تجربة العميل مقارنة بالمعايير الحديثة.',
      example: 'حوّل Domino\'s نفسه من سلسلة بيتزا إلى "شركة تقنية تبيع بيتزا" — تطبيقها يجلب 70% من الطلبات وأسهمها تضاعفت 50 مرة منذ 2010.',
      pitfall: '70% من مبادرات التحول الرقمي تفشل — السبب الأكبر تجاهل الجانب الإنساني والثقافي وليس التقني.',
      references: ['McKinsey — Unlocking Success in Digital Transformations', 'MIT Sloan Review'] },

    { keys: ['customer journey', 'رحله العميل'],
      title: 'رحلة العميل — Customer Journey',
      definition: 'تصوّر شامل لكل تفاعلات العميل مع علامتك عبر مراحل الوعي، الاهتمام، التقييم، الشراء، الاستخدام، والولاء.',
      components: ['Awareness — وعي العميل بالمشكلة والحلول', 'Consideration — تقييم البدائل', 'Decision — قرار الشراء', 'Retention — الاستخدام والاحتفاظ', 'Advocacy — التوصية والإحالة'],
      when: 'لتحديد نقاط الألم في تجربة العميل وتحسين التحويل والاحتفاظ — قبل أي حملة CX أو تحسين منتج.',
      example: 'رسمت Disney رحلة زائر منتزهاتها من حجز الفندق للعودة، فابتكرت MagicBand التي ألغت 90% من نقاط الاحتكاك ورفعت الإنفاق 8%.',
      pitfall: 'رحلة بناءها فريق التسويق فقط دون عمليات وخدمة عملاء تبقى نظرية — يجب وضع الفريق الكامل حولها.',
      references: ['Lemon & Verhoef (2016) — Journal of Marketing', 'HBR — Designing Customer Journeys'] },

    { keys: ['4p', '4ps', 'mix', 'مزيج تسويقي'],
      title: 'المزيج التسويقي 4Ps — Marketing Mix',
      definition: 'إطار طوّره E. Jerome McCarthy عام 1960 يصف الأدوات الأربع التي تتحكم بها الشركة لتقديم منتجها للسوق المستهدف: المنتج، السعر، المكان، الترويج.',
      components: ['Product — ميزات، جودة، تصميم، علامة', 'Price — استراتيجية تسعير، خصومات، شروط', 'Place — قنوات التوزيع والوصول', 'Promotion — إعلان، علاقات عامة، مبيعات، رقمي'],
      when: 'كإطار تخطيط لأي حملة أو إطلاق منتج، أو لتشخيص ضعف أداء منتج قائم.',
      example: 'حقّق iPhone توازناً عبقرياً في 4Ps: منتج متفوّق، سعر بريميوم، توزيع عبر Apple Stores، ترويج إعلاني ضخم وكلام شفهي.',
      pitfall: 'الإطار يركّز على المنتج وليس العميل — Lauterborn اقترح 4Cs بدل 4Ps (Customer, Cost, Convenience, Communication).',
      references: ['McCarthy (1960) — Basic Marketing', 'Kotler — Marketing Management'] },

    { keys: ['stp', 'تجزءه', 'استهداف', 'positioning', 'تموقع'],
      title: 'STP — التجزئة والاستهداف والتموضع',
      definition: 'منهج التسويق الأكثر استخداماً لاختيار من نخدم وكيف نتميّز — Segmentation, Targeting, Positioning.',
      components: ['Segmentation — تقسيم السوق لشرائح متجانسة', 'Targeting — اختيار الشرائح الأكثر جاذبية', 'Positioning — تثبيت صورة فريدة في ذهن العميل'],
      when: 'في بداية أي استراتيجية تسويق جديدة، عند إطلاق منتج، أو إعادة إطلاق علامة باهتة.',
      example: 'قسّمت Volvo سوق السيارات وفقاً للأمان، استهدفت العائلات الواعية، وثبّتت نفسها كـ"أأمن سيارة في العالم" — أصبح الأمان مرادفاً لاسمها.',
      pitfall: 'استهداف شرائح صغيرة جداً يحدّ من نموك — يجب موازنة التركيز والحجم.',
      references: ['Kotler (1980) — Marketing Management', 'Ries & Trout — Positioning'] },

    { keys: ['npv', 'irr', 'صافي القيمه الحاليه', 'معدل العاءد الداخلي'],
      title: 'NPV / IRR — صافي القيمة الحالية ومعدل العائد الداخلي',
      definition: 'مقياسان أساسيان لتقييم جدوى الاستثمار: NPV قيمة المشروع اليوم بعد خصم التدفقات المستقبلية، IRR معدل الخصم الذي يجعل NPV صفراً.',
      components: ['Cash Flows — تدفقات نقدية مستقبلية', 'Discount Rate — معدل خصم يعكس المخاطرة والوقت', 'NPV > 0 → مشروع مجدٍ', 'IRR > WACC → مشروع مجدٍ'],
      when: 'لأي قرار استثماري كبير: مشروع رأسمالي، اقتناء شركة، إطلاق منتج، توسّع جغرافي.',
      example: 'مشروع يحتاج 1M$ ويولّد 300K$ سنوياً لـ 5 سنوات بخصم 10% = NPV 137K$ → مجدٍ. IRR ≈ 15% > WACC 10% → نفس النتيجة.',
      pitfall: 'الحساسية لمعدل الخصم — تغيير 2% قد يقلب القرار. ينبغي إجراء تحليل حساسية دائماً.',
      references: ['Brealey, Myers — Principles of Corporate Finance', 'CFA Institute Curriculum'] },

    { keys: ['roi', 'العاءد علي الاستثمار', 'ebitda'],
      title: 'ROI / EBITDA — مؤشرات الربحية الأساسية',
      definition: 'ROI نسبة العائد المالي للاستثمار، EBITDA الأرباح قبل الفائدة والضرائب والاستهلاك — مقياس صحة العمليات التشغيلية.',
      components: ['ROI = (الربح - التكلفة) / التكلفة × 100%', 'EBITDA = الإيراد - تكلفة البضاعة - مصاريف تشغيل', 'EBITDA Margin = EBITDA / الإيراد', 'يُستخدمان لمقارنة شركات متباينة الهيكل'],
      when: 'لتقييم سريع لمشاريع تسويقية (ROI) أو لمقارنة كفاءة شركات مختلفة الحجم والقطاع (EBITDA).',
      example: 'حملة TikTok بـ 50K$ جلبت مبيعات 200K$ → ROI = 300%. شركة بإيراد 100M وEBITDA 25M → هامش 25%، مؤشر صحة جيد.',
      pitfall: 'ROI يهمل الزمن وEBITDA يخفي عبء الديون — يجب استخدامهما مع NPV وCash Flow لصورة كاملة.',
      references: ['CFA Institute', 'Harvard Business School Case Studies'] },

    { keys: ['cash flow', 'cashflow', 'التدفق النقدي', 'تدفق نقدي', 'كاش فلو', 'سيوله', 'سيولة'],
      title: 'التدفق النقدي — Cash Flow',
      definition: 'حركة الأموال داخل وخارج الشركة، أهم مؤشر على صحتها المالية الحقيقية أكثر من الأرباح المحاسبية. "Cash is King".',
      components: ['تدفق تشغيلي — من العمليات الرئيسية', 'تدفق استثماري — شراء/بيع أصول', 'تدفق تمويلي — قروض وأسهم', 'Free Cash Flow = تشغيلي - استثمار رأسمالي'],
      when: 'يجب مراقبته أسبوعياً في الشركات الناشئة وشهرياً في الكبيرة. حاسم للحكم على القدرة على البقاء قبل الربحية.',
      example: 'أفلست Toys "R" Us رغم أرباحها لأن تدفقها النقدي غطّى ديونها فقط، فعجزت عن الاستثمار في رقمنة قبل Amazon.',
      pitfall: 'الشركة قد تكون "مربحة على الورق" لكن تموت من نقص السيولة — Revenue is vanity, profit is sanity, cash is reality.',
      references: ['Investopedia — Cash Flow Statement', 'IFRS Standards IAS 7'] },

    { keys: ['supply chain', 'سلسله التوريد', 'لوجستي'],
      title: 'إدارة سلسلة التوريد — Supply Chain Management',
      definition: 'تخطيط وتنفيذ تدفق المواد والمعلومات والأموال من المورد الأول إلى المستهلك النهائي بأكفأ شكل ممكن.',
      components: ['Plan — تخطيط الطلب والمخزون', 'Source — اختيار الموردين والتوريد', 'Make — التصنيع والإنتاج', 'Deliver — التوزيع واللوجستيات', 'Return — العودة والاستدامة (SCOR Model)'],
      when: 'حين تمثّل تكاليف السلسلة 50%+ من إيرادك، أو حين تكون موثوقية التوريد ميزتك التنافسية.',
      example: 'بنت Zara ميزة عبر سلسلة فائقة المرونة — تصمّم وتنتج وتشحن في 15 يوماً بدل 6 أشهر للمنافسين، فتلتقط الموضة لحظة ظهورها.',
      pitfall: 'تحسين السلسلة على الكفاءة فقط (Just-In-Time) يجعلها هشّة كما اكتشفت السوق بعد كوفيد 2020.',
      references: ['APICS SCOR Model', 'Chopra & Meindl — Supply Chain Management'] },

    { keys: ['servant', 'القياده الخادمه', 'servant leadership'],
      title: 'القيادة الخادمة — Servant Leadership',
      definition: 'فلسفة طرحها Robert Greenleaf عام 1970 تقلب الهرم — القائد يخدم الفريق ليتمكنوا من خدمة العميل، بدل أن يخدم الفريق رغبات القائد.',
      components: ['Listen — استماع نشط للفريق', 'Empathy — تفهّم معاناة الآخرين', 'Stewardship — إدارة الموارد بأمانة', 'Commitment to Growth — تطوير الفريق', 'Building Community — بناء الشعور الجماعي'],
      when: 'فعّالة في فرق المعرفة العالية، الشركات سريعة التغيّر، والمؤسسات ذات الرسالة الواضحة.',
      example: 'بنى Herb Kelleher نجاح Southwest Airlines على القيادة الخادمة — قال "موظفونا أولاً، عملاؤنا ثانياً، مساهمونا ثالثاً" فأصبحت أنجح شركة طيران تاريخياً.',
      pitfall: 'سوء فهمها كـ"ضعف" يخلق فوضى — القائد الخادم حازم في المعايير، مرن في الأسلوب.',
      references: ['Greenleaf (1970) — Servant Leadership', 'Sinek — Leaders Eat Last'] },

    { keys: ['emotional intelligence', 'الذكاء العاطفي', 'eq', 'ei'],
      title: 'الذكاء العاطفي — Emotional Intelligence (EI)',
      definition: 'القدرة على إدراك وفهم وإدارة عواطفك وعواطف الآخرين، وقد أثبتت الأبحاث أنه أهم من IQ للنجاح القيادي. Daniel Goleman، 1995.',
      components: ['Self-Awareness — وعي ذاتي', 'Self-Regulation — تنظيم ذاتي', 'Motivation — تحفيز داخلي', 'Empathy — تعاطف مع الآخرين', 'Social Skills — مهارات اجتماعية'],
      when: 'يحتاجه كل من يقود فريقاً أو يفاوض أو يواجه ضغطاً عالياً — مهارة قابلة للتطوير في أي عمر.',
      example: 'وجدت دراسة Google في "Project Oxygen" أن الذكاء العاطفي يتفوّق على الذكاء التقني في صنع المديرين الناجحين.',
      pitfall: 'الذكاء العاطفي ليس "حسن النية" بل أداة قوية يمكن استخدامها للتلاعب — يحتاج قيماً أخلاقية كأرضية.',
      references: ['Goleman (1995) — Emotional Intelligence', 'HBR — What Makes a Leader?'] },

    { keys: ['conflict', 'حل النزاع', 'النزاعات'],
      title: 'حل النزاع — Conflict Resolution',
      definition: 'مجموعة مهارات لتحويل الخلاف من معركة إلى فرصة تطوير، بدل تجنبه (يتراكم) أو السيطرة عليه (يتفجر).',
      components: ['Avoiding — تجنب (للمعارك الصغيرة)', 'Accommodating — تنازل (لمصلحة العلاقة)', 'Competing — منافسة (للأمور الحرجة)', 'Compromising — وسط (للحلول السريعة)', 'Collaborating — تعاون (للحلول الكبيرة، Win-Win)'],
      when: 'حين يصبح الخلاف يؤثر على الإنتاجية أو علاقات الفريق أو جودة القرار.',
      example: 'استخدم Nelson Mandela نموذج Collaboration بعد التفرقة العنصرية — جمع المتخاصمين حول هدف مشترك (لجنة الحقيقة) بدل عقاب جماعي.',
      pitfall: 'حل النزاع بسرعة دون فهم الجذور يكرّر الانفجار — السرعة عدوّ الحل الجذري.',
      references: ['Thomas-Kilmann Conflict Model', 'Fisher & Ury — Getting to Yes'] },

    { keys: ['decision', 'صنع القرار', 'القرارات'],
      title: 'اتخاذ القرار — Decision Making',
      definition: 'عملية اختيار من بدائل متعددة، تتأثّر بالعقل والعاطفة والسياق. القرارات الجيدة عملية وليست نتيجة فقط.',
      components: ['Frame the problem — تأطير المشكلة بدقة', 'Generate alternatives — توليد بدائل متعددة', 'Evaluate — تقييم البدائل بمعايير واضحة', 'Decide — اختيار البديل الأمثل', 'Review — مراجعة بعد التنفيذ والتعلم'],
      when: 'منهجية للقرارات الكبيرة (Type 1 — لا يمكن التراجع). القرارات الصغيرة (Type 2) تحتاج سرعة أكثر من دقة.',
      example: 'يستخدم Jeff Bezos قاعدة "70% information" — إذا انتظرت 90% ستكون متأخراً. وقاعدة "Disagree and Commit" بعد القرار.',
      pitfall: 'Analysis Paralysis — تأجيل القرار خوفاً من الخطأ يكلّف أكثر من قرار غير مثالي.',
      references: ['Kahneman — Thinking, Fast and Slow', 'HBR — A Brief History of Decision Making'] },

    { keys: ['risk', 'المخاطر', 'اداره المخاطر'],
      title: 'إدارة المخاطر — Risk Management',
      definition: 'منهج لتحديد وتقييم ومعالجة المخاطر التي قد تؤثّر على أهداف المؤسسة — تشغيلية ومالية واستراتيجية وامتثال.',
      components: ['Identify — تحديد المخاطر المحتملة', 'Assess — تقييم احتمالية وأثر كل خطر', 'Mitigate — تجنّب/تقليل/نقل/قبول', 'Monitor — مراقبة مستمرة', 'Report — إبلاغ المعنيين'],
      when: 'دائماً، لكن بشكل خاص قبل قرارات استراتيجية كبرى، توسّع جغرافي، أو إطلاق منتج جديد.',
      example: 'تجاهلت Boeing مخاطر MCAS في 737 MAX لخفض التكاليف، فحدث حادثتان قاتلتان كلّفتا الشركة 60 مليار دولار وسمعتها لعقود.',
      pitfall: 'إدارة المخاطر كقائمة شطب امتثال بدل ثقافة حية تجعلها بلا قيمة — يجب أن تكون جزءاً من كل قرار.',
      references: ['ISO 31000 — Risk Management', 'COSO ERM Framework'] },

    { keys: ['esg', 'الاستدامه', 'حوكمه'],
      title: 'ESG — البيئة والمجتمع والحوكمة',
      definition: 'إطار لقياس أداء الشركة في ثلاثة أبعاد: البيئة (Environmental)، المجتمع (Social)، والحوكمة (Governance). أصبح معياراً للمستثمرين والتنظيم.',
      components: ['E — انبعاثات، طاقة، نفايات، مياه', 'S — حقوق العمال، التنوع، علاقات المجتمع', 'G — مجلس الإدارة، الشفافية، مكافحة الفساد', 'Materiality — تحديد ما يهم لأصحاب المصلحة'],
      when: 'إجباري للشركات المدرجة كبيرة، وأصبح ميزة تنافسية للوصول للتمويل والمواهب.',
      example: 'تستهدف Microsoft أن تكون Carbon Negative بحلول 2030 — استثمرت مليار دولار في Climate Fund وأصبحت معياراً للشركات.',
      pitfall: 'الـ Greenwashing (المبالغة البيئية) يُحدث ضرراً سمعياً وقانونياً ضخماً عند انكشافه — الإفصاحات الحقيقية أهم من الادعاءات.',
      references: ['GRI Standards', 'TCFD', 'SASB Framework'] },

    { keys: ['ai strategy', 'استراتيجيه الذكاء', 'تبني الذكاء'],
      title: 'استراتيجية الذكاء الاصطناعي — AI Strategy',
      definition: 'منهج تبني الـ AI بشكل منظم في المؤسسة، يبدأ من حالات الاستخدام (Use Cases) وينتهي بإعادة هندسة العمليات والثقافة.',
      components: ['Use Case Discovery — كشف الفرص', 'Data Readiness — جاهزية البيانات', 'Talent & Tools — الكفاءات والأدوات', 'Pilot → Scale — تجربة ثم توسيع', 'Governance — حوكمة أخلاقية للنماذج'],
      when: 'فوراً — كل شركة بحاجة لاستراتيجية AI واضحة قبل 2027 لتجنّب الانقراض الرقمي.',
      example: 'أعلنت Klarna استبدال نصف فريق التسويق وخدمة العملاء بـ AI — وفّرت 100 مليون دولار سنوياً وحسّنت سرعة الخدمة 4 أضعاف.',
      pitfall: 'دمج AI دون بيانات نظيفة كبيرة يفشل — "Garbage in, garbage out". 70% من مشاريع AI تفشل بسبب جودة البيانات.',
      references: ['McKinsey — State of AI 2024', 'HBR — Competing in the Age of AI'] },

    { keys: ['negotiation', 'التفاوض', 'مفاوضات'],
      title: 'التفاوض — Negotiation',
      definition: 'فن وعلم الوصول لاتفاق يخدم الطرفين عبر فهم المصالح (لا المواقف) والبدائل، بدل الجدال والتنازل المتبادل.',
      components: ['BATNA — أفضل بديل لاتفاق متفاوض عليه', 'ZOPA — نطاق الاتفاق المحتمل', 'Interests vs Positions — المصالح وراء المواقف', 'Anchoring — العرض الأول يحدد المحادثة', 'Win-Win — حلول إبداعية لكلا الطرفين'],
      when: 'في كل قرار يتطلب موافقة طرف آخر — رواتب، عقود، شراكات، تخصيص موارد داخل الشركة.',
      example: 'في تفاوض السلام بين مصر وإسرائيل في كامب ديفيد، اكتشف المفاوضون أن مصر تريد السيادة وإسرائيل تريد الأمن — حلّت سيناء منزوعة السلاح كلا المصلحتين.',
      pitfall: 'التفاوض الصلب (Hard Bargaining) يحرق العلاقات — في الصفقات المتكررة يخسر أكثر مما يكسب.',
      references: ['Fisher & Ury — Getting to Yes', 'Voss — Never Split the Difference'] },

    { keys: ['eisenhower', 'اداره الوقت', 'مصفوفه ايزنهاور', 'pomodoro'],
      title: 'إدارة الوقت — Eisenhower Matrix & Productivity',
      definition: 'مجموعة أدوات لإدارة الوقت بفعالية — مصفوفة Eisenhower لتحديد الأولويات، تقنية Pomodoro للتركيز، ومنهج Deep Work للإنجاز الكبير.',
      components: ['Quadrant 1 — عاجل ومهم (افعل)', 'Quadrant 2 — مهم وليس عاجل (خطّط)', 'Quadrant 3 — عاجل وليس مهم (فوّض)', 'Quadrant 4 — ليس عاجلاً ولا مهماً (احذف)', 'Pomodoro — 25 دقيقة تركيز + 5 راحة'],
      when: 'يومياً، خصوصاً عند الإحساس بالغرق في المهام أو تراجع الإنتاجية.',
      example: 'يخصّص Bill Gates "Think Weeks" مرتين سنوياً لـDeep Work — يقرأ ويفكّر بمعزل عن الجميع. خرجت منها قرارات تأسيس Microsoft الكبرى.',
      pitfall: 'قضاء كل الوقت في Quadrant 1 (إطفاء حرائق) يمنعك من Quadrant 2 (الاستراتيجي) وتدخل دوامة لا تنتهي.',
      references: ['Covey — 7 Habits of Highly Effective People', 'Newport — Deep Work'] },

    { keys: ['talent', 'المواهب', 'اداره المواهب'],
      title: 'إدارة المواهب — Talent Management',
      definition: 'منهج متكامل لاجتذاب، تطوير، تحفيز، والاحتفاظ بالمواهب الحرجة في المؤسسة عبر دورة حياة الموظف كاملة.',
      components: ['Attract — جذب المواهب', 'Onboard — تأهيل واندماج', 'Develop — تطوير المهارات والقيادات', 'Engage — التحفيز والمشاركة', 'Retain — الاحتفاظ والتقدير', '9-Box Grid لتقييم الأداء والإمكانات'],
      when: 'استمراراً، مع تركيز خاص في أوقات النمو السريع أو موجات الاستقالات أو التحولات الكبرى.',
      example: 'تستثمر General Electric تاريخياً مليار دولار سنوياً في تطوير المواهب — وأصبح خرّيجو "Crotonville" مدراء تنفيذيين في عشرات الشركات.',
      pitfall: 'التركيز على نجوم (Top 10%) فقط يُحبط الأغلبية الصلبة (Middle 80%) — يجب الاستثمار في كل الطبقات.',
      references: ['McKinsey — War for Talent', 'Charan, Drotter — The Leadership Pipeline'] },

    { keys: ['kpi', 'kpis', 'مؤشرات الاداء', 'مؤشر اداء', 'كي بي اي'],
      title: 'مؤشرات الأداء الرئيسية — KPIs',
      definition: 'مقاييس قابلة للقياس تعكس مدى تحقيق المؤسسة لأهدافها الاستراتيجية. KPI الفعّال يكون مرتبطاً بالنتائج، محدداً، وقابلاً للتأثير.',
      components: ['KPIs المالية — الإيراد، الهامش، Cash Flow', 'KPIs العملاء — NPS، CSAT، Churn، CAC، LTV', 'KPIs العمليات — السرعة، الجودة، الكفاءة', 'KPIs الموظفين — eNPS، Retention، Engagement', 'Leading vs Lagging — مؤشرات استباقية vs ناتجة'],
      when: 'لكل مستوى إداري — قمة الهرم تتابع KPIs استراتيجية، والأقسام تتابع تشغيلية. الأهم: لا تقس ما لا يمكنك إدارته.',
      example: 'تتابع Amazon أكثر من 500 KPI لكنها تركّز على واحد كبير: "Long-Term Cash Flow per Share" — كل قرار يُقاس بأثره على هذا المؤشر.',
      pitfall: 'كثرة المؤشرات تشتت التركيز — قاعدة "ركز على 3-5 KPIs لكل مستوى". وحذار التلاعب: المؤشر الذي تكافئ عليه يُتلاعب به.',
      references: ['Parmenter — Key Performance Indicators', 'Kaplan & Norton — Balanced Scorecard'] },

    { keys: ['innovation', 'الابتكار', 'اداره الابتكار', 'innovation management'],
      title: 'إدارة الابتكار — Innovation Management',
      definition: 'منهج لتحويل الأفكار إلى قيمة، عبر إدارة Innovation Funnel من الإلهام إلى الأثر، وموازنة الاستكشاف مع الاستغلال.',
      components: ['Idea Generation — مولّدات أفكار منتظمة', 'Filtering — تصفية وفرز', 'Prototyping — نماذج أولية', 'Testing — اختبار في السوق', 'Scaling — توسيع الناجح', 'Killing — قتل الفاشل بسرعة'],
      when: 'كل شركة في كل قطاع — Innovate or die. مع تسارع التغيّر أصبح الابتكار شرط بقاء وليس ترفاً.',
      example: 'تخصّص Google 20% من وقت موظفيها للمشاريع الجانبية — منها خرجت Gmail وAdSense وGoogle News.',
      pitfall: 'الفصل بين فرق الابتكار وفرق العمل اليومي يخلق "أبراج عاجية" — الأفكار لا تصل للسوق.',
      references: ['Christensen — The Innovator\'s Dilemma', 'Govindarajan — The Other Side of Innovation'] }
];

// --- كشف نية السؤال ---
function detectIntent(q) {
    if (/(ما هو|ما هي|تعريف|عرف|definition|what is|اعطني تعريف)/.test(q)) return 'definition';
    if (/(مثال|examples|اعطني مثل|مثل|case study|دراسه حاله)/.test(q)) return 'example';
    if (/(كيف|how|اشرح كيف|طريقه)/.test(q)) return 'howto';
    if (/(مقارنه|الفرق بين|vs|مقابل|compare|اقارن)/.test(q)) return 'comparison';
    if (/(لماذا|why|اسباب|سبب)/.test(q)) return 'why';
    if (/(متي|when|في اي وقت|توقيت)/.test(q)) return 'when';
    return 'general';
}

// --- أسماء عربية شائعة لأدوات إنجليزية ---
const toolArabicAliases = {
    'SWOT Analysis': ['سوات', 'تحليل سوات'],
    'Balanced Scorecard': ['بطاقه الاداء', 'سكوركارد', 'bsc'],
    'OKRs': ['اوكر', 'اهداف ونتاءج', 'okr'],
    'Six Sigma': ['سيكس سيجما', 'سته سيجما', 'سيكس سيغما'],
    'Lean Management': ['لين', 'اداره رشيقه'],
    'ERP Systems': ['اي ار بي', 'تخطيط موارد'],
    'CRM Software': ['سي ار ام', 'اداره العملاء'],
    'Data Analytics': ['تحليل بيانات', 'انالتكس'],
    'AI Automation': ['اتمته', 'ذكاء اصطناعي', 'الذكاء الاصطناعي'],
    'Change Management': ['اداره التغيير'],
    'QuickBooks': ['كويك بوكس', 'كويكبوكس'],
    'SAP ERP': ['ساب'],
    'Power BI': ['باور بي اي', 'باوربي'],
    'Blockchain Ledger': ['بلوكتشين محاسبي'],
    'RPA Accounting': ['اتمته محاسبيه', 'rpa'],
    'Cloud Accounting': ['محاسبه سحابيه'],
    'AI Audit': ['تدقيق ذكي', 'تدقيق بالذكاء'],
    'XBRL': ['اكس بي ار ال'],
    'Forensic Accounting': ['محاسبه جناءيه'],
    'ESG Reporting': ['تقارير استدامه', 'تقارير esg'],
    'Workday': ['وورك داي', 'ووركداي'],
    'BambooHR': ['بامبو', 'بامبو اتش ار'],
    'Greenhouse': ['جرين هاوس', 'غرين هاوس'],
    'Lattice': ['لاتيس'],
    'People Analytics': ['تحليلات الموظفين'],
    'AI Recruitment': ['توظيف ذكي', 'توظيف بالذكاء'],
    'Employee Engagement': ['مشاركه الموظفين', 'انغيجمنت'],
    'Learning Management': ['اداره التعلم', 'lms', 'ال ام اس'],
    'HR Chatbots': ['شات بوت موارد بشريه'],
    'Google Analytics 4': ['جوجل انالتكس', 'جوجل تحليلات', 'ga4'],
    'SEMrush': ['سيم رش'],
    'HubSpot': ['هاب سبوت', 'هابسبوت'],
    'Meta Ads': ['ميتا', 'فيسبوك ادز', 'اعلانات فيسبوك'],
    'TikTok Ads': ['تيك توك', 'اعلانات تيك توك'],
    'Content Marketing': ['تسويق محتوي', 'محتوي'],
    'Influencer Marketing': ['تسويق بالمؤثرين', 'مؤثرين'],
    'Email Automation': ['اتمته ايميل', 'ايميل ماركتنج'],
    'Social Listening': ['استماع اجتماعي'],
    'Marketing Attribution': ['نسبه تسويقيه', 'اتربيوشن'],
    'Blockchain': ['بلوكتشين', 'البلوكتشين', 'سلسله الكتل'],
    'Digital Wallets': ['محافظ رقميه', 'محفظه رقميه'],
    'Robo-Advisors': ['روبو ادفايزر', 'استشارات اليه'],
    'Peer-to-Peer Lending': ['اقراض p2p', 'p2p'],
    'InsurTech': ['انشورتك', 'تكنولوجيا تامين'],
    'RegTech': ['ريجتك', 'تكنولوجيا امتثال'],
    'Open Banking': ['بنوك مفتوحه', 'اوبن بانكنج'],
    'AI Trading': ['تداول ذكي', 'تداول بالذكاء'],
    'Embedded Finance': ['تمويل مدمج'],
    'CBDC': ['عمله رقميه مركزيه', 'سي بي دي سي'],
    'Oracle DB': ['اوراكل', 'اوراكل ديتابيس'],
    'Tableau': ['تابلو', 'تابلوه'],
    'Python Data': ['بايثون', 'بايثون بيانات'],
    'SQL': ['اس كيو ال', 'لغه استعلام'],
    'Cloud Computing': ['حوسبه سحابيه', 'aws', 'azure'],
    'Cybersecurity': ['امن سيبراني', 'سايبر سيكيوريتي'],
    'IoT Systems': ['انترنت الاشياء', 'اي او تي', 'iot'],
    'AI Integration': ['دمج الذكاء', 'تكامل ذكاء اصطناعي'],
    'WMS': ['اداره مستودعات', 'وي ام اس'],
    'TMS': ['اداره النقل', 'تي ام اس'],
    'RFID': ['ار اف اي دي', 'تتبع راديوي'],
    'IoT Tracking': ['تتبع اي او تي'],
    'Predictive Analytics': ['تحليل تنبؤي', 'تنبؤ'],
    'Blockchain SCM': ['بلوكتشين سلاسل'],
    'AI Forecasting': ['تنبؤ ذكي'],
    'Cross-docking': ['كروس دوكنج', 'تحميل متقاطع'],
    'Last Mile Delivery': ['توصيل ميل اخير', 'لاست مايل'],
    'Sustainability SCM': ['استدامه سلاسل توريد']
};

// --- مطابقة الأدوات (70 أداة) مع دعم الأسماء العربية ---
function findInTools(q) {
    const qStripped = q.replace(/(^|\s)ال/g, '$1'); // إزالة 'ال' التعريف
    let best = null, bestScore = 0;
    for (const [specId, tools] of Object.entries(toolsData)) {
        for (const tool of tools) {
            if (tool.hidden) continue;   // hidden by the owner (Content Studio) — keeps its index, but is not offered
            const nameN = normalizeAr(tool.name);
            const descN = normalizeAr(tool.desc);
            const aliases = (toolArabicAliases[tool.name] || []).map(a => normalizeAr(a));
            let score = 0;
            const checks = [q, qStripped];
            for (const query of checks) {
                if (query.includes(nameN)) score = Math.max(score, 10);
                if (nameN.split(' ').some(w => w.length > 2 && query.includes(w))) score = Math.max(score, 4);
                if (descN && query.includes(descN.slice(0, Math.min(15, descN.length)))) score = Math.max(score, 6);
                if (descN.split(' ').filter(w => w.length > 3).some(w => query.includes(w))) score = Math.max(score, 2);
                for (const a of aliases) {
                    if (a && query.includes(a)) score = Math.max(score, 9);
                }
            }
            if (score > bestScore) { bestScore = score; best = { tool, specId }; }
        }
    }
    return bestScore >= 4 ? best : null;
}

// --- مطابقة قاعدة المعرفة ---
function findInKB(q) {
    let best = null, bestScore = 0;
    for (const entry of aiKnowledge) {
        for (const key of entry.keys) {
            const keyN = normalizeAr(key);
            if (q.includes(keyN)) {
                const score = keyN.length;
                if (score > bestScore) { bestScore = score; best = entry; }
            }
        }
    }
    return best;
}

// --- مطابقة التخصصات ---
function findInSpecialties(q) {
    const map = {
        'business': ['اعمال', 'اداره الاعمال', 'business management'],
        'accounting': ['محاسبه', 'حسابات', 'accounting'],
        'hr': ['موارد بشريه', 'موظفين', 'hr'],
        'marketing': ['تسويق', 'marketing', 'ديجيتال ماركتنج'],
        'fintech': ['تمويل', 'فنتك', 'fintech', 'تكنولوجيا ماليه'],
        'mis': ['نظم معلومات', 'mis', 'تحليل بيانات'],
        'logistics': ['لوجستي', 'سلاسل توريد', 'logistics', 'مخازن']
    };
    for (const spec of specialties) {
        const aliases = map[spec.id] || [];
        if (aliases.some(a => q.includes(normalizeAr(a))) || q.includes(normalizeAr(spec.name))) {
            return spec;
        }
    }
    return null;
}

// --- مطابقة أنماط القيادة ---
function findLeadershipStyle(q) {
    const styles = [
        { key: 'autocratic', keys: ['اوتوقراطي', 'استبدادي', 'autocratic', 'حازم', 'قيادي مستبد'],
          name: 'القائد الأوتوقراطي', icon: '👑',
          intro: 'يتخذ القرارات وحده ويفرضها بسرعة وحزم. سلطة مركزية ووضوح في المسؤوليات.',
          strengths: ['قرارات سريعة في الأزمات', 'وضوح في المسؤوليات', 'انضباط عالٍ', 'تنفيذ منظم'],
          weaknesses: ['ضعف الابتكار', 'إحباط الفريق طويل المدى', 'فقدان المواهب المستقلة', 'هشاشة عند غياب القائد'],
          when: 'مناسب في الأزمات، البيئات العسكرية، الشركات الصغيرة جداً، عمليات عالية المخاطر.',
          example: 'بنى Steve Jobs Apple بأسلوب أوتوقراطي حازم — أنتج منتجات تاريخية لكن أرهق الفرق.' },
        { key: 'democratic', keys: ['ديمقراطي', 'تشاركي', 'democratic', 'participative'],
          name: 'القائد الديمقراطي', icon: '🤝',
          intro: 'يستشير فريقه قبل القرارات، يبني توافقاً، ويوازن بين السرعة والمشاركة.',
          strengths: ['التزام عالٍ بالقرارات', 'إبداع جماعي', 'تطوير قادة من الصف الثاني', 'بناء ثقافة شفافة'],
          weaknesses: ['بطء في القرارات العاجلة', 'احتمال الجمود إن لم يحسم القائد', 'مسؤولية ضبابية أحياناً'],
          when: 'في فرق المعرفة العالية، الشركات الإبداعية، والمشاريع التي تحتاج تبنّياً عميقاً.',
          example: 'بنى Satya Nadella ثقافة "Listen More" في Microsoft فحوّلها من ثقافة "know-it-all" إلى "learn-it-all" وضاعف قيمتها 10 مرات.' },
        { key: 'transformational', keys: ['تحويلي', 'transformational', 'ملهم'],
          name: 'القائد التحويلي', icon: '🚀',
          intro: 'يلهم الفريق برؤية مستقبلية طموحة، يطوّر قدراتهم، ويحوّل المؤسسة جذرياً.',
          strengths: ['تحفيز استثنائي', 'تطوير القادة', 'قدرة على التغيير الكبير', 'بناء ثقافة قوية'],
          weaknesses: ['قد يهمل التفاصيل التشغيلية', 'يتعب الفريق بسرعة التغيير', 'صعوبة الاستدامة دون نظام'],
          when: 'في التحوّلات الكبيرة، إعادة هيكلة الشركات، إطلاق رؤى طويلة المدى.',
          example: 'قاد Elon Musk Tesla كقائد تحويلي — حوّل قطاع السيارات نحو الكهرباء وحقّق ما اعتبره خبراء مستحيلاً.' },
        { key: 'delegative', keys: ['تفويضي', 'delegative', 'laissez', 'مفوض'],
          name: 'القائد التفويضي', icon: '🎯',
          intro: 'يمنح الفريق صلاحيات كاملة، يثق بخبراتهم، ويتدخّل فقط عند الحاجة الاستراتيجية.',
          strengths: ['تمكين عالٍ للفريق', 'تطوير الاستقلالية', 'سرعة في فرق الخبراء', 'تركيز القائد على الاستراتيجي'],
          weaknesses: ['فقدان الاتجاه إن غاب التواصل', 'احتمال الفوضى في فرق غير ناضجة', 'صعوبة قياس الأداء'],
          when: 'مع فرق خبراء ناضجة، في R&D، فرق الإبداع، والشركات الاستشارية.',
          example: 'يقود Warren Buffett بيركشاير هاثاواي بأسلوب تفويضي صرف — يمنح مديري الشركات التابعة استقلالية كاملة ويراجع الأداء سنوياً فقط.' }
    ];
    for (const s of styles) {
        if (s.keys.some(k => q.includes(normalizeAr(k)))) return s;
    }
    return null;
}

// --- مولّدات ردود منسّقة بـ HTML ---
function fmtTitle(icon, title) {
    return `<div class="ai-title"><i class="fas ${icon}"></i> ${title}</div>`;
}
function fmtSection(icon, title, body) {
    return `<div class="ai-section"><div class="ai-section-title"><i class="fas ${icon}"></i> ${title}</div>${body}</div>`;
}
function fmtList(arr) {
    return `<ul>${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
}

function buildToolAnswer(hit, intent) {
    const t = hit.tool;
    const l = t.learn;
    let body = fmtTitle('fa-tools', `${t.icon} ${t.name} — ${t.desc}`);
    body += `<div class="ai-definition">${l.intro}</div>`;
    if (intent !== 'example') {
        body += fmtSection('fa-key', 'المكونات الأساسية', fmtList(l.points));
        body += fmtSection('fa-bullseye', 'متى تُستخدم', `<p>${l.useCase}</p>`);
        body += fmtSection('fa-gem', 'الفوائد', fmtList(l.benefits));
    }
    body += `<div class="ai-example"><strong>🏢 مثال واقعي:</strong> ${l.example}</div>`;
    body += `<div class="ai-pitfall"><strong>⚠️ تحدٍ شائع:</strong> ${l.pitfall}</div>`;
    return { text: body, references: [`AI University — ${t.name}`, 'Harvard Business Review', 'McKinsey Quarterly'] };
}

function buildKBAnswer(e, intent) {
    let body = fmtTitle('fa-lightbulb', e.title);
    body += `<div class="ai-definition">${e.definition}</div>`;
    if (intent !== 'example') {
        body += fmtSection('fa-key', 'المكونات / كيف يعمل', fmtList(e.components));
        body += fmtSection('fa-bullseye', 'متى يُستخدم', `<p>${e.when}</p>`);
    }
    body += `<div class="ai-example"><strong>🏢 مثال واقعي:</strong> ${e.example}</div>`;
    body += `<div class="ai-pitfall"><strong>⚠️ تحدٍ شائع:</strong> ${e.pitfall}</div>`;
    return { text: body, references: e.references };
}

function buildSpecialtyAnswer(spec, intent) {
    const tools = (toolsData[spec.id] || []).filter(t => !t.hidden);
    let body = fmtTitle('fa-graduation-cap', `${spec.icon} ${spec.name}`);
    body += `<div class="ai-definition">${spec.desc}</div>`;
    body += fmtSection('fa-tools', `الأدوات الـ ${tools.length} الأساسية في ${spec.name}`, fmtList(tools.map(t => `<strong>${t.name}</strong> — ${t.desc}`)));
    body += `<div class="ai-suggestions">${tools.slice(0, 3).map(t => `<span class="ai-suggestion-chip" onclick="askAboutTool('${t.name}')">اسألني عن ${t.name}</span>`).join('')}</div>`;
    return { text: body, references: [`AI University — ${spec.name}`, 'Industry Reports 2024'] };
}

function buildLeadershipAnswer(s, intent) {
    let body = fmtTitle('fa-crown', `${s.icon} ${s.name}`);
    body += `<div class="ai-definition">${s.intro}</div>`;
    body += fmtSection('fa-thumbs-up', 'نقاط القوة', fmtList(s.strengths));
    body += fmtSection('fa-exclamation-circle', 'نقاط الضعف', fmtList(s.weaknesses));
    body += fmtSection('fa-bullseye', 'متى يناسب', `<p>${s.when}</p>`);
    body += `<div class="ai-example"><strong>🏢 مثال واقعي:</strong> ${s.example}</div>`;
    return { text: body, references: ['Goleman — Primal Leadership', 'Bass & Avolio — Transformational Leadership'] };
}

function buildFallback(originalMsg, intent) {
    const suggestions = [
        'ما هو تحليل SWOT؟',
        'كيف أبني استراتيجية تسعير؟',
        'الفرق بين القيادة التحويلية والديمقراطية',
        'مثال على Blue Ocean Strategy',
        'ما هو الـ NPV؟',
        'كيف أحسب ROI؟',
        'ما هي إدارة المخاطر؟',
        'اشرح Agile وScrum'
    ];
    const picked = shuffleArray([...suggestions]).slice(0, 4);
    let body = fmtTitle('fa-robot', 'CEO AI يفكّر معك');
    body += `<div class="ai-definition">
        سؤالك مهم لكن أحتاج لمزيد من التحديد لأقدّم لك أفضل إجابة. أستطيع مساعدتك في:
    </div>`;
    body += fmtSection('fa-list', 'مجالات أتقنها', fmtList([
        '<strong>70 أداة إدارية</strong> عبر 7 تخصصات (SWOT، OKRs، QuickBooks، HubSpot، Blockchain...)',
        '<strong>مفاهيم استراتيجية</strong> (Porter Five Forces، Blue Ocean، BCG Matrix، Business Model Canvas)',
        '<strong>مفاهيم مالية</strong> (NPV، IRR، ROI، EBITDA، Cash Flow)',
        '<strong>قيادة وموارد بشرية</strong> (4 أنماط قيادية، الذكاء العاطفي، إدارة المواهب)',
        '<strong>عمليات حديثة</strong> (Agile، Digital Transformation، AI Strategy، ESG)'
    ]));
    body += `<div class="ai-section"><div class="ai-section-title"><i class="fas fa-magic"></i> اقتراحات قد تهمّك:</div>
        <div class="ai-suggestions">${picked.map(s => `<span class="ai-suggestion-chip" onclick="askQuestion('${s.replace(/'/g, '\\\'')}')">${s}</span>`).join('')}</div>
    </div>`;
    return { text: body, references: ['AI University Simulator Knowledge Base', `${aiKnowledge.length} مفاهيم + 70 أداة`] };
}

// --- Main: مولّد ردود CEO AI ---
function generateAIResponse(message) {
    if (!message || message.trim().length < 2) {
        return { text: '<div class="ai-definition">الرجاء كتابة سؤال أوضح حتى أستطيع مساعدتك.</div>', references: ['CEO AI'] };
    }
    const q = normalizeAr(message);
    const intent = detectIntent(q);
    const tHit = findInTools(q); if (tHit) return buildToolAnswer(tHit, intent);
    const kbHit = findInKB(q); if (kbHit) return buildKBAnswer(kbHit, intent);
    const sHit = findInSpecialties(q); if (sHit) return buildSpecialtyAnswer(sHit, intent);
    const lHit = findLeadershipStyle(q); if (lHit) return buildLeadershipAnswer(lHit, intent);
    return buildFallback(message, intent);
}

// --- Chat history for contextual memory ---
let chatHistory = [];
const CHAT_API_BASE = 'http://127.0.0.1:8002';

// --- Chat UI: إرسال رسالة مع streaming من Claude API ---
function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.insertAdjacentHTML('beforeend', `<div class="message user">${escapeHtml(message)}</div>`);
    input.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // مؤشّر تفكير
    const typingId = 't' + Date.now();
    chatMessages.insertAdjacentHTML('beforeend',
        `<div class="typing-indicator" id="${typingId}"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Try streaming API first, fallback to local
    sendStreamingMessage(message, typingId, chatMessages);
}

async function sendStreamingMessage(message, typingId, chatMessages) {
    try {
        const response = await fetch(`${CHAT_API_BASE}/api/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                history: chatHistory.slice(-20),
                language: document.documentElement.lang === 'en' ? 'en' : 'ar'
            })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Remove typing indicator
        const typing = document.getElementById(typingId);
        if (typing) typing.remove();

        // Create AI message container for streaming
        const aiMsgId = 'ai-' + Date.now();
        chatMessages.insertAdjacentHTML('beforeend', `
            <div class="message ai" id="${aiMsgId}">
                <div class="ai-stream-text"></div>
            </div>
        `);

        const aiMsg = document.getElementById(aiMsgId);
        const textContainer = aiMsg.querySelector('.ai-stream-text');
        let fullText = '';

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'text') {
                        fullText += data.text;
                        textContainer.innerHTML = formatAIResponse(fullText);
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                    } else if (data.type === 'error') {
                        throw new Error(data.error);
                    }
                } catch (parseErr) {
                    if (parseErr.message && !parseErr.message.includes('JSON')) throw parseErr;
                }
            }
        }

        // Save to history for contextual memory
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: fullText });

        // Keep history trimmed
        if (chatHistory.length > 40) chatHistory = chatHistory.slice(-40);

        chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (err) {
        console.warn('Streaming API unavailable, falling back to local:', err.message);
        // Fallback to local generateAIResponse
        const typing = document.getElementById(typingId);
        if (typing) typing.remove();

        const response = generateAIResponse(message);
        chatMessages.insertAdjacentHTML('beforeend', `
            <div class="message ai">
                ${response.text}
                <div class="references">📚 المراجع: ${response.references.join(' • ')}</div>
            </div>
        `);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Still save to history
        chatHistory.push({ role: 'user', content: message });
        chatHistory.push({ role: 'assistant', content: response.text.replace(/<[^>]*>/g, '') });
    }
}

// --- Format markdown-like AI response to HTML ---
function formatAIResponse(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gm, '<h4>$1</h4>')
        .replace(/^## (.*$)/gm, '<h3>$1</h3>')
        .replace(/^- (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        .replace(/<\/ul>\s*<ul>/g, '')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));
}

// --- اختصارات الاقتراحات السريعة ---
function askQuestion(q) {
    const input = document.getElementById('chatInput');
    input.value = q;
    sendMessage();
}
function askAboutTool(name) {
    askQuestion('ما هو ' + name + '؟');
}


// ==================== STARFIELD & PARTICLE ANIMATIONS ====================

function initStarfield(canvasId, density) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let w = 0, h = 0;
    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
        stars = [];
        const count = density || 180;
        for (let i = 0; i < count; i++) {
            stars.push({
                x: (Math.random() - 0.5) * w * 2,
                y: (Math.random() - 0.5) * h * 2,
                z: Math.random() * w,
                pz: 0,
                hue: Math.random() > 0.85 ? (Math.random() > 0.5 ? 195 : 280) : null
            });
        }
    }
    resize();
    window.addEventListener('resize', resize);
    let running = true, raf = 0;
    function frame() {
        if (!running) return;
        ctx.fillStyle = 'rgba(0, 8, 20, 0.25)';
        ctx.fillRect(0, 0, w, h);
        ctx.translate(w / 2, h / 2);
        for (const s of stars) {
            s.pz = s.z;
            s.z -= 1.8;
            if (s.z < 1) {
                s.x = (Math.random() - 0.5) * w * 2;
                s.y = (Math.random() - 0.5) * h * 2;
                s.z = w;
                s.pz = s.z;
            }
            const sx = (s.x / s.z) * w * 0.5;
            const sy = (s.y / s.z) * h * 0.5;
            const px = (s.x / s.pz) * w * 0.5;
            const py = (s.y / s.pz) * h * 0.5;
            const r = Math.max(0.3, (1 - s.z / w) * 1.8);
            const alpha = Math.max(0.2, 1 - s.z / w);
            if (s.hue) {
                ctx.strokeStyle = `hsla(${s.hue}, 100%, 70%, ${alpha})`;
                ctx.fillStyle = `hsla(${s.hue}, 100%, 70%, ${alpha})`;
            } else {
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            }
            ctx.lineWidth = r;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(sx, sy, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        raf = requestAnimationFrame(frame);
    }
    frame();
    // stop() halts the loop, start() resumes it — used by the FX on/off switch (aus_45_fx_mode.js) without a second resize listener.
    return {
        stop: () => { running = false; cancelAnimationFrame(raf); },
        start: () => { if (!running) { running = true; frame(); } }
    };
}

function initIntroParticles() {
    const canvas = document.getElementById('intro-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);

    // Dense star field — 3 depth layers
    const stars = [];
    for (let i = 0; i < 320; i++) {
        const depth = Math.random(); // 0=far, 1=near
        stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * (depth * 0.5 + 0.1),
            vy: (Math.random() - 0.5) * (depth * 0.5 + 0.1),
            r: depth * 1.6 + 0.2,
            hue: Math.random() > 0.6 ? 195 : (Math.random() > 0.5 ? 280 : 50),
            twinkle: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.03 + Math.random() * 0.04,
            bright: depth
        });
    }

    // Shooting star / meteor comets
    const comets = [];
    function spawnComet() {
        comets.push({
            x: Math.random() * w,
            y: -20,
            len: 60 + Math.random() * 160,
            angle: (Math.PI / 4) + (Math.random() - 0.5) * 0.4,
            speed: 6 + Math.random() * 9,
            life: 0,
            maxLife: 80 + Math.random() * 40,
            hue: Math.random() > 0.5 ? 195 : 280
        });
    }
    for (let i = 0; i < 3; i++) spawnComet();

    // Central nebula glow (painted each frame under stars)
    let running = true;
    function frame() {
        if (!running) return;

        // Motion blur trail
        ctx.fillStyle = 'rgba(0, 8, 20, 0.18)';
        ctx.fillRect(0, 0, w, h);

        // Nebula blobs (soft)
        const cx = w / 2, cy = h / 2;
        const grad1 = ctx.createRadialGradient(cx * 0.55, cy * 0.65, 0, cx * 0.55, cy * 0.65, w * 0.38);
        grad1.addColorStop(0, 'rgba(0, 60, 160, 0.06)');
        grad1.addColorStop(1, 'transparent');
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, w, h);

        const grad2 = ctx.createRadialGradient(cx * 1.35, cy * 1.2, 0, cx * 1.35, cy * 1.2, w * 0.3);
        grad2.addColorStop(0, 'rgba(90, 20, 140, 0.05)');
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, w, h);

        // Stars
        for (const p of stars) {
            p.x += p.vx; p.y += p.vy;
            p.twinkle += p.twinkleSpeed;
            if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
            const alpha = 0.35 + p.bright * 0.4 + Math.sin(p.twinkle) * 0.25;
            ctx.fillStyle = `hsla(${p.hue}, 90%, 75%, ${alpha})`;
            ctx.shadowBlur = p.bright > 0.7 ? 10 : 4;
            ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, 0.6)`;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.shadowBlur = 0;

        // Comets / shooting stars
        for (let i = comets.length - 1; i >= 0; i--) {
            const c = comets[i];
            c.x += Math.cos(c.angle) * c.speed;
            c.y += Math.sin(c.angle) * c.speed;
            c.life++;
            const progress = c.life / c.maxLife;
            const alpha = progress < 0.2 ? progress / 0.2 : (1 - progress);
            const ex = c.x - Math.cos(c.angle) * c.len * alpha;
            const ey = c.y - Math.sin(c.angle) * c.len * alpha;
            const grad = ctx.createLinearGradient(c.x, c.y, ex, ey);
            grad.addColorStop(0, `hsla(${c.hue}, 100%, 85%, ${alpha * 0.95})`);
            grad.addColorStop(0.4, `hsla(${c.hue}, 100%, 70%, ${alpha * 0.5})`);
            grad.addColorStop(1, 'transparent');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.8;
            ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(ex, ey); ctx.stroke();
            if (c.life >= c.maxLife) {
                comets.splice(i, 1);
                if (Math.random() > 0.4) spawnComet();
            }
        }
        if (comets.length < 2 && Math.random() < 0.008) spawnComet();

        requestAnimationFrame(frame);
    }
    frame();
    return { stop: () => { running = false; } };
}

// ==================== SCREEN FLOW ====================
let starfieldHandle = null;
let introHandle = null;

// FX switch hook (aus_45_fx_mode.js): the persistent starfield runs only while FX are on AND the main app is open.
function syncStarfield() {
    const app = document.getElementById('main-app');
    if (window.__AUS_FX_ON !== false && app && app.classList.contains('active')) {
        if (!starfieldHandle) starfieldHandle = initStarfield('starfield-bg', 200);
        else starfieldHandle.start();
    } else if (starfieldHandle) {
        starfieldHandle.stop();
    }
}

function startApp() {
    // Calm performance mode saved from an earlier visit (aus_45_fx_mode.js): no intro animation at all — straight to the splash.
    if (window.__AUS_FX_ON === false) {
        const intro = document.getElementById('intro-screen');
        if (intro) intro.style.display = 'none';
        document.getElementById('splash-screen').classList.add('active');
        return;
    }
    // 1. Intro animation
    introHandle = initIntroParticles();
    // 2. After 5 seconds, fade to splash
    setTimeout(() => {
        const intro = document.getElementById('intro-screen');
        intro.classList.add('fade-out');
        setTimeout(() => {
            intro.style.display = 'none';
            if (introHandle) introHandle.stop();
            const splash = document.getElementById('splash-screen');
            splash.classList.add('active');
        }, 1000);
    }, 5000);
}

function enterMainApp() {
    // Mandatory login: with no active session the main app stays closed. ausAuth.requireLogin() (auth_system.js) opens the
    // login/register gate and calls enterMainApp() again by itself the moment sign-in / sign-up succeeds. If the auth system is
    // missing (failed to load) the app opens as before — a broken gate must never lock everybody out.
    if (window.ausAuth && typeof window.ausAuth.requireLogin === 'function' && !window.ausAuth.requireLogin(enterMainApp)) return;
    const splash = document.getElementById('splash-screen');
    splash.classList.add('fade-out');
    setTimeout(() => {
        splash.style.display = 'none';
        const app = document.getElementById('main-app');
        app.classList.add('active');
        // Start persistent starfield (only while FX are on — see syncStarfield)
        syncStarfield();
        // Initialize app state
        renderSpecialties();
        updateStats();
    }, window.__AUS_FX_ON === false ? 0 : 800);   // calm mode: no fade-out to wait for
}

// Skip intro on click anywhere or Enter key
function setupSkipIntro() {
    const skip = () => {
        const intro = document.getElementById('intro-screen');
        if (intro && !intro.classList.contains('fade-out') && intro.style.display !== 'none') {
            intro.classList.add('fade-out');
            setTimeout(() => {
                intro.style.display = 'none';
                if (introHandle) introHandle.stop();
                document.getElementById('splash-screen').classList.add('active');
            }, 600);
        }
    };
    document.addEventListener('click', skip, { once: false });
    document.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') skip(); });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    startApp();
    setupSkipIntro();
    initFxLayer();
});

