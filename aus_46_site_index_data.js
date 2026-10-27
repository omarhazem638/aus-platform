/* ================================================================
   AUS — محتوى «الفهرس» (System Directory / Site Map)
   بيانات فقط — لا منطق هنا. يعرضها aus_47_site_index.js.

   لكل نظام (system):
     ar / en : n الاسم · t السطر التعريفي · w ما هو؟ · h كيف يعمل وظيفياً · x كيف يعمل تقنياً · e فائدة تعليمية · a فائدة تطبيقية
     sub     : اسم إنجليزي قصير يظهر تحت العنوان
     mode    : offline (يعمل دون إنترنت) | hybrid (محلي أولاً + الخادم عند توفّره) | server (يحتاج الخادم)
     facts   : أرقام سريعة — القيمة تأتي من {{متغيّر}} فتُقرأ حيّة من بيانات المنصة نفسها (انظر vars)
     files   : الملفات التقنية الأساسية
     open    : أزرار «افتح» — tab: بداية onclick لتبويب موجود · section: showSection · call: دالة عامة · role: doctor | owner
     parts   : مكوّنات فرعية (اختياري) — كل مكوّن عنوان + وصف + (اختياري) open

   الأرقام داخل النصوص تُكتب {{اسم}} وتُستبدل وقت العرض بالقيمة الحيّة من البيانات، وإن لم تتوفّر تُستخدم vars كقيمة احتياطية.
   لتعديل المحتوى: غيّر النصوص هنا فقط.
   ================================================================ */
(function () {
    'use strict';

    window.AUS_SITE_INDEX = {

        /* قيم احتياطية للمتغيّرات {{...}} — تُستبدل بقيم حيّة من البيانات عندما تتوفّر (انظر LIVE في aus_47_site_index.js) */
        vars: {
            specialties: 7, tools: 70, quizQ: 10, challengesPer: 10, leadershipQ: 50,
            certKQ: 25, certPQ: 40, certKP: 5, certPP: 10, certSec: 60, certPass: 80,
            lectures: 10, lectureSections: 5, lectureQ: 15,
            engLevels: 10, engQuiz: 5, vocabWords: 200, vocabLevels: 10, calcs: 10, calcQ: 10,
            premium: 44, books: 8, files: 36, bookPrice: 20, filePrice: 10,
            crises: 5, crisisStages: 4, crisisSec: 90, interviewCats: 4, interviewQ: 5, cdnaQ: 15,
            achievements: 20, campus: 9, demoSteps: 8, langs: 11, ventureMods: 9, simRounds: 5
        },

        /* الفئات */
        cats: [
            { id: 'learn', icon: '📚', c: '#00d4ff',
              ar: { n: 'التعلّم والمحتوى', d: 'أنظمة تبني معرفتك وتثبّتها ثم تعتمدها.' },
              en: { n: 'Learning & content', d: 'Systems that build, reinforce and certify your knowledge.' } },
            { id: 'sim', icon: '🎯', c: '#ff006e',
              ar: { n: 'القيادة والمحاكاة', d: 'تدرّب على القرار والقيادة في مواقف تشبه الواقع.' },
              en: { n: 'Leadership & simulation', d: 'Practise decisions and leadership in realistic situations.' } },
            { id: 'ai', icon: '🤖', c: '#9d4edd',
              ar: { n: 'الذكاء الاصطناعي والمساعدة', d: 'مساعدون أذكياء تسألهم وتدرس معهم وتتحدّث إليهم.' },
              en: { n: 'AI & assistance', d: 'Smart assistants you can ask, study with and talk to.' } },
            { id: 'venture', icon: '🚀', c: '#00f5d4',
              ar: { n: 'ريادة الأعمال', d: 'من الفكرة إلى المشروع والحاضنة والمستثمرين.' },
              en: { n: 'Entrepreneurship', d: 'From an idea to a venture, an incubator and investors.' } },
            { id: 'people', icon: '👥', c: '#ffd60a',
              ar: { n: 'الحسابات والإدارة والتواصل', d: 'من يدخل المنصة، ومن يدير الصف، وكيف يتواصل الجميع.' },
              en: { n: 'Accounts, administration & communication', d: 'Who gets in, who runs the class, and how everyone stays in touch.' } },
            { id: 'progress', icon: '🏅', c: '#d4af37',
              ar: { n: 'التقدّم والاستكشاف', d: 'نقاط وإنجازات ولوحات وخريطة تجعل الرحلة ممتعة وواضحة.' },
              en: { n: 'Progress & exploration', d: 'Points, achievements, dashboards and a map that keep the journey clear and fun.' } },
            { id: 'platform', icon: '⚙️', c: '#4d9bff',
              ar: { n: 'الأساس التقني والتخصيص', d: 'ما تقوم عليه كل الأنظمة، وكيف تضبطها على ذوقك.' },
              en: { n: 'Platform foundations & customization', d: 'What every system stands on, and how to tune it to your taste.' } }
        ],

        /* رحلة الطالب — كل خطوة تفتح النظام المناسب في الفهرس */
        journey: [
            { sys: 'tools', icon: '🎓',
              ar: { t: 'تعلّم', d: 'اختر تخصصاً وافتح أداة.' }, en: { t: 'Learn', d: 'Pick a specialty and open a tool.' } },
            { sys: 'challenges', icon: '🧪',
              ar: { t: 'اختبر نفسك', d: 'تحديات ومواقف بنقاط.' }, en: { t: 'Test yourself', d: 'Challenges and scenarios for points.' } },
            { sys: 'crisis', icon: '🎯',
              ar: { t: 'حاكِ وقرّر', d: 'أزمات ومقابلات بالذكاء الاصطناعي.' }, en: { t: 'Simulate', d: 'AI crises and interviews.' } },
            { sys: 'certs', icon: '🏆',
              ar: { t: 'اعتمد مهارتك', d: 'شهادة احترافية قابلة للتحقق.' }, en: { t: 'Get certified', d: 'A verifiable professional certificate.' } },
            { sys: 'venture', icon: '🚀',
              ar: { t: 'ابنِ مشروعك', d: 'من الفكرة إلى الحاضنة.' }, en: { t: 'Build a venture', d: 'From idea to incubator.' } }
        ],

        systems: [

            /* ───────────────────────── التعلّم والمحتوى ───────────────────────── */
            {
                id: 'tools', cat: 'learn', icon: '🔧', c: '#00d4ff', mode: 'offline', sub: 'Specialties · 70 Tools · Quizzes',
                ar: {
                    n: 'التخصصات والأدوات الـ 70',
                    t: '{{specialties}} تخصصات في كلية الأعمال، لكل منها 10 أدوات مهنية حديثة تتعلّمها ثم تختبر نفسك فيها.',
                    w: 'القلب التعليمي للمنصة: كلية أعمال رقمية بسبعة تخصصات (إدارة الأعمال، المحاسبة، الموارد البشرية، التسويق الإلكتروني، التمويل والتكنولوجيا المالية، نظم المعلومات الإدارية، العلوم اللوجستية). لكل تخصص عشر أدوات وأساليب حديثة — مثل SWOT وOKRs وPower BI وCRM وBlockchain — ولكل أداة شاشة تعلّم متكاملة واختبار قصير.',
                    h: [
                        'تختار تخصصاً من «الرئيسية» فتظهر أدواته العشر، أو تتصفّح الأدوات كلها وتبحث فيها من «دليل الأدوات».',
                        'تفتح شاشة التعلّم: ما هي الأداة، مكوّناتها الأساسية، متى تُستخدم، فوائدها، مثال واقعي من شركة حقيقية، وتحدٍّ شائع تتجنّبه.',
                        'تبدأ الاختبار: {{quizQ}} أسئلة اختيار من متعدد؛ كل إجابة صحيحة تمنحك +10 XP، وكل خطأ يُنقصك قلباً من ثلاثة، مع شرح فوري لسبب الإجابة الصحيحة.',
                        'تظهر نسبتك وإجمالي الـ XP، ومن شاشة التعلّم نفسها تنتقل إلى مسار الشهادة الاحترافية للأداة.'
                    ],
                    x: [
                        'المحتوى بيانات منظّمة محلية (aus_01_data.js: specialties وtoolsData) تُرسَم واجهاتها من aus_02_core.js؛ فالتصفّح والاختبار يعملان دون إنترنت أو خادم.',
                        'أسئلة الاختبار تُولَّد آلياً من محتوى الأداة نفسه (تعريف، مكوّنات، استخدام، فوائد) مع خيارات خاطئة مُخلَّطة، فتبقى مرتبطة بما قرأته.',
                        'دليل الأدوات (aus_44_tools_index.js) فهرس مستقل يقرأ البيانات ذاتها ويعيد استخدام شاشتَي التعلّم والاختبار بدل نسخهما.'
                    ],
                    e: ['ترتيب تعليمي واضح — فهم ثم تطبيق ثم اختبار — مبني على أمثلة من شركات حقيقية بدل التعريفات المجرّدة.'],
                    a: ['تبني حصيلة عملية من الأدوات التي يطلبها سوق العمل، وتعرف متى تستخدم كل أداة وأين تقع أخطاؤها الشائعة.']
                },
                en: {
                    n: 'Specialties & the 70 Tools',
                    t: '{{specialties}} business-school specialties with 10 modern professional tools each — learn the tool, then test yourself.',
                    w: 'The learning core of the platform: a digital business school with seven specialties (Business Administration, Accounting, Human Resources, Digital Marketing, Finance & FinTech, Management Information Systems, Logistics). Each specialty has ten modern tools and methods — SWOT, OKRs, Power BI, CRM, Blockchain and more — and every tool comes with a full learning screen and a short quiz.',
                    h: [
                        'Pick a specialty on Home to see its ten tools, or browse and search all of them in the Tools Index.',
                        'Open the learning screen: what the tool is, its core components, when to use it, its benefits, a real company example and a common pitfall.',
                        'Start the quiz: {{quizQ}} multiple-choice questions; every correct answer earns +10 XP, every mistake costs one of your three hearts, and each answer comes with an instant explanation.',
                        'You see your percentage and XP total, and from the same learning screen you can go straight to the tool’s professional certification track.'
                    ],
                    x: [
                        'Content is structured local data (aus_01_data.js: specialties and toolsData) rendered by aus_02_core.js, so browsing and quizzes work with no internet and no server.',
                        'Quiz questions are generated from the tool’s own content (definition, components, usage, benefits) with shuffled wrong options, so they always match what you just read.',
                        'The Tools Index (aus_44_tools_index.js) is a separate directory that reads the same data and reuses the learning and quiz screens instead of copying them.'
                    ],
                    e: ['A clear learning order — understand, apply, test — built on real company examples instead of abstract definitions.'],
                    a: ['You build a practical toolbox of what the job market asks for, and learn when to use each tool and where it usually goes wrong.']
                },
                facts: [
                    { v: '{{specialties}}', ar: 'تخصصات', en: 'specialties' },
                    { v: '{{tools}}', ar: 'أداة', en: 'tools' },
                    { v: '{{quizQ}}', ar: 'أسئلة لكل اختبار', en: 'questions per quiz' }
                ],
                files: ['aus_01_data.js', 'aus_02_core.js', 'aus_44_tools_index.js'],
                open: [
                    { tab: "showSection('home')", ar: 'التخصصات', en: 'Specialties' },
                    { tab: "showSection('toolsindex')", ar: 'دليل الأدوات', en: 'Tools Index' },
                    { tab: "showSection('tools')", ar: 'الأدوات', en: 'Tools' }
                ]
            },

            {
                id: 'certs', cat: 'learn', icon: '🏆', c: '#ffd700', mode: 'server', sub: 'Professional Certifications',
                ar: {
                    n: 'الشهادات الاحترافية',
                    t: 'امتحان رسمي لكل أداة من الأدوات الـ {{tools}} يصحّحه الخادم، وينتهي بشهادة رقمية بتصميم جاهز للطباعة ورمز QR يمكن لأي جهة التحقق منها بمسحه.',
                    w: 'نظام اعتماد يربط كل أداة من الأدوات الـ {{tools}} بمسارين: «شهادة المعرفة» و«شهادة الممارسة». تدخل امتحاناً مؤقّتاً بأسئلة تُسحب لك من بنك أسئلة، فإذا حقّقت حدّ النجاح تطلب الشهادة فيُصدر الخادم لك فوراً وثيقة رقمية برقم فريد ورمز QR وصفحة تحقّق عامة، وتُعرض بتصميمها الكامل لتطبعها أو تحفظها PDF أو صورة.',
                    h: [
                        'تفتح أداة وتختار المسار: المعرفة ({{certKQ}} سؤالاً، {{certKP}} دنانير) أو الممارسة ({{certPQ}} سؤالاً، {{certPP}} دنانير)؛ لكل سؤال {{certSec}} ثانية وحدّ النجاح {{certPass}}%.',
                        'تحصل على محاولة بالدفع الإلكتروني عبر PayPal — يتحقّق الخادم من العملية مباشرة مع PayPal — أو بالتحويل اليدوي (CliQ / IBAN) فتفعّله الإدارة بعد مطابقة التحويل.',
                        'يبدأ الامتحان بأسئلة متنوّعة (اختيار من متعدد، ترتيب خطوات، مطابقة) تُسحب وتُخلَّط لك وحدك، بينما يراقب «المراقب الذكي» سلوكك أثناء الامتحان.',
                        'عند التسليم يصحّح الخادم الإجابات ويحفظ نتيجتك؛ وعند النجاح تضغط «طلب الشهادة» فيتحقّق الخادم من نجاحك ويُصدر الشهادة ويفتحها لك بتصميمها ورمز QR.'
                    ],
                    x: [
                        'الخادم هو المرجع: رصيد المحاولات (سجلّ إضافة فقط) ومفتاح الإجابات والدرجة والمهلة كلها في FastAPI (routes/certificates.py وcert_exam_engine.py)؛ المتصفح لا يستلم مفتاح الإجابات ولا يستطيع تعديل درجته من أدوات المطوّر.',
                        'الاتصال: الخادم هو من يفتح المحاولة فلا تبدأ بدونه، لكن انقطاعه لا يُضيّع شيئاً — يُعاد طلب البدء ثلاث مرات (آمن: يستأنف الخادم المحاولة المفتوحة ولا يخصم مرتين) ثم تظهر شاشة انتظار تشخّص السبب (الخادم متوقف، لا إنترنت، CORS، عنوان خاطئ)؛ وبعد البدء تستمر الإجابة محلياً في «وضع الامتحان المحلي المؤقت» وتُحفظ على الجهاز وتُرسل تلقائياً عند عودة الاتصال — والتصحيح والمهلة للخادم ولا يمدّدهما الانقطاع. وإن كان الخادم متوقفاً من الأساس فتُعرض «المتابعة محلياً» (وعلى جهاز المطوّر localhost تبدأ التجربة تلقائياً دون أي شاشة): تجربة تدريبية على جهازك بالأسئلة وحدّ النجاح نفسيهما، تُحفظ إجاباتها محلياً وتُسجَّل نتيجتها في سجلّك وتُزامَن مع حسابك عند عودة الخادم، لكنها لا تُحتسب كامتحان ولا تُصدر شهادة ولا تستهلك رصيداً. يُضبط ذلك بالوسم aus-exam-local-trial = auto | choice | off.',
                        'المراقب (aus_39_proctor.js) يرصد سلوكياً: مغادرة الصفحة، النسخ واللصق، الطباعة، أدوات المطوّر، إعادة التحميل المتكرر وأدوات الأتمتة، بنظام نقاط مخاطرة: إنذار عند 25 ثم 50 وإنهاء الامتحان عند 75 (بلا كاميرا ولا ميكروفون).',
                        'الشهادة الصادرة تحمل رقماً عشوائياً غير قابل للتخمين بصيغة AUS-{التخصص}-{السنة}-{7 رموز} ورمز QR يحمل رابط التحقق verify.html?id=…؛ يُولَّد الرمز لحظياً في المتصفح (aus_50_qr.js، دون إنترنت) ويظهر على تصميم الشهادة (aus_51_cert_view.js) وفي الطباعة، ويفحصها أي شخص دون حساب فيرى حالتها الحقيقية من الخادم (موثّقة / مُلغاة / موقوفة)؛ وللمالك إيقافها أو إلغاؤها أو إعادة توليد الـ QR من «سجل الشهادات».'
                    ],
                    e: ['اختبار صارم ومؤقّت يقيس الفهم لا الحفظ، يسبقه شرح للأداة ومقطع «فيديو شرح» مسرود يُشغَّل داخل المتصفح.'],
                    a: ['وثيقة قابلة للتحقق تضيفها إلى سيرتك المهنية؛ المزوَّرة منها لا يجد رقمها أحد في السجل. أما الشهادة الورقية الرسمية فتُستكمل عبر مركز الريادة والابتكار في جامعة عمان العربية.']
                },
                en: {
                    n: 'Professional Certifications',
                    t: 'An official exam for each of the {{tools}} tools, graded on the server and ending in a printable digital certificate with a QR code that anyone can scan to verify.',
                    w: 'A certification system that gives each of the {{tools}} tools two tracks: the Knowledge Certificate and the Practical Certificate. You sit a timed exam drawn for you from a question bank; if you reach the pass mark you request the certificate and the server immediately issues a digital document with a unique number, a QR code and a public verification page, shown in its full design so you can print it or save it as a PDF or an image.',
                    h: [
                        'Open a tool and pick a track: Knowledge ({{certKQ}} questions, {{certKP}} JOD) or Practical ({{certPQ}} questions, {{certPP}} JOD); {{certSec}} seconds per question and a {{certPass}}% pass mark.',
                        'You get an attempt by paying online through PayPal — the server checks the order directly with PayPal — or by manual transfer (CliQ / IBAN), which the administration activates after matching the transfer.',
                        'The exam mixes question types (multiple choice, ordering steps, matching) drawn and shuffled for you alone, while the “smart proctor” watches your behaviour during the sitting.',
                        'On submission the server grades your answers and stores the result; if you pass you press “Request certificate”, the server checks that you really passed, issues the certificate and opens it with its design and QR code.'
                    ],
                    x: [
                        'The server is the authority: the attempt balance (an append-only ledger), the answer key, the score and the deadline all live in FastAPI (routes/certificates.py and cert_exam_engine.py); the browser never receives the answer key and cannot edit its own score from developer tools.',
                        'Connectivity: the server opens the sitting, so it cannot start without it — but losing the server costs nothing: starting is retried three times (safe: the server resumes the open sitting and never charges twice), then a waiting screen diagnoses the cause (server down, no internet, CORS, wrong address); once started, answering continues locally in “Offline Exam Mode”, the answers are kept on the device and re-sent automatically when the connection returns — grading and the deadline stay the server’s, and an outage never extends them. If the server is down from the very start the screen offers “Continue locally” (on a developer machine, localhost, the trial simply starts by itself with no screen in the way): a practice run on your device with the same question types and pass mark — its answers are kept locally and its score is recorded in your own record and linked to your account when the server is back, but it never counts as an exam, never certifies and never costs a credit. Set it with the aus-exam-local-trial meta tag = auto | choice | off.',
                        'The proctor (aus_39_proctor.js) watches behaviour only — leaving the page, copy/paste, printing, developer tools, repeated reloads and automation tools — using risk points: a warning at 25 and 50, and the exam ends at 75 (no camera, no microphone).',
                        'An issued certificate carries an unguessable random number like AUS-{SPECIALTY}-{YEAR}-{7 chars} and a QR code holding its verify.html?id=… link; the code is generated instantly in the browser (aus_50_qr.js, no internet needed) and appears on the certificate design (aus_51_cert_view.js) and in print. Anyone can scan it without an account and sees the real status from the server (verified / revoked / suspended); the owner can suspend or revoke it, or regenerate the QR, from the certificate registry.'
                    ],
                    e: ['A strict, timed exam that measures understanding rather than memory, preceded by a tool explanation and a narrated “explainer video” that plays right in the browser.'],
                    a: ['A verifiable credential for your CV; a forged one simply is not in the register. The official paper certificate is completed through the Entrepreneurship & Innovation Center at Amman Arab University.']
                },
                facts: [
                    { v: '2', ar: 'مساران', en: 'tracks' },
                    { v: '{{certKQ}} / {{certPQ}}', ar: 'سؤالاً (معرفة / ممارسة)', en: 'questions (knowledge / practical)' },
                    { v: '{{certPass}}%', ar: 'حدّ النجاح', en: 'pass mark' }
                ],
                files: ['aus_36_certification.js', 'aus_37_cert_ui.js', 'aus_38_cert_video.js', 'aus_39_proctor.js', 'aus_43_cert_registry.js', 'aus_50_qr.js', 'aus_51_cert_view.js', 'routes/certificates.py', 'cert_exam_engine.py', 'verify.html'],
                open: [{ tab: "showSection('certifications')", ar: 'الشهادات الاحترافية', en: 'Certifications' }]
            },

            {
                id: 'english', cat: 'learn', icon: '🔤', c: '#d4af37', mode: 'offline', sub: 'Business English · Vocabulary Master',
                ar: {
                    n: 'Business English ومفردات الأعمال',
                    t: '{{engLevels}} مستويات قراءة، و{{vocabWords}} كلمة بنظام التكرار المتباعد، مع مدرّب نطق ومقرئ صوتي.',
                    w: 'مركز لتعلّم إنجليزية الأعمال من Beginner إلى Expert. يجمع قراءة تفاعلية متدرّجة، وبنك مفردات بتكرار متباعد، وقاموساً للمصطلحات، ومدرّباً يصحّح نطقك، وقارئاً يقرأ النصوص بصوت مسموع.',
                    h: [
                        'في Business English تختار مستوى فيُعرض نص أعمال متدرّج الصعوبة، تُمرّره تلقائياً بسرعة تضبطها، وتضغط على الكلمات لترى معناها، ثم تحلّ اختباراً قصيراً من {{engQuiz}} أسئلة.',
                        'في Vocabulary Master تتعلّم كل كلمة بمعناها ونطقها (IPA) ومثالها واستخدامها في الأعمال ومترادفاتها وأخطائها الشائعة، ثم تُختبر بأسئلة تتكيّف مع مستواك.',
                        'محرّك التكرار المتباعد يجدول مراجعة كل كلمة بحسب سهولتها عليك، ولا تنتقل إلى مستوى جديد قبل إتقان الحالي.',
                        'مدرّب النطق يستمع لنطقك ويقارنه بالكلمة المطلوبة ويعطيك درجة وملاحظات على مستوى الكلمة.'
                    ],
                    x: [
                        'محرّك SM-2 (Spaced Repetition) مع اختيار أسئلة تكيّفي وبوابة إتقان في aus_35_vocab_engine.js، وبنك الكلمات في aus_34_vocab_data.js ({{vocabLevels}} مستويات × 20 كلمة)، ويُحفظ تقدّمك محلياً.',
                        'النطق والقراءة يستخدمان Web Speech API في المتصفح (التعرّف على الكلام والتحويل إلى صوت)، وتُقدَّر دقة النطق بمسافة Levenshtein بين ما قلته والكلمة المطلوبة.',
                        'يعمل المركز دون خادم؛ والذكاء الاصطناعي اختياري فيه (شرح كلمة، تفسير).'
                    ],
                    e: ['تبني مفردات إنجليزية مهنية مرتّبة بحسب المجال — مبيعات، تسويق، مالية، موارد بشرية، سلاسل توريد… — بدل تعلّم عشوائي.'],
                    a: ['تستعدّ لسوق عمل يطلب الإنجليزية: قراءة التقارير والمراسلات والاجتماعات، مع تحسين النطق قبل المقابلات.']
                },
                en: {
                    n: 'Business English & Vocabulary',
                    t: '{{engLevels}} reading levels and {{vocabWords}} words on spaced repetition, with a pronunciation coach and a voice reader.',
                    w: 'A centre for learning business English from Beginner to Expert. It combines graded interactive reading, a spaced-repetition vocabulary bank, a terminology dictionary, a coach that corrects your pronunciation, and a reader that reads texts aloud.',
                    h: [
                        'In Business English you pick a level and get a business text of rising difficulty; auto-scroll it at a speed you set, tap words to see their meaning, then take a short {{engQuiz}}-question quiz.',
                        'In Vocabulary Master you learn each word with its meaning, IPA pronunciation, example, business usage, synonyms and common mistakes, then you are tested with questions that adapt to your level.',
                        'The spaced-repetition engine schedules each word’s review by how easy it was for you, and you cannot move to a new level before mastering the current one.',
                        'The pronunciation coach listens to you, compares what you said with the target word and gives a score and word-level feedback.'
                    ],
                    x: [
                        'An SM-2 (spaced repetition) engine with adaptive question selection and mastery gating in aus_35_vocab_engine.js; the word bank lives in aus_34_vocab_data.js ({{vocabLevels}} levels × 20 words) and your progress is stored locally.',
                        'Pronunciation and reading use the browser’s Web Speech API (speech recognition and speech synthesis), and pronunciation accuracy is estimated with the Levenshtein distance between what you said and the target word.',
                        'The centre works without a server; AI is optional inside it (word explanations).'
                    ],
                    e: ['You build professional English vocabulary organised by field — sales, marketing, finance, HR, supply chain… — instead of learning at random.'],
                    a: ['You get ready for a job market that asks for English: reading reports, correspondence and meetings, and polishing pronunciation before interviews.']
                },
                facts: [
                    { v: '{{engLevels}}', ar: 'مستويات قراءة', en: 'reading levels' },
                    { v: '{{vocabWords}}', ar: 'كلمة في Vocabulary Master', en: 'words in Vocabulary Master' },
                    { v: '250+', ar: 'مصطلح في القاموس', en: 'dictionary terms' }
                ],
                files: ['aus_09_english.js', 'aus_09_dict_v2.js', 'aus_10_voice_reader.js', 'aus_11_pronunciation.js', 'aus_34_vocab_data.js', 'aus_35_vocab_engine.js'],
                parts: [
                    { icon: '📖', ar: { t: 'Business English', d: '10 مستويات قراءة من Beginner إلى Expert، لكل مستوى نص واختبار قصير وسلسلة أيام متواصلة.' },
                      en: { t: 'Business English', d: '10 reading levels from Beginner to Expert, each with a text, a short quiz and a day streak.' },
                      open: { tab: "showSection('english')" } },
                    { icon: '🧠', ar: { t: 'Vocabulary Master', d: '200 كلمة في 10 مستويات بنظام التكرار المتباعد وبوابة إتقان.' },
                      en: { t: 'Vocabulary Master', d: '200 words in 10 levels with spaced repetition and mastery gating.' },
                      open: { tab: "showSection('vocab')" } },
                    { icon: '🎙️', ar: { t: 'Pronunciation Coach', d: 'تقييم نطقك كلمة كلمة بالتعرّف على الكلام مع نطق IPA للكلمات الصعبة.' },
                      en: { t: 'Pronunciation Coach', d: 'Word-by-word pronunciation scoring with speech recognition and IPA for tricky words.' } },
                    { icon: '🔊', ar: { t: 'AI Voice Reader', d: 'قراءة بصوت مسموع مع تظليل الكلمة الجارية، وأصوات متعددة وشرح بالذكاء الاصطناعي.' },
                      en: { t: 'AI Voice Reader', d: 'Reads aloud with the current word highlighted, several voices and AI explanations.' } },
                    { icon: '📘', ar: { t: 'قاموس BELC', d: 'أكثر من 250 مصطلحاً بمعناها ونطقها ومرادفاتها وأضدادها ومستوى صعوبتها.' },
                      en: { t: 'BELC Dictionary', d: 'More than 250 terms with meaning, phonetics, synonyms, antonyms and difficulty level.' } }
                ]
            },

            {
                id: 'calc', cat: 'learn', icon: '🧮', c: '#00f5d4', mode: 'offline', sub: 'Financial Calculators',
                ar: {
                    n: 'الحاسبات المالية',
                    t: '{{calcs}} عمليات حسابية أساسية في عالم الأعمال، لكل عملية درس مفصّل و{{calcQ}} أسئلة واقعية.',
                    w: 'مختبر أرقام للعمليات التي يستخدمها كل مدير: العائد على الاستثمار (ROI)، هامش الربح الإجمالي، نقطة التعادل، الخصم والسعر النهائي، ضريبة القيمة المضافة، معدل النمو، تكلفة اكتساب العميل (CAC)، القيمة الدائمة للعميل (CLV)، فترة الاسترداد، ونسبة السيولة الجارية.',
                    h: [
                        'تختار عملية فيفتح لك درسها: تعريف، صيغة رياضية، خطوات الحل، مثال محلول ونصائح.',
                        'تدخل اختباراً من {{calcQ}} أسئلة بأرقام واقعية من سياق الأعمال (بالدينار)، تُخلَّط خياراتها في كل مرة.',
                        'يرافق كل سؤال شرح الحل خطوة بخطوة، وفي النهاية تظهر نتيجتك ومراجعة إجاباتك.'
                    ],
                    x: [
                        'المحتوى في business_calc.js (عمليات × درس + أسئلة) وواجهته في business_calc_ui.js، ويعمل كاملاً دون إنترنت.',
                        'تُسجَّل إجابات الطالب في سجلّ حسابه عبر student_data.js لتظهر في «إجاباتي ونتائجي» وتُرفع للخادم عند توفّره.'
                    ],
                    e: ['تفهم المنطق وراء كل صيغة، لا حفظها فقط: متى تُستخدم، وماذا يعني الرقم الذي حصلت عليه.'],
                    a: ['تقرأ التقارير المالية وتقيّم الجدوى والتسعير بثقة، وهي مهارة تُطلب في كل وظيفة إدارية.']
                },
                en: {
                    n: 'Financial Calculators',
                    t: '{{calcs}} essential business calculations, each with a detailed lesson and {{calcQ}} realistic questions.',
                    w: 'A number lab for the calculations every manager uses: return on investment (ROI), gross profit margin, break-even point, discount and final price, VAT, growth rate, customer acquisition cost (CAC), customer lifetime value (CLV), payback period and the current ratio.',
                    h: [
                        'Pick a calculation and its lesson opens: a definition, the formula, solution steps, a worked example and tips.',
                        'Take a {{calcQ}}-question quiz with realistic business numbers (in dinars); the options are shuffled every time.',
                        'Every question comes with a step-by-step solution, and at the end you see your result and a review of your answers.'
                    ],
                    x: [
                        'Content lives in business_calc.js (calculations × lesson + questions) and the interface in business_calc_ui.js, and it works entirely offline.',
                        'Your answers are recorded in your account’s history through student_data.js so they appear in “My answers & results”, and they are uploaded to the server when it is available.'
                    ],
                    e: ['You grasp the logic behind each formula, not just its form: when it applies and what the number you got actually means.'],
                    a: ['You read financial reports and judge feasibility and pricing with confidence — a skill asked for in every managerial job.']
                },
                facts: [
                    { v: '{{calcs}}', ar: 'عمليات', en: 'calculations' },
                    { v: '{{calcQ}}', ar: 'أسئلة لكل عملية', en: 'questions each' }
                ],
                files: ['business_calc.js', 'business_calc_ui.js', 'student_data.js'],
                open: [{ tab: "showSection('calc')", ar: 'الحاسبات المالية', en: 'Financial Calculators' }]
            },

            {
                id: 'drai', cat: 'learn', icon: '🎓', c: '#c77dff', mode: 'offline', sub: 'Dr. AI · Interactive Lectures',
                ar: {
                    n: 'دكتور AI — المحاضرات التفاعلية',
                    t: 'قاعة محاضرات ذكية: {{lectures}} محاضرات في السلوك التنظيمي مع اختيار عشوائي للطلاب وأسئلة وواجبات.',
                    w: 'نظام محاضرات تفاعلية لمقرّر السلوك التنظيمي في عشرة فصول: مدخل إلى السلوك التنظيمي، النظريات الإدارية، الإدراك، الاتجاهات، القيم، الشخصية، التعلّم، ضغوط العمل، الإحباط، والسلوك الجماعي. صُمّم ليُستخدم داخل القاعة: الدكتور يشرح ويتفاعل مع الطلاب، والطالب يراجع المادة نفسها بعد المحاضرة.',
                    h: [
                        'تختار محاضرة فتتنقّل بين أقسامها الخمسة (شرح مفصّل بتسلسل منظّم) عبر نقاط التقدّم.',
                        'تضيف أسماء الطلاب الحاضرين، ثم يختار «🎲 الاختيار العشوائي» طالباً دون تكرار حتى يُسأل الجميع.',
                        'تبدأ الأسئلة ({{lectureQ}} سؤالاً لكل محاضرة): تُظهر الإجابة النموذجية ثم تسجّل صحيحة أو خاطئة، فتتراكم نقاط كل طالب وتظهر في ملخص الجلسة.',
                        'في نهاية المحاضرة يُعرض واجبها (العنوان وموعد التسليم والمهام) ويرتبط بنظام الواجبات.'
                    ],
                    x: [
                        'المحتوى في dr_ai_module.js (محاضرات وأقسام وأسئلة وواجبات) وواجهة الجلسة في dr_ai_ui.js؛ يعمل دون إنترنت، وحالة الجلسة (الطلاب والنقاط) تبقى في الذاكرة.',
                        'الاختيار العشوائي يستبعد من سُئل سابقاً ويعيد الدورة عند اكتمال القائمة، ولا تُسجَّل النقاط إلا لطالب مُختار.',
                        'الواجب يُكلَّف عبر نظام الواجبات (homework.js) الذي يحتاج الخادم.'
                    ],
                    e: ['شرح منظّم لمقرّر كامل مع أسئلة نموذجية تثبّت الفهم وتحفّز المشاركة الصفّية.'],
                    a: ['تحويل المحاضرة إلى نشاط تفاعلي عادل (اختيار عشوائي + نقاط)، وربط ما شُرح بواجب قابل للمتابعة.']
                },
                en: {
                    n: 'Dr. AI — Interactive Lectures',
                    t: 'A smart lecture hall: {{lectures}} organizational-behaviour lectures with random student picking, questions and homework.',
                    w: 'An interactive lecture system for an organizational-behaviour course in ten chapters: introduction, management theories, perception, attitudes, values, personality, learning, work stress, frustration and group behaviour. It is built to be used in the classroom — the doctor explains and engages students, and students review the same material afterwards.',
                    h: [
                        'Pick a lecture and move through its five sections (a structured, detailed explanation) with the progress dots.',
                        'Add the names of the students present; “🎲 Random pick” then selects a student without repeats until everyone has been asked.',
                        'Start the questions ({{lectureQ}} per lecture): reveal the model answer, mark it correct or wrong, and each student’s points add up and appear in the session summary.',
                        'At the end the lecture’s homework is shown (title, due date and tasks) and it connects to the homework system.'
                    ],
                    x: [
                        'Content lives in dr_ai_module.js (lectures, sections, questions, homework) and the session interface in dr_ai_ui.js; it works offline and the session state (students and points) stays in memory.',
                        'Random picking skips students who were already asked and restarts the cycle when the list is exhausted; points are only recorded for a picked student.',
                        'Homework is assigned through the homework system (homework.js), which needs the server.'
                    ],
                    e: ['A structured explanation of a whole course, with model questions that fix understanding and encourage class participation.'],
                    a: ['It turns a lecture into a fair, interactive activity (random picking + points) and ties what was taught to trackable homework.']
                },
                facts: [
                    { v: '{{lectures}}', ar: 'محاضرات', en: 'lectures' },
                    { v: '{{lectureSections}}', ar: 'أقسام لكل محاضرة', en: 'sections each' },
                    { v: '{{lectureQ}}', ar: 'سؤالاً لكل محاضرة', en: 'questions each' }
                ],
                files: ['dr_ai_module.js', 'dr_ai_ui.js'],
                open: [{ tab: "showSection('doctorai')", ar: 'دكتور AI', en: 'Dr. AI' }]
            },

            {
                id: 'store', cat: 'learn', icon: '📖', c: '#ffc800', mode: 'hybrid', sub: 'Store · My Library · AI Reader',
                ar: {
                    n: 'المتجر ومكتبتي وقارئ AI',
                    t: 'كتب وملفات قيادية مرتبطة بشخصيتك، تشتريها مرة وتقرأها في مكتبتك مع قارئ ذكي يشرح ويوسّع.',
                    w: 'المتجر يجمع في مكان واحد كل الكتب والملفات القابلة للشراء — مواد تطوير مصنّفة بحسب أنماط الشخصية القيادية وأنماط Career DNA — ومكتبتي تضم ما اشتريته، و«قارئ AI» يقرأ المحتوى ويشرحه ويوسّع فصوله عند الطلب.',
                    h: [
                        'تتصفّح المتجر ({{books}} كتب بسعر {{bookPrice}} ديناراً و{{files}} ملفاً بسعر {{filePrice}} دنانير)، وكل عنصر مرتبط بنمط قيادي أو بنوع Career DNA.',
                        'تدفع عبر PayPal أو بالتحويل اليدوي (CliQ / IBAN)، وبعد تأكيد الدفع يظهر العنصر مشترى داخل «مكتبتي».',
                        'تفتح العنصر في القارئ: يعرض المحتوى، ويشرحه بالذكاء الاصطناعي، ويتيح لك سؤاله عن أي جزء وتوسيع الفصول.'
                    ],
                    x: [
                        'كتالوج واحد (LEADERSHIP_FILES) يقرأه المتجر والمكتبة والدفع معاً، وللمالك طبقة تعديل للأسعار والنصوص (catalog_admin.js) تُحفظ فوق الكتالوج الأصلي دون تغييره.',
                        'بيانات الدفع (CliQ / IBAN / PayPal) تأتي من إعدادات التاجر المحفوظة على الخادم مع نسخة محلية احتياطية.',
                        'قارئ AI (ai_reader.js) يطلب من نموذج الذكاء الاصطناعي عبر الخادم توليد الشرح والفصول الإضافية.',
                        'نصوص الكتب مفصولة عن الكتالوج: تُجلب من الخادم (/api/books) عند أول فتح وتُحفظ في IndexedDB لقراءة سريعة وبدون اتصال، والفصول المولّدة (حتى 100,000 كلمة) تُخزَّن فصلاً فصلاً مع عدّادات بدل مصفوفة واحدة في localStorage، ويرسم القارئ صفحة واحدة في كل مرة (aus_53_book_store.js).'
                    ],
                    e: ['مواد قراءة أعمق تلائم نمطك القيادي ونتائجك في Career DNA بدل محتوى عام لا يشبهك.'],
                    a: ['تحوّل نتيجة اختبار الشخصية إلى خطة قراءة وتطوير عملية، وتعود إلى مكتبتك في أي وقت.']
                },
                en: {
                    n: 'Store, My Library & AI Reader',
                    t: 'Leadership books and files matched to your personality — buy once, read in your library with a smart reader that explains and expands.',
                    w: 'The store gathers every purchasable book and file in one place — development material organised by leadership personality styles and Career DNA types. My Library holds what you bought, and the “AI Reader” reads the content, explains it and expands its chapters on request.',
                    h: [
                        'Browse the store ({{books}} books at {{bookPrice}} JOD and {{files}} files at {{filePrice}} JOD); each item is tied to a leadership style or a Career DNA type.',
                        'Pay through PayPal or by manual transfer (CliQ / IBAN); once payment is confirmed the item shows as purchased in My Library.',
                        'Open an item in the reader: it shows the content, explains it with AI, and lets you ask about any part and expand chapters.'
                    ],
                    x: [
                        'One catalogue (LEADERSHIP_FILES) is read by the store, the library and the payment flow together; the owner has an override layer for prices and texts (catalog_admin.js) stored on top of the original catalogue without changing it.',
                        'Payment details (CliQ / IBAN / PayPal) come from the merchant settings saved on the server, with a local fallback copy.',
                        'The AI Reader (ai_reader.js) asks the AI model through the server to generate explanations and extra chapters.',
                        'Book texts are separate from the catalogue: fetched from the server (/api/books) on first open and kept in IndexedDB for fast, offline reading; AI-generated chapters (up to 100,000 words) are stored chapter by chapter with counters instead of one localStorage array, and the reader paints one page at a time (aus_53_book_store.js).'
                    ],
                    e: ['Deeper reading that fits your leadership style and Career DNA results instead of generic content that does not look like you.'],
                    a: ['You turn a personality-test result into a practical reading and development plan, and come back to your library at any time.']
                },
                facts: [
                    { v: '{{premium}}', ar: 'كتاباً وملفاً', en: 'books & files' },
                    { v: '{{books}} / {{files}}', ar: 'كتب / ملفات', en: 'books / files' }
                ],
                files: ['aus_05_paywall.js', 'aus_42_store.js', 'aus_53_book_store.js', 'library.js', 'ai_reader.js', 'catalog_admin.js'],
                open: [
                    { tab: "showSection('store')", ar: 'المتجر', en: 'Store' },
                    { tab: "showSection('library')", ar: 'مكتبتي', en: 'My Library' }
                ]
            },

            /* ───────────────────────── القيادة والمحاكاة ───────────────────────── */
            {
                id: 'leadership', cat: 'sim', icon: '👑', c: '#ffd700', mode: 'offline', sub: 'Leadership Personality Test',
                ar: {
                    n: 'الشخصية القيادية',
                    t: 'اختبار من {{leadershipQ}} سؤالاً يكشف أسلوبك القيادي بين أربعة أنماط، ثم يقترح خطة لتطويره.',
                    w: 'اختبار شخصية قيادية يحدّد أيّ الأنماط الأربعة أقرب إليك: الأوتوقراطي (الحازم)، الديمقراطي (المشارك)، التحويلي (الملهِم)، التفويضي (الواثق بفريقه). لا تظهر النتيجة إلا بعد آخر سؤال حتى تبقى إجاباتك صادقة.',
                    h: [
                        'يُسحب لك {{leadershipQ}} سؤالاً عشوائياً من بنك الأسئلة، لكل سؤال أربعة خيارات تعكس أنماطاً مختلفة.',
                        'كل إجابة تضيف نقطة لنمط معيّن، وفي النهاية تُحسب نسبة كل نمط والنمط المهيمن.',
                        'تظهر النتيجة بمخطط أشرطة للأنماط الأربعة، ثم «خطة التطوير»: دورات وكتب وتحديات عملية مقترحة.',
                        'كتب المتجر وملفاته مصنّفة بحسب هذه الأنماط نفسها لتختار ما يناسبك.'
                    ],
                    x: [
                        'البنك في aus_01_data.js (leadershipQuestions) والمنطق في aus_02_core.js؛ يعمل دون إنترنت ويُخلَّط ترتيب الأسئلة في كل محاولة.',
                        'تُعرض النتيجة بنسب مئوية لكل نمط وليس نمطاً واحداً فقط، لأن القيادة مزيج من الأنماط.'
                    ],
                    e: ['وعي ذاتي: تفهم نقاط قوتك القيادية وكيف تؤثّر في فريقك وقراراتك.'],
                    a: ['خطة عملية (دورات، كتب، تحديات لثلاثين يوماً) تنقلك من المعرفة إلى التطبيق.']
                },
                en: {
                    n: 'Leadership Personality',
                    t: 'A {{leadershipQ}}-question test that reveals your leadership style among four types, then suggests a plan to develop it.',
                    w: 'A leadership personality test that identifies which of four styles is closest to you: Autocratic (decisive), Democratic (participative), Transformational (inspiring) or Delegative (trusting their team). The result only appears after the last question so your answers stay honest.',
                    h: [
                        '{{leadershipQ}} questions are drawn at random from the question bank, each with four options that reflect different styles.',
                        'Each answer adds a point to a style; at the end the percentage of each style and the dominant style are calculated.',
                        'The result appears as a bar chart for the four styles, followed by a “development plan”: suggested courses, books and practical challenges.',
                        'The store’s books and files are classified by these same styles so you can choose what fits you.'
                    ],
                    x: [
                        'The bank is in aus_01_data.js (leadershipQuestions) and the logic in aus_02_core.js; it works offline and the question order is shuffled on every attempt.',
                        'The result is shown as a percentage for every style, not just one, because leadership is a blend of styles.'
                    ],
                    e: ['Self-awareness: you understand your leadership strengths and how they affect your team and decisions.'],
                    a: ['A practical plan (courses, books, 30-day challenges) that moves you from knowing to doing.']
                },
                facts: [
                    { v: '{{leadershipQ}}', ar: 'سؤالاً', en: 'questions' },
                    { v: '4', ar: 'أنماط قيادية', en: 'leadership styles' }
                ],
                files: ['aus_01_data.js', 'aus_02_core.js'],
                open: [{ tab: "showSection('leadership')", ar: 'الشخصية القيادية', en: 'Leadership' }]
            },

            {
                id: 'challenges', cat: 'sim', icon: '🧠', c: '#00d4ff', mode: 'offline', sub: 'Smart Challenges · Best Action',
                ar: {
                    n: 'تحديات الذكاء وأفضل تصرف',
                    t: 'مواقف عمل واقعية في كل تخصص: تحدٍّ بنقاط وقلوب، وموقف بأربعة تصرفات تعرف لماذا أحدها الأفضل.',
                    w: 'نظامان متكاملان للتدريب على القرار. «تحديات الذكاء» سيناريوهات أعمال في كل تخصص تُكافأ فيها قراراتك بنقاط XP متفاوتة. «أفضل تصرف» مواقف حقيقية من الشركات بأربعة تصرفات محتملة، يُبيَّن لكل منها ما له وما عليه.',
                    h: [
                        'تختار تخصصاً فتُسحب لك {{challengesPer}} سيناريوهات من بنك التخصص بترتيب وخيارات مخلوطة.',
                        'في «التحديات» لكل خيار قيمة XP مختلفة بحسب جودة القرار، وتخسر قلباً عند القرار السيّئ.',
                        'في «أفضل تصرف» تختار التصرف الأنسب من أربعة، ثم يُكشف التصرف الأفضل مع تحليل لإيجابيات كل خيار وسلبياته.',
                        'تُسجَّل إجاباتك في سجلّ حسابك لتظهر في «إجاباتي ونتائجي».'
                    ],
                    x: [
                        'البيانات محلية (challengesData وactionsData في aus_01_data.js) والمنطق في aus_02_core.js؛ يعمل دون اتصال.',
                        'موضع الإجابة الصحيحة يُوزَّع على الخيارات بشكل متوازن (balancedPositions) حتى لا يمكن تخمين النمط.'
                    ],
                    e: ['تتعلّم التفكير في المقايضات: لا توجد إجابة سحرية واحدة، بل قرار أفضل في سياق معيّن.'],
                    a: ['تدريب على مواقف تشبه ما ستواجهه في الإدارة، مع تغذية راجعة فورية تصحّح طريقة تفكيرك.']
                },
                en: {
                    n: 'Smart Challenges & Best Action',
                    t: 'Realistic work situations in every specialty: a challenge with points and hearts, and a scenario with four actions where you learn why one is best.',
                    w: 'Two complementary systems for practising decisions. “Smart Challenges” are business scenarios in every specialty where your decisions earn different amounts of XP. “Best Action” presents real company situations with four possible actions, and shows the pros and cons of each.',
                    h: [
                        'Pick a specialty and {{challengesPer}} scenarios are drawn from its bank, with shuffled order and options.',
                        'In Challenges each option carries a different XP value according to the quality of the decision, and a poor decision costs a heart.',
                        'In Best Action you choose the most suitable of four actions, then the best one is revealed along with the advantages and drawbacks of each option.',
                        'Your answers are recorded in your account history so they appear in “My answers & results”.'
                    ],
                    x: [
                        'The data is local (challengesData and actionsData in aus_01_data.js) with the logic in aus_02_core.js; it works offline.',
                        'The position of the correct answer is distributed evenly across the options (balancedPositions) so the pattern cannot be guessed.'
                    ],
                    e: ['You learn to think in trade-offs: there is no single magic answer, only a better decision in a given context.'],
                    a: ['Practice on situations that look like what you will face in management, with instant feedback that corrects how you think.']
                },
                facts: [
                    { v: '{{challengesPer}}', ar: 'سيناريوهات لكل تخصص', en: 'scenarios per specialty' },
                    { v: '{{specialties}}', ar: 'تخصصات', en: 'specialties' }
                ],
                files: ['aus_01_data.js', 'aus_02_core.js', 'student_data.js'],
                open: [
                    { tab: "showSection('challenges')", ar: 'التحديات', en: 'Challenges' },
                    { tab: "showSection('actions')", ar: 'أفضل تصرف', en: 'Best Action' }
                ]
            },

            {
                id: 'crisis', cat: 'sim', icon: '⚡', c: '#ff006e', mode: 'hybrid', sub: 'AI Crisis Simulator',
                ar: {
                    n: 'محاكي الأزمات',
                    t: '{{crises}} أزمات إدارية حرجة، {{crisisStages}} مراحل لكل أزمة، وقرارات تحت ضغط الوقت يقيّمها الذكاء الاصطناعي.',
                    w: 'غرفة عمليات تحاكي أزمات حقيقية: علاقات عامة، انهيار السوق، هجوم إلكتروني، انهيار مالي (شريك رئيسي يُنهي العقد)، وصراع داخل الفريق. تتولّى القيادة فتتخذ قراراً في كل مرحلة وتنتقل المحاكاة إلى مرحلة أصعب.',
                    h: [
                        'تختار نوع الأزمة فتقرأ مقدّمتها ومستوى إلحاحها.',
                        'تمرّ بمراحل حرجة؛ في كل مرحلة موقف وسؤال وثلاثة قرارات ممكنة، ولديك {{crisisSec}} ثانية للاختيار.',
                        'بعد كل قرار يحلّله الذكاء الاصطناعي ويعطيك درجة من 100 وسمة قيادية وتقييماً ونصيحة للمرحلة التالية.',
                        'في النهاية تحصل على تقدير (S / A / B / C / D) وسجلّ قراراتك وتحليل لأدائك القيادي، ويمكنك إعادة الأزمة أو تجربة أخرى.'
                    ],
                    x: [
                        'البيانات في aus_07_studio.js (CRISIS_DATA)، وتقييم القرار يُرسَل كطلب إلى الخادم (/api/chat) ويُنتظر ردّ JSON فيه الدرجة والسمة والتقييم.',
                        'إذا تعذّر الاتصال يستمر التدريب بدرجة أساسية مُعدّة سلفاً لكل خيار، فلا ينقطع التمرين دون إنترنت.'
                    ],
                    e: ['تتعلّم إدارة الأولويات تحت الضغط: ما الذي يُقدَّم أولاً، ومن تُخاطب، وكيف توازن بين السمعة والمال.'],
                    a: ['تدريب على قرارات حقيقية في بيئة آمنة، وتغذية راجعة على سمات قيادتك — كالشجاعة والحكمة الاستراتيجية.']
                },
                en: {
                    n: 'Crisis Simulator',
                    t: '{{crises}} critical management crises, {{crisisStages}} stages each, and timed decisions evaluated by AI.',
                    w: 'An operations room that simulates real crises: public relations, a market collapse, a cyber attack, a financial collapse (a key partner ends the contract) and a team conflict. You take the lead and make a decision at every stage, and the simulation moves on to a harder one.',
                    h: [
                        'Choose the crisis type and read its introduction and urgency level.',
                        'You go through critical stages; each has a situation, a question and three possible decisions, and you have {{crisisSec}} seconds to choose.',
                        'After each decision the AI analyses it and gives you a score out of 100, a leadership trait, an assessment and advice for the next stage.',
                        'At the end you get a grade (S / A / B / C / D), a log of your decisions and an analysis of your leadership performance, and you can replay the crisis or try another.'
                    ],
                    x: [
                        'The data is in aus_07_studio.js (CRISIS_DATA); the decision evaluation is sent as a request to the server (/api/chat) and a JSON reply with the score, trait and assessment is expected.',
                        'If the connection fails, training carries on with a preset baseline score for each option, so practice never stops offline.'
                    ],
                    e: ['You learn to manage priorities under pressure: what comes first, who you address, and how to balance reputation and money.'],
                    a: ['Training on real decisions in a safe environment, with feedback on your leadership traits — such as courage and strategic wisdom.']
                },
                facts: [
                    { v: '{{crises}}', ar: 'أزمات', en: 'crises' },
                    { v: '{{crisisStages}}', ar: 'مراحل لكل أزمة', en: 'stages each' },
                    { v: '{{crisisSec}}', ar: 'ثانية لكل قرار', en: 'seconds per decision' }
                ],
                files: ['aus_07_studio.js'],
                open: [{ tab: "showSection('crisis')", ar: 'أزمة AI', en: 'AI Crisis' }]
            },

            {
                id: 'interview', cat: 'sim', icon: '👔', c: '#00d4ff', mode: 'server', sub: 'AI Interview Simulator',
                ar: {
                    n: 'مقابلة AI',
                    t: 'مقابلات عمل تدريبية في {{interviewCats}} مجالات، وكل إجابة تُقيَّم على خمسة معايير معروفة الأوزان مع ملاحظات وكيف تحسّنها.',
                    w: 'مُقابِل ذكي يدرّبك على مقابلات العمل: الموارد البشرية، القيادة، الأعمال، دراسة الحالة، ريادة الأعمال، التفاوض، والقرار المالي. ترى معايير التقييم وأوزانها قبل أن تبدأ، ثم تجيب كتابةً أو بصوتك (يتحوّل كلامك إلى نص تعدّله قبل الإرسال). لكل نوع مقابلة خمسة معايير بأوزان ثابتة؛ يمنح الذكاء الاصطناعي درجة من 0 إلى 5 لكل معيار مع اقتباس من إجابتك، ويحسب الخادم الدرجة الكلية من 100.',
                    h: [
                        'تختار نوع المقابلة (متوسطة أو متقدمة الصعوبة) فتظهر لك معايير تقييمها وأوزانها، ثم تبدأ.',
                        'تجيب عن الأسئلة ({{interviewQ}} أسئلة لكل نوع) كتابةً أو بالميكروفون: يظهر كلامك نصاً قابلاً للتعديل مع مؤقّت وإمكانية الإلغاء، ولا تُرسَل إجابة فارغة.',
                        'بعد كل إجابة تصلك الدرجة الكلية ودرجة كل معيار مع اقتباس من كلامك، وما أحسنتَ فيه وما ينقص وكيف تحسّنه ومثال لإجابة أقوى، ثم تعليق المُقابِل وسؤال متابعة اختياري.',
                        'في النهاية تظهر نتيجتك الإجمالية ومتوسط كل معيار وتقرير مختصر، ويُحفظ سجلّ آخر مقابلاتك. إن أغلقتَ الصفحة في المنتصف تستأنف من حيث توقفت.'
                    ],
                    x: [
                        'التقييم يحتاج الخادم والذكاء الاصطناعي (POST /api/interview/evaluate): الخادم يطلب من النموذج درجات المعايير ثم يحسب المجموع بنفسه من الأوزان — لا يأخذه من النموذج. وإن تعذّر الاتصال أو لم يُضبط مفتاح الذكاء الاصطناعي أو جاء ردٌّ لا يطابق المعايير تظهر رسالة صريحة وزرّ «إعادة المحاولة»؛ لا تُعرض درجة تقديرية بديلة أبداً.',
                        'الصوت: التعرّف المدمج في المتصفح (Chrome / Edge / Safari) أو، حين يُفعَّل التفريغ على الخادم (OPENAI_API_KEY)، تسجيل صوتك وتفريغه على الخادم. الميكروفون يُحرَّر عند الإيقاف أو الإلغاء أو مغادرة القسم (aus_54_mic.js).',
                        'لا يُقيَّم النطق ولا اللهجة ولا سرعة الكلام — مضمون الإجابة فقط. وإجابات الصوت تُعامَل كنص مفرَّغ قد يحوي أخطاء تعرّف.'
                    ],
                    e: ['تتعلّم ما الذي يجعل الإجابة قوية — صلة، منطق، أدلة وأمثلة، واقعية، وعي بالمخاطر — ولماذا نالت درجتها.'],
                    a: ['تتدرّب على أسئلة التوظيف الحقيقية قبل المقابلة الفعلية، وترى بالضبط أين تحتاج إلى التحسين.']
                },
                en: {
                    n: 'AI Interview',
                    t: 'Practice job interviews in {{interviewCats}} fields; every answer is assessed on five criteria with known weights, with feedback and how to improve.',
                    w: 'A smart interviewer that trains you for job interviews: HR, leadership, business, case study, startup founder, negotiation and financial decisions. You see the criteria and their weights before you start, then answer by typing or by voice (your speech becomes text you can edit before sending). Each interview type has five criteria with fixed weights; the AI gives each criterion a 0–5 score with a quote from your answer, and the server calculates the overall score out of 100.',
                    h: [
                        'Choose the interview type (medium or advanced difficulty); its assessment criteria and weights appear; then begin.',
                        'Answer the questions ({{interviewQ}} per type) by typing or with the microphone: your speech appears as editable text with a timer and a cancel button, and an empty answer is never sent.',
                        'After each answer you get the overall score and a score for each criterion with a quote from your words, what you did well, what is missing, how to improve it and an example of a stronger answer, then the interviewer’s comment and an optional follow-up question.',
                        'At the end you see your overall result, the average of each criterion and a short report, and your recent interviews are kept. If you close the page halfway you can resume where you stopped.'
                    ],
                    x: [
                        'Assessment needs the server and the AI (POST /api/interview/evaluate): the server asks the model for criterion scores and then calculates the total itself from the weights — it does not take it from the model. If the connection fails, no AI key is configured or the reply does not fit the criteria, a clear message and a “Try again” button appear; a substitute estimated score is never shown.',
                        'Voice: the browser’s built-in recognition (Chrome / Edge / Safari) or, when server transcription is enabled (OPENAI_API_KEY), your voice is recorded and transcribed on the server. The microphone is released on stop, cancel or when you leave the section (aus_54_mic.js).',
                        'Pronunciation, accent and speaking speed are not assessed — only the content of the answer. Voice answers are treated as a transcript that may contain recognition errors.'
                    ],
                    e: ['You learn what makes an answer strong — relevance, reasoning, evidence and examples, practicality, risk awareness — and why it earned its score.'],
                    a: ['You rehearse real hiring questions before the actual interview and see exactly where you need to improve.']
                },
                facts: [
                    { v: '{{interviewCats}}', ar: 'أنواع مقابلات', en: 'interview types' },
                    { v: '{{interviewQ}}', ar: 'أسئلة لكل نوع', en: 'questions each' },
                    { v: '5', ar: 'معايير تقييم بأوزان ثابتة', en: 'weighted criteria' }
                ],
                files: ['aus_55_interview.js', 'aus_54_mic.js', 'aus_07_studio.js'],
                open: [{ tab: "showSection('interview')", ar: 'مقابلة AI', en: 'AI Interview' }]
            },

            {
                id: 'career', cat: 'sim', icon: '🧬', c: '#00f5d4', mode: 'hybrid', sub: 'Career DNA · AI Roadmap',
                ar: {
                    n: 'Career DNA وخارطة AI',
                    t: 'تحليل بصمتك المهنية في {{cdnaQ}} سؤالاً، ثم خارطة طريق مخصّصة نحو هدفك المهني.',
                    w: 'نظامان مترابطان للتخطيط المهني. Career DNA يحلّل سماتك (تحليلي، إبداعي، اجتماعي، تنفيذي، استراتيجي) ويوصي بأنسب التخصصات. خارطة AI تصمّم لك مساراً مخصّصاً بحسب تخصصك وسنتك الدراسية وهدفك المهني.',
                    h: [
                        'في Career DNA تجيب عن {{cdnaQ}} سؤالاً (نحو ثلاث دقائق) فتظهر نسب سماتك الخمس ونمطك الشخصي بنقاط قوته وضعفه.',
                        'ترى أنسب تخصصاتك مرتّبة بنسب التطابق (أفضل ستة)، مع دورات مقترحة تناسب سمتك الأبرز.',
                        'في خارطة AI تُدخل اسمك وتخصصك وسنتك الدراسية وهدفك المهني (قيادة تنفيذية، ريادة، استشارات، تحليل مالي…) فيُولَّد مسار مفصّل بالمهارات والخطوات.',
                        'أنماط Career DNA نفسها تُصنَّف بها كتب المتجر وملفاته.'
                    ],
                    x: [
                        'Career DNA يعمل محلياً: يحسب أوزان كل إجابة على السمات الخمس ثم يطابقها مع أوزان التخصصات (aus_07_studio.js).',
                        'الخارطة تُولَّد بطلب للذكاء الاصطناعي عبر الخادم، وعند تعذّر الاتصال يُنشأ مسار احتياطي جاهز من بياناتك.'
                    ],
                    e: ['تكتشف ميولك المهنية قبل اختيار المسار، وتربطها بالتخصصات المتاحة.'],
                    a: ['خطة واضحة لسنواتك الدراسية المتبقية (مهارات، شهادات، خبرات) بدل التخبّط.']
                },
                en: {
                    n: 'Career DNA & AI Roadmap',
                    t: 'Analyse your career fingerprint in {{cdnaQ}} questions, then get a roadmap tailored to your career goal.',
                    w: 'Two linked career-planning systems. Career DNA analyses your traits (analytical, creative, social, executive, strategic) and recommends the most suitable specialties. The AI Roadmap designs a personalised path based on your specialty, study year and career goal.',
                    h: [
                        'In Career DNA you answer {{cdnaQ}} questions (about three minutes) and see the percentages of your five traits and your personality type with its strengths and weaknesses.',
                        'You see your best-matching specialties ranked by match percentage (top six), with suggested courses that suit your strongest trait.',
                        'In the AI Roadmap you enter your name, specialty, study year and career goal (executive leadership, entrepreneurship, consulting, financial analysis…) and a detailed path of skills and steps is generated.',
                        'The same Career DNA types are used to classify the store’s books and files.'
                    ],
                    x: [
                        'Career DNA runs locally: it adds up each answer’s weights across the five traits, then matches them against specialty weights (aus_07_studio.js).',
                        'The roadmap is generated by an AI request through the server; if the connection fails a ready-made fallback path is built from your inputs.'
                    ],
                    e: ['You discover your career inclinations before choosing a path, and link them to the specialties available.'],
                    a: ['A clear plan for your remaining study years (skills, certificates, experience) instead of drifting.']
                },
                facts: [
                    { v: '{{cdnaQ}}', ar: 'سؤالاً', en: 'questions' },
                    { v: '5', ar: 'سمات', en: 'traits' },
                    { v: '6', ar: 'تخصصات مقترحة', en: 'suggested specialties' }
                ],
                files: ['aus_07_studio.js'],
                open: [
                    { tab: "showSection('careerdna')", ar: 'Career DNA', en: 'Career DNA' },
                    { tab: "showSection('roadmap')", ar: 'خارطة AI', en: 'AI Roadmap' }
                ]
            },

            /* ───────────────────────── الذكاء الاصطناعي والمساعدة ───────────────────────── */
            {
                id: 'ceoai', cat: 'ai', icon: '🤖', c: '#9d4edd', mode: 'hybrid', sub: 'CEO AI · Smart Chat',
                ar: {
                    n: 'CEO AI — المحادثة الذكية',
                    t: 'مساعدك الذكي المتاح على مدار الساعة: يجيب في الأعمال وغيرها، يتذكّر محادثتك، ويقرأ ردوده بصوت مسموع.',
                    w: 'المحادثة الذكية في قلب المنصة. تسأله عن أي شيء — من إطار SWOT إلى خطة مهنية — فيجيب بعمق بالعربية أو الإنجليزية. يمكنك تفعيل «وضع المستشار التنفيذي» ليقدّم أطراً وتوصيات منظّمة، أو الاكتفاء بالمحادثة الحرة.',
                    h: [
                        'تكتب سؤالك (أو تتحدّث عبر الميكروفون) فيظهر الردّ تدريجياً كأنه يُكتب أمامك، مع المراجع في أسفله.',
                        'تحت كل ردّ أزرار: نسخ، استماع (قراءة صوتية)، إعادة توليد، إعجاب أو عدم إعجاب، واقتراحات لأسئلة متابعة.',
                        'يتذكّر آخر 40 رسالة ليكمل السياق، ويفهم أسئلتك عن أدوات المنصة وتخصصاتها وأنماط القيادة.',
                        'عند انقطاع الخادم يجيب محرّك محلي مبني على قاعدة معرفة المنصة بدل أن يتوقف.'
                    ],
                    x: [
                        'الواجهة في aus_02_core.js وaus_04_conversational.js وaus_07_studio.js (عرض Markdown مع الجداول والكود)، والردّ يصل من الخادم FastAPI عبر /api/chat/stream (بثّ SSE).',
                        'طبقة الذكاء الاصطناعي في الخادم (ai_layer.py): Claude أولاً ثم OpenAI ثم وضع محلي تجريبي، مع إعادة المحاولة ومهلة زمنية وحدود للمعدّل.',
                        'موجّه النظام يجعله مساعداً عاماً ثنائي اللغة يتتبّع ملف الطالب (السنة والتخصص والاهتمامات) ليضبط عمق الشرح.'
                    ],
                    e: ['مدرّس خصوصي متاح دائماً يشرح بالأمثلة ويجيب عن «لماذا» وليس «ما» فقط.'],
                    a: ['أسرع طريق لتحويل سؤال عملي — خطة، تحليل، مقارنة — إلى إجابة منظّمة تبني عليها.']
                },
                en: {
                    n: 'CEO AI — Smart Chat',
                    t: 'Your smart assistant, available around the clock: it answers on business and beyond, remembers your conversation and reads its answers aloud.',
                    w: 'The smart chat at the heart of the platform. Ask it anything — from the SWOT framework to a career plan — and it answers in depth in Arabic or English. You can switch on “Executive Consultant mode” for structured frameworks and recommendations, or keep to free conversation.',
                    h: [
                        'Type your question (or speak through the microphone) and the answer appears gradually as if being written in front of you, with references below it.',
                        'Under every answer are buttons: copy, listen (read aloud), regenerate, like or dislike, and suggested follow-up questions.',
                        'It remembers the last 40 messages to keep context, and understands questions about the platform’s tools, specialties and leadership styles.',
                        'When the server is unreachable, a local engine built on the platform’s knowledge base answers instead of stopping.'
                    ],
                    x: [
                        'The interface is in aus_02_core.js, aus_04_conversational.js and aus_07_studio.js (Markdown rendering with tables and code), and the answer arrives from the FastAPI server through /api/chat/stream (SSE streaming).',
                        'The server’s AI layer (ai_layer.py) goes Claude first, then OpenAI, then a local demo mode, with retries, a timeout and rate limits.',
                        'The system prompt makes it a general bilingual assistant that tracks the student’s profile (year, specialty, interests) to tune the depth of its explanations.'
                    ],
                    e: ['An always-available tutor that explains with examples and answers “why”, not only “what”.'],
                    a: ['The fastest way to turn a practical question — a plan, an analysis, a comparison — into a structured answer you can build on.']
                },
                facts: [
                    { v: '24/7', ar: 'متاح دائماً', en: 'always on' },
                    { v: '40', ar: 'رسالة في الذاكرة', en: 'messages remembered' },
                    { v: 'AR / EN', ar: 'لغتان', en: 'languages' }
                ],
                files: ['aus_02_core.js', 'aus_04_conversational.js', 'aus_07_studio.js', 'main.py', 'ai_layer.py'],
                open: [{ tab: "showSection('ceoai')", ar: 'CEO AI', en: 'CEO AI' }]
            },

            {
                id: 'study', cat: 'ai', icon: '📚', c: '#00d4ff', mode: 'server', sub: 'AI Study Assistant',
                ar: {
                    n: 'مساعد الدراسة',
                    t: 'ارفع محاضرتك أو الصق نصّها، ثم اسأل واحصل على بطاقات واختبارات وملخّص وخطة دراسة.',
                    w: 'مساعد دراسي يعمل على مادتك أنت: ترفع ملفاً (TXT أو PDF أو Markdown) أو تلصق النص، وتحدّد اسم المادة ومستوى الشرح (مبسّط، متوسط، متقدّم)، فيتحوّل المحتوى إلى جلسة دراسية تفاعلية.',
                    h: [
                        'تبدأ الجلسة فتحاور المساعد عن مادتك: تسأله عن تعريف أو مقارنة أو ملخّص فيجيب اعتماداً على النص الذي قدّمته.',
                        'تحوّل المادة إلى بطاقات تعليمية (Flashcards) تقلبها وتراجعها.',
                        'تولّد اختباراً قصيراً على المادة لتقيس فهمك، وملخّصاً منظّماً، وخطة دراسة مرتّبة.'
                    ],
                    x: [
                        'الردّ يصل بالبثّ المباشر (SSE) من /api/chat/stream، وتُبنى الطلبات من نص مادتك وسجلّ المحادثة ومستوى الشرح.',
                        'حالة الجلسة (الرسائل والبطاقات والاختبار) تُحفظ أثناء الجلسة؛ ويحتاج الذكاء الاصطناعي إلى الاتصال بالخادم (aus_08_study_features.js).'
                    ],
                    e: ['تذاكر موادك بنفسك بدل الاكتفاء بمحتوى جاهز: أسئلة وبطاقات واختبارات على كتابك أنت.'],
                    a: ['توفّر وقت المراجعة قبل الامتحان بتحويل ساعات القراءة إلى ملخّص وخطة قابلين للتنفيذ.']
                },
                en: {
                    n: 'Study Assistant',
                    t: 'Upload your lecture or paste its text, then ask questions and get flashcards, quizzes, a summary and a study plan.',
                    w: 'A study assistant that works on your own material: upload a file (TXT, PDF or Markdown) or paste the text, set the subject name and explanation level (simple, medium, advanced), and the content turns into an interactive study session.',
                    h: [
                        'Start the session and talk to the assistant about your material: ask for a definition, a comparison or a summary and it answers based on the text you provided.',
                        'Turn the material into flashcards you flip and review.',
                        'Generate a short quiz on the material to measure your understanding, plus a structured summary and an ordered study plan.'
                    ],
                    x: [
                        'Answers arrive by live streaming (SSE) from /api/chat/stream, and requests are built from your material’s text, the conversation history and the explanation level.',
                        'The session state (messages, flashcards, quiz) is kept during the session; the AI needs a connection to the server (aus_08_study_features.js).'
                    ],
                    e: ['You quiz yourself on your own material instead of settling for ready-made content: questions, cards and tests on your own book.'],
                    a: ['It saves revision time before an exam by turning hours of reading into a summary and a plan you can act on.']
                },
                facts: [
                    { v: '5', ar: 'أنماط عمل', en: 'work modes' }
                ],
                files: ['aus_08_study_features.js', 'main.py'],
                open: [{ tab: "showSection('study')", ar: 'مساعد الدراسة', en: 'Study Assistant' }]
            },

            {
                id: 'voice', cat: 'ai', icon: '🎙️', c: '#ff9500', mode: 'hybrid', sub: 'Voice AI · Module Guide · Translator',
                ar: {
                    n: 'الصوت والترجمة',
                    t: 'أصوات بلهجات عربية وأجنبية، وتحدّث مباشر مع المساعد، وشرح صوتي عند دخول كل نظام.',
                    w: 'طبقة صوتية تجعل المنصة تتحدّث وتستمع: قراءة الردود بأصوات بلهجات عربية (سعودي، سوري، أردني، إماراتي، مصري) وبالإنجليزية والفرنسية والألمانية والإسبانية، وميكروفون للتحدّث مع المساعد، ومرشد صوتي يشرح كل نظام عند دخوله، وزر ترجمة AR↔EN بجانب أسئلة الأنظمة.',
                    h: [
                        'من الإعدادات ← الصوت تختار جنس الصوت واللهجة والسرعة والإحساس (طبيعي / دافئ / حماسي) وتجرّب الصوت قبل اعتماده.',
                        'عند تفعيل «صوت الذكاء الاصطناعي» تُقرأ ردود المساعد، وزر «استمع» يقرأ أي ردّ عند الطلب.',
                        'المرشد الصوتي يتحدّث مرة واحدة لكل نظام في الجلسة ويضع زر «شرح صوتي» لإعادة الاستماع.',
                        'زر الترجمة يعرض ترجمة السؤال أو خياراته بجانبه لتفهم بالعربية وتجيب بالإنجليزية.'
                    ],
                    x: [
                        'الخادم يولّد ملفات MP3 عبر /api/voice/synthesize بـ 20 صوتاً (10 عربية و10 أجنبية)، فيستخدم ElevenLabs إن توفّر مفتاحه، وإلا Edge TTS عند تفعيله ثم gTTS.',
                        'إن لم يتوفّر الخادم يتحوّل الكلام تلقائياً إلى Web Speech API في المتصفح دون تغيير الواجهة (aus_06_voice_agent.js).',
                        'الميكروفون يستخدم SpeechRecognition في المتصفح بنظام الضغط للتحدّث.'
                    ],
                    e: ['تعلّم بالاستماع: النطق الصحيح للمصطلحات والشرح المسموع يدعمان من يفضّل التعلّم السمعي.'],
                    a: ['إتاحة أوسع: يستفيد منها من يصعب عليه القراءة الطويلة، ويستخدمها الطالب أثناء التنقّل.']
                },
                en: {
                    n: 'Voice & Translation',
                    t: 'Voices in Arabic dialects and foreign languages, direct speech with the assistant, and a spoken guide on entering each system.',
                    w: 'A voice layer that lets the platform speak and listen: it reads answers in Arabic-dialect voices (Saudi, Syrian, Jordanian, Emirati, Egyptian) and in English, French, German and Spanish, adds a microphone for talking to the assistant, a spoken guide that explains each system when you enter it, and an AR↔EN translate button next to system questions.',
                    h: [
                        'In Settings → Audio you choose the voice gender, dialect, speed and feel (natural / warm / energetic), and preview the voice before applying it.',
                        'With “AI voice” on, the assistant’s answers are read aloud, and the “Listen” button reads any answer on demand.',
                        'The spoken guide talks once per system in a session and adds a “voice explanation” button to listen again.',
                        'The translate button shows a translation of the question or its options beside it so you can understand in Arabic and answer in English.'
                    ],
                    x: [
                        'The server generates MP3 files through /api/voice/synthesize with 20 voices (10 Arabic and 10 foreign), using ElevenLabs when its key is present, otherwise Edge TTS when enabled and then gTTS.',
                        'If the server is unavailable, speech switches automatically to the browser’s Web Speech API without changing the interface (aus_06_voice_agent.js).',
                        'The microphone uses the browser’s SpeechRecognition in a push-to-talk style.'
                    ],
                    e: ['Learning by listening: correct pronunciation of terms and spoken explanations support those who prefer auditory learning.'],
                    a: ['Wider accessibility: it helps those who find long reading hard, and students can use it on the move.']
                },
                facts: [
                    { v: '20', ar: 'صوتاً', en: 'voices' },
                    { v: '5', ar: 'لهجات عربية', en: 'Arabic dialects' }
                ],
                files: ['aus_06_voice_agent.js', 'aus_32_module_voice.js', 'aus_33_translator.js', 'voice.py'],
                open: [{ call: 'toggleSettings', ar: 'إعدادات الصوت', en: 'Audio settings' }]
            },

            /* ───────────────────────── ريادة الأعمال ───────────────────────── */
            {
                id: 'venture', cat: 'venture', icon: '🚀', c: '#00f5d4', mode: 'hybrid', sub: 'Entrepreneurship Ecosystem · Incubator',
                ar: {
                    n: 'منظومة ريادة الأعمال والحاضنات',
                    t: '{{ventureMods}} وحدات تأخذ فكرتك من المحاكاة والتدريب إلى الحاضنة والمستثمرين والجودة.',
                    w: 'منظومة متكاملة لبناء مشروع ناشئ داخل الجامعة: تبدأ بمحاكاة إدارة شركة، وتمرّ بمدرّب ريادي وحاضنة رقمية، وتنتهي بسوق للمشاريع وتقييم جاهزية للاستثمار ومعايير جودة. تُحفظ مشاريعك محلياً في متصفحك، وتستعين الوحدات الذكية بالذكاء الاصطناعي عند توفّر الخادم.',
                    h: [
                        'تبدأ بـ Business Simulator: تختار دوراً (CEO وCMO وCFO وCOO ومدير موارد بشرية أو رائد أعمال) وحجم شركة (ناشئة أو متوسطة أو كبرى)، وتخوض {{simRounds}} جولات قرارات تتابع أثرها على الإيرادات والأرباح والتدفق النقدي والحصة السوقية ورضا العملاء ومعنويات الفريق.',
                        'مدرّب AI Coach يرافقك على مدار الساعة بمواضيع مرتّبة على مراحل الفكرة والإطلاق والتوسّع: تمويل، MVP، تأسيس قانوني، تسويق، عرض المستثمرين، جولات الاستثمار…',
                        'تسجّل فكرتك في الحاضنة فتنتقل بها عبر ست مراحل (Idea ← Validation ← MVP ← Traction ← Growth ← Scale) بمعالم محدّدة لكل مرحلة.',
                        'تعرض مشروعك في سوق المشاريع وتتصفّح دليل المستثمرين الإقليميين، وتقيس جاهزيتك للاستثمار في سبعة أبعاد، وتفحص أصالة فكرتك وتشارك في تحديات الابتكار، وتتابع جودة مشروعك وفق معايير عالمية.'
                    ],
                    x: [
                        'كل وحدة ملف مستقل (من aus_21 إلى aus_30) تُسجَّل في سجل الوحدات (_AUS_REGISTRY) وتتواصل عبر ناقل أحداث، فيمكن تعطيل أي وحدة دون التأثير في بقية المنصة.',
                        'بيانات كل وحدة محلية في localStorage (مثل aus.incubator.projects وaus.founder.profile)، وتستدعي الوحدات الذكية الذكاء الاصطناعي عبر _AUS_AI عند توفّر الخادم.',
                        'سوق المشاريع لا يحتوي مشاريع تجريبية: كل إدراج يأتي من حساب طالب أو دكتور حقيقي.'
                    ],
                    e: ['تنتقل من النظرية إلى التطبيق: تدير شركة افتراضية أولاً ثم تبني مشروعك خطوة بخطوة بمنهج الحاضنات.'],
                    a: ['تخرج بملف مشروع متكامل — فكرة وفريق ومعالم وتقييم جاهزية ومعايير جودة — يصلح للعرض في مسابقات وحاضنات ولدى المستثمرين.']
                },
                en: {
                    n: 'Entrepreneurship & Incubator Ecosystem',
                    t: '{{ventureMods}} modules that take your idea from simulation and coaching to the incubator, investors and quality.',
                    w: 'An integrated ecosystem for building a startup inside the university: it starts with a company-management simulation, passes through an entrepreneurship coach and a digital incubator, and ends with a project marketplace, an investment-readiness score and quality standards. Your projects are kept locally in your browser, and the smart modules use AI when the server is available.',
                    h: [
                        'Start with the Business Simulator: choose a role (CEO, CMO, CFO, COO, HR Director or Entrepreneur) and a company size (startup, SME or corporation), then play {{simRounds}} decision rounds and watch their effect on revenue, profit, cash flow, market share, customer satisfaction and team morale.',
                        'The AI Coach accompanies you around the clock with topics arranged by idea, launch and scale stages: funding, MVP, legal set-up, marketing, investor pitch, funding rounds…',
                        'Register your idea in the incubator and move it through six stages (Idea → Validation → MVP → Traction → Growth → Scale), each with defined milestones.',
                        'List your project in the marketplace and browse the directory of regional investors, measure your investment readiness across seven dimensions, check the originality of your idea and join innovation challenges, and track your project’s quality against global standards.'
                    ],
                    x: [
                        'Each module is a separate file (aus_21 to aus_30) registered in the module registry (_AUS_REGISTRY) and communicating through an event bus, so any module can be disabled without affecting the rest of the platform.',
                        'Each module’s data is local in localStorage (for example aus.incubator.projects and aus.founder.profile), and the smart modules call AI through _AUS_AI when the server is available.',
                        'The marketplace contains no demo projects: every listing comes from a real student or doctor account.'
                    ],
                    e: ['You move from theory to practice: run a virtual company first, then build your own venture step by step with the incubator method.'],
                    a: ['You leave with a complete project file — idea, team, milestones, readiness score and quality standards — ready to show at competitions, incubators and to investors.']
                },
                facts: [
                    { v: '{{ventureMods}}', ar: 'وحدات', en: 'modules' },
                    { v: '6', ar: 'أدوار في المحاكاة', en: 'simulation roles' },
                    { v: '6', ar: 'مراحل في الحاضنة', en: 'incubator stages' },
                    { v: '7', ar: 'أبعاد لتقييم الجاهزية', en: 'readiness dimensions' }
                ],
                files: ['aus_21_biz_sim.js', 'aus_22_coach.js', 'aus_23_incubator.js', 'aus_25_marketplace.js', 'aus_26_invest_ready.js', 'aus_27_innovation.js', 'aus_28_founder.js', 'aus_29_analytics.js', 'aus_30_quality.js'],
                parts: [
                    { icon: '🏢', ar: { t: 'Business Simulator', d: 'محاكاة إدارة شركة بأدوار وأحجام مختلفة وخمس جولات قرارات وتقرير نهائي.' },
                      en: { t: 'Business Simulator', d: 'Company-management simulation with different roles and sizes, five decision rounds and a final report.' },
                      open: { tab: "showSection('biz-sim')" } },
                    { icon: '🧭', ar: { t: 'AI Coach', d: 'مدرّب ريادي 24/7 باثني عشر موضوعاً على ثلاث مراحل، ويظهر أيضاً كمساعد عائم.' },
                      en: { t: 'AI Coach', d: 'A 24/7 entrepreneurship coach with twelve topics across three stages, also available as a floating assistant.' },
                      open: { tab: "showSection('coach')" } },
                    { icon: '🌱', ar: { t: 'Incubator', d: 'حاضنة رقمية: سجّل فكرتك، كوّن فريقك، وتابع معالم ست مراحل مع ملاحظات الخبراء.' },
                      en: { t: 'Incubator', d: 'A digital incubator: submit your idea, form your team and track six stages of milestones with expert feedback.' },
                      open: { tab: "showSection('incubator')" } },
                    { icon: '🏪', ar: { t: 'Marketplace & Investor Hub', d: 'سوق للمشاريع بفلتر قطاعات ودليل للمستثمرين الإقليميين ومسار الاستثمار.' },
                      en: { t: 'Marketplace & Investor Hub', d: 'A project marketplace with sector filters, a directory of regional investors and an investment pipeline.' },
                      open: { tab: "showSection('marketplace')" } },
                    { icon: '💎', ar: { t: 'Invest Ready', d: 'تقييم جاهزية للاستثمار في سبعة أبعاد: الفريق، السوق، الابتكار، التوسّع، نموذج الأعمال، المالية، الجذب.' },
                      en: { t: 'Invest Ready', d: 'An investment-readiness score across seven dimensions: team, market, innovation, scalability, business model, financials, traction.' },
                      open: { tab: "showSection('invest-ready')" } },
                    { icon: '💡', ar: { t: 'Innovation Center', d: 'مركز للابتكار وبراءات الاختراع: قدّم فكرتك، افحص جدّتها، وشارك في لوحة التحديات.' },
                      en: { t: 'Innovation Center', d: 'A patent and innovation centre: submit your idea, check its novelty and join the challenge board.' },
                      open: { tab: "showSection('innovation')" } },
                    { icon: '🧑‍🚀', ar: { t: 'Founder Profile', d: 'ملف المؤسس ومركز تعلّم ريادي بمسارات ودورات واختبارات.' },
                      en: { t: 'Founder Profile', d: 'A founder profile and an entrepreneurship learning centre with tracks, courses and quizzes.' },
                      open: { tab: "showSection('founder-profile')" } },
                    { icon: '📈', ar: { t: 'Analytics Hub', d: 'لوحة صدارة وشارات وسلاسل وخريطة حرارية للتقدّم وإحصاءات استخدام الوحدات وتصدير.' },
                      en: { t: 'Analytics Hub', d: 'A leaderboard, badges, streaks, a progress heatmap, module-usage statistics and export.' },
                      open: { tab: "showSection('analytics-hub')" } },
                    { icon: '✅', ar: { t: 'Quality Standards', d: 'معايير الجودة العالمية: ISO والامتثال وESG وأهداف التنمية المستدامة وإدارة المخاطر والمقارنة المرجعية.' },
                      en: { t: 'Quality Standards', d: 'Global quality standards: ISO, compliance, ESG, sustainable-development goals, risk management and benchmarking.' },
                      open: { tab: "showSection('quality')" } }
                ]
            },

            /* ───────────────────────── الحسابات والإدارة والتواصل ───────────────────────── */
            {
                id: 'accounts', cat: 'people', icon: '🔐', c: '#00d4ff', mode: 'hybrid', sub: 'Accounts · Roles · Login',
                ar: {
                    n: 'الحسابات والأدوار وتسجيل الدخول',
                    t: 'ثلاثة أدوار (طالب، دكتور، إدارة) وتسجيل دخول إلزامي يعمل محلياً أولاً ويتزامن مع الخادم.',
                    w: 'بوابة المنصة: لا يُفتح التطبيق الرئيسي إلا بعد تسجيل الدخول. تختار دورك — طالب أو دكتور أو إدارة — فتفتح لك الأدوات واللوحات التي تناسبه، وتُحفظ بياناتك ونتائجك على حسابك.',
                    h: [
                        'الطالب يسجّل برقمه الجامعي بصيغة 9 أرقام ثم @aus.jo مع كلمة سرّ بصيغة محدّدة.',
                        'الدكتور يسجّل برمز الدكتور الذي تمنحه الإدارة، فتُفتح له لوحة الدكتور.',
                        'حساب الإدارة للمالك وحده ببريده وكلمة سرّه.',
                        'يمكن أيضاً الدخول عبر Google أو Microsoft أو Apple (تُتحقَّق هويتك من الخادم)؛ أما حساب «الضيف» فلا يفتح التطبيق الرئيسي.'
                    ],
                    x: [
                        'كلمات السرّ تُشتقّ بـ PBKDF2 (SHA-256 بـ 600 ألف تكرار) في المتصفح فلا تُخزَّن كنص صريح؛ والحسابات محفوظة محلياً (Local-first) وتُزامَن مع الخادم بأفضل جهد دون أن يعطّل ذلك الدخول.',
                        'الدخول الاجتماعي يُرسل رمز الهوية (ID token) إلى الخادم ليتحقّق من توقيعه والجهة المُصدرة والجمهور وانتهاء الصلاحية قبل قبول الحساب.',
                        'الخادم يطبّق صلاحيات هرمية (RBAC) من سبع رتب تبدأ بالطالب وتنتهي بالمشرف الأعلى، مع رموز وصول وتحديث.'
                    ],
                    e: ['حسابك يحفظ تقدّمك ونتائجك ويجعل تجربتك مخصّصة بحسب دورك.'],
                    a: ['يعزل بيانات كل طالب، ويضمن ألا تُفتح لوحات الدكتور والإدارة إلا لأصحابها.']
                },
                en: {
                    n: 'Accounts, Roles & Login',
                    t: 'Three roles (student, doctor, administration) and a mandatory login that works locally first and syncs with the server.',
                    w: 'The platform’s gate: the main app only opens after you log in. You choose your role — student, doctor or administration — and the tools and panels that suit it open for you, while your data and results are kept on your account.',
                    h: [
                        'A student registers with their university number — 9 digits followed by @aus.jo — and a password in a set format.',
                        'A doctor registers with the doctor code granted by the administration, which opens the Doctor panel.',
                        'The administration account belongs to the owner alone, with their email and password.',
                        'You can also sign in with Google, Microsoft or Apple (your identity is verified by the server); a “guest” account does not open the main app.'
                    ],
                    x: [
                        'Passwords are derived with PBKDF2 (SHA-256, 600,000 iterations) in the browser so they are never stored as plain text; accounts are kept locally (local-first) and synced with the server on a best-effort basis without blocking login.',
                        'Social sign-in sends the ID token to the server, which verifies its signature, issuer, audience and expiry before accepting the account.',
                        'The server applies hierarchical role-based access control (RBAC) with seven ranks from student up to the top administrator, plus access and refresh tokens.'
                    ],
                    e: ['Your account keeps your progress and results and makes the experience personal to your role.'],
                    a: ['It isolates each student’s data and ensures the doctor and administration panels only open for their owners.']
                },
                facts: [
                    { v: '3', ar: 'أدوار', en: 'roles' },
                    { v: '600K', ar: 'تكرار PBKDF2', en: 'PBKDF2 iterations' },
                    { v: '7', ar: 'رتب صلاحيات في الخادم', en: 'server permission ranks' }
                ],
                files: ['auth_system.js', 'auth_experience.js', 'auth.py', 'rbac.py', 'social_identity.py'],
                open: [{ call: 'ausAuth.openModal', args: ['profile'], ar: 'حسابي', en: 'My account' }]
            },

            {
                id: 'panels', cat: 'people', icon: '🧑‍🏫', c: '#ffd60a', mode: 'hybrid', sub: 'Student · Doctor · Admin Panels',
                ar: {
                    n: 'لوحات التحكم: الطالب والدكتور والإدارة',
                    t: 'لكل دور لوحته: الطالب يتابع تعلّمه، والدكتور يدير صفّه، والمالك يدير المنصة.',
                    w: 'ثلاث لوحات تظهر بحسب دورك من قائمة حسابك أعلى الصفحة: لوحة الطالب لكل مستخدم مسجّل، ولوحة الدكتور للدكاترة، ولوحة الإدارة للمالك وحده.',
                    h: [
                        'تفتح قائمة حسابك أعلى الصفحة وتختار اللوحة المناسبة؛ تظهر لوحة الدكتور للدكاترة ولوحة الإدارة للمالك فقط.',
                        'لوحة الطالب تجمع تقدّمك ونتائجك في مكان واحد وتقرأ من سجلّك المحفوظ باسم حسابك.',
                        'الدكتور يسجّل الحضور ويكلّف الواجبات ويراسل الطلاب، والإدارة تدير الحسابات والكتالوج والأسعار وتراجع إجابات الطلاب المرفوعة إلى الخادم.'
                    ],
                    x: [
                        'لوحات control_panel.js تعتمد على ausAuth للتحقق من الدور قبل العرض؛ فإن لم يتطابق تعرض رسالة «للدكاترة فقط» أو «للمالك فقط».',
                        'نتائج الطالب تُحفظ تحت مفتاح خاص بكل حساب (aus.results.البريد) وتُرفع إلى الخادم بعد نحو ثانية ونصف من آخر إجابة لتظهر للإدارة.'
                    ],
                    e: ['الطالب يرى تقدّمه بوضوح ويتابع أخطاءه بنفسه فيعرف أين يراجع.'],
                    a: ['يتيح للدكتور متابعة الصف إدارياً — حضور وواجبات ورسائل — دون أدوات خارجية، وللمالك التحكّم بالمحتوى والأسعار.']
                },
                en: {
                    n: 'Control Panels: Student, Doctor & Admin',
                    t: 'Each role has its own panel: students follow their learning, doctors run their class, and the owner runs the platform.',
                    w: 'Three panels appear according to your role from your account menu at the top of the page: the Student panel for every registered user, the Doctor panel for doctors and the Admin panel for the owner alone.',
                    h: [
                        'Open your account menu at the top of the page and choose the right panel; the Doctor panel shows for doctors and the Admin panel only for the owner.',
                        'The Student panel gathers your progress and results in one place and reads from the history saved under your account.',
                        'The doctor records attendance, assigns homework and messages students, and the administration manages accounts, the catalogue and prices and reviews student answers uploaded to the server.'
                    ],
                    x: [
                        'The control_panel.js panels rely on ausAuth to check the role before rendering; if it does not match they show a “doctors only” or “owner only” message.',
                        'A student’s results are saved under a per-account key (aus.results.EMAIL) and uploaded to the server about a second and a half after the last answer so the administration can see them.'
                    ],
                    e: ['Students see their progress clearly and follow their own mistakes, so they know where to revise.'],
                    a: ['It lets the doctor manage the class — attendance, homework, messages — without outside tools, and the owner control content and prices.']
                },
                facts: [
                    { v: '3', ar: 'لوحات', en: 'panels' }
                ],
                files: ['control_panel.js', 'student_data.js', 'catalog_admin.js', 'aus_43_cert_registry.js'],
                parts: [
                    { icon: '🎒', ar: { t: 'لوحة الطالب', d: 'تحيّة وتقدّم، متابعة التعلّم، واجباتي، «إجاباتي ونتائجي» (التحديات وأفضل تصرف والحاسبات)، وصندوق رسائل الدكتور والإدارة.' },
                      en: { t: 'Student panel', d: 'A greeting and progress, continue learning, my homework, “My answers & results” (challenges, best action, calculators) and an inbox for messages from doctors and the administration.' },
                      open: { section: 'studentpanel' } },
                    { icon: '🧑‍🏫', ar: { t: 'لوحة الدكتور', d: 'محاضراتي، قائمة الطلاب، تسجيل الحضور، الواجبات (تكليف وتصحيح)، وإرسال رسالة لطالب أو لجميع الطلاب.' },
                      en: { t: 'Doctor panel', d: 'My lectures, the student list, attendance, homework (assign and grade) and sending a message to one student or all students.' },
                      open: { section: 'doctorpanel', role: 'doctor' } },
                    { icon: '🛡️', ar: { t: 'لوحة الإدارة', d: 'حالة جلسة الخادم (فعّالة وتُجدَّد تلقائياً، أو زرّ لتسجيل الدخول للخادم)، إدارة الحسابات، استوديو المحتوى (تعديل لحظي للتخصصات والأدوات والأسعار والأسئلة وإعدادات المنصة)، إدارة المحتوى والأسعار، إجابات الطلاب من الخادم، صلاحية الإدارة، تغيير كلمة سرّ المالك، ورمز الدكتور.' },
                      en: { t: 'Admin panel', d: 'The server-session status (active and self-renewing, or a button to sign in to the server), account management, the Content Studio (instant editing of specialties, tools, prices, questions and platform settings), content and price management, student answers from the server, admin permission, owner-password change and the doctor code.' },
                      open: { section: 'adminpanel', role: 'owner' } }
                ]
            },

            {
                id: 'homework', cat: 'people', icon: '📝', c: '#ff9500', mode: 'server', sub: 'Homework · Notifications',
                ar: {
                    n: 'الواجبات والإشعارات',
                    t: 'الدكتور يكلّف الواجب، الطالب يسلّم، الدكتور يصحّح، وجرس الإشعارات يخبر الطالب بكل جديد.',
                    w: 'دورة الواجب كاملة بين الدكتور والطالب عبر الخادم: تكليف واجب مرتبط بمحاضرة، تسليم الطالب لإجابته، تصحيح الدكتور وتقدير الدرجة مع ملاحظات، وإشعار للطالب بكل خطوة. وإلى جانبها رسائل من الدكتور أو الإدارة إلى الطلاب.',
                    h: [
                        'الدكتور يختار محاضرة ويكلّف واجباً بعنوان وملاحظة وموعد تسليم.',
                        'يظهر الواجب في «واجباتي» عند الطالب وتصله إشعارات في الجرس مع عدّاد.',
                        'يسلّم الطالب نصّ إجابته، فيراه الدكتور ويصحّحه ويضع درجة وملاحظات.',
                        'يصل الطالب إشعار بالتصحيح وتظهر درجته في لوحته.',
                        'ويمكن للدكتور أو الإدارة إرسال رسالة نصية لطالب أو لجميع الطلاب تظهر في صندوق رسائله؛ يكتفي الطالب بالإعجاب دون ردّ.'
                    ],
                    x: [
                        'الواجبات والتسليمات والدرجات تُحفظ على الخادم (/api/homework/assignments وsubmissions وgrade) لتصل بين الحسابات المختلفة؛ لذلك يحتاج هذا النظام إلى اتصال بالخادم (homework.js وnotifications.js).',
                        'الرسائل (aus_40_notifications.js) تُحفظ محلياً وتخصّ مستلماً واحداً أو الجميع، ولا يوجد ردّ نصي من الطالب عمداً.'
                    ],
                    e: ['تغذية راجعة منتظمة من الدكتور تبقي الطالب على المسار وتربط الواجب بمحاضرته.'],
                    a: ['تنظيم عملي للمتابعة الأكاديمية: مهلة واضحة، تسليم موثّق، ودرجة محفوظة.']
                },
                en: {
                    n: 'Homework & Notifications',
                    t: 'The doctor assigns, the student submits, the doctor grades, and the notification bell tells the student about everything new.',
                    w: 'The full homework cycle between doctor and student through the server: assigning homework tied to a lecture, the student submitting an answer, the doctor grading it with a score and notes, and a notification to the student at every step. Alongside it, messages from the doctor or administration to students.',
                    h: [
                        'The doctor picks a lecture and assigns homework with a title, a note and a due date.',
                        'The homework appears in the student’s “My homework” and notifications arrive in the bell with a counter.',
                        'The student submits the text of their answer; the doctor sees it, grades it and adds a score and notes.',
                        'The student gets a notification about the grading and the score appears in their panel.',
                        'The doctor or administration can also send a text message to one student or all students that appears in their inbox; the student can only like it, not reply.'
                    ],
                    x: [
                        'Assignments, submissions and grades are stored on the server (/api/homework/assignments, submissions and grade) so they travel between different accounts; this system therefore needs a server connection (homework.js and notifications.js).',
                        'Messages (aus_40_notifications.js) are stored locally and addressed to one recipient or to everyone; there is deliberately no text reply from the student.'
                    ],
                    e: ['Regular feedback from the doctor keeps students on track and ties homework to its lecture.'],
                    a: ['Practical organisation of academic follow-up: a clear deadline, a recorded submission and a saved grade.']
                },
                facts: [
                    { v: '3', ar: 'خطوات: تكليف · تسليم · تصحيح', en: 'steps: assign · submit · grade' }
                ],
                files: ['homework.js', 'notifications.js', 'aus_40_notifications.js', 'control_panel.js'],
                open: [
                    { section: 'studentpanel', ar: 'واجباتي', en: 'My homework' },
                    { section: 'doctorpanel', role: 'doctor', ar: 'تكليف الواجبات', en: 'Assign homework' }
                ]
            },

            {
                id: 'chat', cat: 'people', icon: '💬', c: '#00d4ff', mode: 'offline', sub: 'Student ↔ Doctor Chat',
                ar: {
                    n: 'الدردشة بين الطلاب والدكاترة',
                    t: 'محادثات حقيقية بين الطلاب والدكاترة، تبحث بالاسم وتبدأ فوراً دون موافقة.',
                    w: 'نظام دردشة ثنائي الاتجاه محصور بالطلاب والدكاترة (دون الإدارة): تبحث عن زميل أو دكتور بالاسم، تضيفه فوراً، وتتبادلان الرسائل في محادثة مشتركة.',
                    h: [
                        'تفتح «الدردشة» وتبحث في الدليل بالاسم.',
                        'تضيف الشخص وتبدأ المحادثة مباشرة — لا تحتاج موافقة الطرف الآخر.',
                        'تتابع كل محادثاتك في قائمة واحدة وتعود إليها وقتما شئت.'
                    ],
                    x: [
                        'المحادثات تُحفظ محلياً (aus.chat.threads) وتعتمد على دليل الحسابات المخزَّن في المتصفح؛ لذلك تعمل بين الحسابات الموجودة على الجهاز نفسه دون خادم.',
                        'الإدارة مستبعدة عمداً من الدليل ومن المحادثة (aus_41_chat.js).'
                    ],
                    e: ['تواصل مباشر للاستفسار وتبادل الفهم مع الزملاء والدكتور.'],
                    a: ['قناة اتصال سريعة داخل المنصة بدل تطبيقات خارجية.']
                },
                en: {
                    n: 'Student & Doctor Chat',
                    t: 'Real conversations between students and doctors — search by name and start instantly, no approval needed.',
                    w: 'A two-way chat restricted to students and doctors (not the administration): you search for a classmate or doctor by name, add them instantly and exchange messages in a shared conversation.',
                    h: [
                        'Open “Chat” and search the directory by name.',
                        'Add the person and start the conversation right away — the other side’s approval is not needed.',
                        'Follow all your conversations in a single list and come back to them whenever you like.'
                    ],
                    x: [
                        'Conversations are stored locally (aus.chat.threads) and rely on the accounts directory kept in the browser; they therefore work between the accounts present on the same device, with no server.',
                        'The administration is deliberately excluded from the directory and from chat (aus_41_chat.js).'
                    ],
                    e: ['Direct contact to ask questions and share understanding with classmates and the doctor.'],
                    a: ['A fast communication channel inside the platform instead of outside apps.']
                },
                facts: [],
                files: ['aus_41_chat.js'],
                open: [{ tab: "showSection('chat')", ar: 'الدردشة', en: 'Chat' }]
            },

            /* ───────────────────────── التقدّم والاستكشاف ───────────────────────── */
            {
                id: 'progress', cat: 'progress', icon: '🏅', c: '#d4af37', mode: 'offline', sub: 'XP · Levels · Hearts · Achievements · Missions',
                ar: {
                    n: 'نظام التقدّم والتحفيز',
                    t: 'نقاط وقلوب ومستويات وإنجازات ومهام يومية تجعل التعلّم رحلة مستمرة.',
                    w: 'طبقة تحفيز مشتركة بين كل الأنظمة: تظهر في الشريط العلوي (المستوى وXP والقلوب) وتتغذّى من كل ما تفعله في المنصة.',
                    h: [
                        'كل إجابة صحيحة تمنحك XP، ويرتفع مستواك عند بلوغ (المستوى × 1000) نقطة.',
                        'القلوب الثلاثة تُخسَر بالأخطاء؛ وعند نفادها تُعاد تلقائياً لتواصل التعلّم دون عقوبة طويلة.',
                        'الإنجازات ({{achievements}} إنجازاً بدرجات: شائع، نادر، ملحمي، أسطوري) تُفتح باستكشاف الأقسام وإنهاء التحديات ومشاهدة العرض.',
                        'مهام اليوم: ثلاث مهام تتجدّد كل يوم مع مكافأة XP وسلسلة أيام متواصلة (🔥) ورقم قياسي.'
                    ],
                    x: [
                        'XP والمستوى والقلوب متغيّرات الجلسة في aus_01_data.js وaus_02_core.js، ويمكن تصدير تقدّمك من الإعدادات ← البيانات.',
                        'الإنجازات (aus_08_study_features.js) تُقيَّم بشروط برمجية بعد كل نشاط وتُحفظ محلياً مع تواريخ فتحها؛ ومهام اليوم تُختار آلياً وتُصفَّر عند منتصف الليل.'
                    ],
                    e: ['الإحساس بالتقدّم يعزّز الاستمرارية: أهداف صغيرة يومية ومكافآت فورية.'],
                    a: ['يشجّعك على استكشاف الأنظمة كلها وليس نظاماً واحداً فقط.']
                },
                en: {
                    n: 'Progress & Motivation System',
                    t: 'Points, hearts, levels, achievements and daily missions that make learning an ongoing journey.',
                    w: 'A motivation layer shared by all systems: it appears in the top bar (level, XP and hearts) and is fed by everything you do on the platform.',
                    h: [
                        'Every correct answer gives you XP, and your level rises when you reach (level × 1000) points.',
                        'The three hearts are lost with mistakes; when they run out they are restored automatically so you can keep learning without a long penalty.',
                        'Achievements ({{achievements}} of them, in tiers: common, rare, epic, legendary) unlock by exploring sections, finishing challenges and watching the demo.',
                        'Daily missions: three missions that renew every day with an XP bonus, a day streak (🔥) and a personal best.'
                    ],
                    x: [
                        'XP, level and hearts are session variables in aus_01_data.js and aus_02_core.js, and you can export your progress from Settings → Data.',
                        'Achievements (aus_08_study_features.js) are evaluated by code conditions after every activity and stored locally with their unlock dates; daily missions are picked automatically and reset at midnight.'
                    ],
                    e: ['A sense of progress builds persistence: small daily goals and instant rewards.'],
                    a: ['It encourages you to explore all the systems, not just one.']
                },
                facts: [
                    { v: '{{achievements}}', ar: 'إنجازاً', en: 'achievements' },
                    { v: '3', ar: 'مهام يومية', en: 'daily missions' },
                    { v: '3', ar: 'قلوب', en: 'hearts' }
                ],
                files: ['aus_01_data.js', 'aus_02_core.js', 'aus_08_study_features.js'],
                parts: [
                    { icon: '⭐', ar: { t: 'XP والمستويات', d: '+10 XP لكل إجابة صحيحة في اختبار الأداة، ومستوى جديد كل (المستوى × 1000) نقطة.' },
                      en: { t: 'XP & levels', d: '+10 XP for every correct answer in a tool quiz, and a new level every (level × 1000) points.' } },
                    { icon: '❤️', ar: { t: 'القلوب', d: 'ثلاثة قلوب تنقص عند الخطأ وتعود تلقائياً عند نفادها.' },
                      en: { t: 'Hearts', d: 'Three hearts that drop on a mistake and come back automatically when they run out.' } },
                    { icon: '🏆', ar: { t: 'الإنجازات', d: 'عشرون إنجازاً بدرجات ندرة مختلفة، مع نافذة احتفال عند فتح كل إنجاز.' },
                      en: { t: 'Achievements', d: 'Twenty achievements with different rarity tiers and a celebration pop-up on every unlock.' },
                      open: { tab: "showSection('achievements')" } },
                    { icon: '🔥', ar: { t: 'مهام اليوم', d: 'ثلاث مهام يومية، مؤقّت حتى منتصف الليل، مكافأة إتمام، وسلسلة أيام.' },
                      en: { t: 'Daily missions', d: 'Three daily missions, a timer to midnight, a completion bonus and a day streak.' },
                      open: { tab: "showSection('missions')" } }
                ]
            },

            {
                id: 'explore', cat: 'progress', icon: '🗺️', c: '#00d4ff', mode: 'offline', sub: 'CEO Dashboard · Campus Map · Demo',
                ar: {
                    n: 'لوحة CEO والخريطة الجامعية والعرض',
                    t: 'لوحة تنفيذية تفاعلية، وخريطة جامعية تنقلك إلى الأقسام، وعرض توضيحي يقودك في جولة.',
                    w: 'ثلاث أدوات لاستكشاف المنصة ومتابعتها: Dashboard بمؤشرات ومخططات (أسبوعي / شهري / سنوي) تحاكي لوحة مدير تنفيذي، وخريطة جامعة تفاعلية بمبانٍ تنقلك إلى الأنظمة، وعرض توضيحي (Demo) يقودك آلياً في جولة عبر أهم الأقسام.',
                    h: [
                        'Dashboard: تبدّل الفترة (أسبوعي، شهري، سنوي) فتتغيّر بطاقات المؤشرات ومخططات الإيرادات والأرباح ونمو العملاء وتوزيع الميزانية، مع رؤى تحليلية.',
                        'الخريطة: {{campus}} مبانٍ (الإدارة العليا، المكتبة الذكية، مختبر الذكاء الاصطناعي، كلية الأعمال، مركز التقنية، مركز المسار المهني، مركز التحديات، معهد الأبحاث، مركز الطلاب) تضغط أيّاً منها لتقرأ وصفه وتنتقل إلى النظام المرتبط به.',
                        'العرض التوضيحي: زر عائم يبدأ جولة آلية من {{demoSteps}} خطوات بتعليق مكتوب، مع إيقاف مؤقّت وإيقاف.'
                    ],
                    x: [
                        'بيانات Dashboard توضيحية تُولَّد محلياً (DASH_DATA) لمحاكاة لوحة المدير التنفيذي؛ وتُرسم المخططات على Canvas بحركة تدريجية.',
                        'الخريطة تُرسم من مصفوفة CAMPUS_BUILDINGS (موقع كل مبنى ونوعه والنظام المرتبط به)، والعرض يقود الواجهة آلياً عبر DEMO_SEQUENCE (aus_08_study_features.js).'
                    ],
                    e: ['تفهم الصورة الكبرى لإدارة الأعمال من خلال مؤشرات الأداء، وتتعرّف على أقسام المنصة بصرياً.'],
                    a: ['تدرّب على قراءة المؤشرات واتخاذ قرار منها، وطريقة سريعة للتنقّل بين الأنظمة.']
                },
                en: {
                    n: 'CEO Dashboard, Campus Map & Demo',
                    t: 'An interactive executive dashboard, a campus map that takes you to the sections, and a demo that leads you on a tour.',
                    w: 'Three tools for exploring and following the platform: a Dashboard with indicators and charts (weekly / monthly / yearly) that simulates an executive’s dashboard, an interactive campus map whose buildings take you to the systems, and a Demo that leads you automatically on a tour of the main sections.',
                    h: [
                        'Dashboard: switch the period (weekly, monthly, yearly) and the indicator cards and the revenue/profit, customer-growth and budget-split charts change, with analytical insights.',
                        'Map: {{campus}} buildings (Administration, Smart Library, AI Lab, Business School, Tech Hub, Career Center, Challenge Center, Research Institute, Student Center) — tap one to read its description and jump to the system it links to.',
                        'Demo: a floating button starts an automatic tour of {{demoSteps}} steps with written commentary, plus pause and stop.'
                    ],
                    x: [
                        'The Dashboard’s data is illustrative and generated locally (DASH_DATA) to simulate an executive’s dashboard; charts are drawn on a Canvas with a gradual animation.',
                        'The map is drawn from the CAMPUS_BUILDINGS array (each building’s position, type and linked system), and the demo drives the interface automatically through DEMO_SEQUENCE (aus_08_study_features.js).'
                    ],
                    e: ['You grasp the big picture of business management through performance indicators, and learn the platform’s sections visually.'],
                    a: ['Practice in reading indicators and deciding from them, and a quick way to move between systems.']
                },
                facts: [
                    { v: '{{campus}}', ar: 'مبانٍ في الخريطة', en: 'map buildings' },
                    { v: '{{demoSteps}}', ar: 'خطوات العرض', en: 'demo steps' }
                ],
                files: ['aus_03_dashboard_fx.js', 'aus_08_study_features.js'],
                parts: [
                    { icon: '📊', ar: { t: 'Dashboard', d: 'مؤشرات ومخططات بثلاث فترات زمنية مع رؤى تحليلية.' },
                      en: { t: 'Dashboard', d: 'Indicators and charts for three time periods, with analytical insights.' },
                      open: { tab: "showSection('dashboard')" } },
                    { icon: '🗺️', ar: { t: 'الخريطة الجامعية', d: 'مبانٍ تفاعلية تنقلك إلى الأنظمة المرتبطة بها.' },
                      en: { t: 'Campus map', d: 'Interactive buildings that take you to the systems linked to them.' },
                      open: { tab: "showSection('map')" } },
                    { icon: '🎬', ar: { t: 'العرض التوضيحي', d: 'جولة آلية عبر أهم الأقسام بتعليق مكتوب.' },
                      en: { t: 'Demo', d: 'An automatic tour through the main sections with written commentary.' },
                      open: { call: 'startDemo' } }
                ]
            },

            /* ───────────────────────── الأساس التقني والتخصيص ───────────────────────── */
            {
                id: 'settings', cat: 'platform', icon: '⚙️', c: '#4d9bff', mode: 'offline', sub: 'Settings · Themes · Accessibility · FX',
                ar: {
                    n: 'الإعدادات والتخصيص',
                    t: 'لغات ومظاهر وأصوات وأداء وإتاحة، كلها في مكان واحد وتُطبَّق فوراً.',
                    w: 'لوحة إعدادات زجاجية واحدة (زر ⚙ أسفل الصفحة أو Ctrl+,) بخمسة تبويبات: اللغة، المظهر، الصوت، الأداء، البيانات.',
                    h: [
                        'اللغة: {{langs}} لغة منها العربية (RTL) والإنجليزية، ويتبدّل اتجاه الصفحة تلقائياً.',
                        'المظهر: ثلاثة ثيمات (Dark / Neon / Cinematic) وخمسة ألوان تمييز وتكبير للصفحة وحجم للخط.',
                        'الصوت: أصوات الواجهة وصوت الذكاء الاصطناعي واللهجة والسرعة.',
                        'الأداء: مفتاح المؤثرات السينمائية وشدة الحركة والتباين العالي؛ وفي «الوضع الهادئ» تتوقّف الكانفاس والحركات وتصبح الخلفية لوناً ثابتاً.',
                        'البيانات: تصدير تقدّمك أو مسحه.'
                    ],
                    x: [
                        'التفضيلات تُحفظ في مفتاح aus.prefs بـ localStorage، ومفتاح المؤثرات aus_fx_enabled يُقرأ قبل أول رسم؛ والتغييرات تُطبَّق دون إعادة تحميل.',
                        'اتجاه الواجهة RTL/LTR يتبدّل مع اللغة عبر السمتين dir وlang على <html>.'
                    ],
                    e: ['بيئة تعلّم تضبطها على راحتك — لغة وخط وتباين — تقلّل الإجهاد وتحسّن التركيز.'],
                    a: ['يعمل التطبيق جيداً على الأجهزة الضعيفة عند تفعيل الوضع الهادئ.']
                },
                en: {
                    n: 'Settings & Customization',
                    t: 'Languages, themes, sounds, performance and accessibility — all in one place and applied instantly.',
                    w: 'A single glass settings panel (the ⚙ button at the bottom of the page, or Ctrl+,) with five tabs: language, appearance, audio, performance and data.',
                    h: [
                        'Language: {{langs}} languages including Arabic (RTL) and English, and the page direction switches automatically.',
                        'Appearance: three themes (Dark / Neon / Cinematic), five accent colours, page zoom and font size.',
                        'Audio: interface sounds, the AI voice, dialect and speed.',
                        'Performance: the cinematic-effects switch, animation intensity and high contrast; in “Calm performance mode” canvases and animations stop and the background becomes a solid colour.',
                        'Data: export or clear your progress.'
                    ],
                    x: [
                        'Preferences are saved under the aus.prefs key in localStorage, and the effects switch aus_fx_enabled is read before the first paint; changes apply without reloading.',
                        'The RTL/LTR layout flips with the language through the dir and lang attributes on <html>.'
                    ],
                    e: ['A learning environment tuned to your comfort — language, font, contrast — that reduces strain and improves focus.'],
                    a: ['The app runs well on weak devices once Calm performance mode is on.']
                },
                facts: [
                    { v: '{{langs}}', ar: 'لغة', en: 'languages' },
                    { v: '3', ar: 'ثيمات', en: 'themes' },
                    { v: '5', ar: 'ألوان تمييز', en: 'accent colours' }
                ],
                files: ['aus_03_dashboard_fx.js', 'aus_04_conversational.js', 'aus_45_fx_mode.js'],
                open: [{ call: 'toggleSettings', ar: 'افتح الإعدادات', en: 'Open settings' }]
            },

            {
                id: 'content', cat: 'platform', icon: '🎛️', c: '#ffd700', mode: 'hybrid', sub: 'Content Studio · Owner Control · Live Sync',
                ar: {
                    n: 'استوديو المحتوى: تحكّم المالك الكامل واللحظي',
                    t: 'المالك يعدّل التخصصات والأدوات والأسعار والأسئلة وإعدادات المنصة من لوحة الإدارة، فيراها كل مستخدم فوراً.',
                    w: 'قسم داخل لوحة الإدارة يتيح للمالك وحده إضافة المحتوى وتعديله وإخفاءه وحذفه بنماذج جاهزة دون لمس الشيفرة. كل حفظ يُطبَّق على شاشتك فوراً ويُخزَّن في قاعدة البيانات وlocalStorage، ثم يصل إلى كل المتصفحات المفتوحة لحظياً.',
                    h: [
                        'تفتح لوحة الإدارة (للمالك فقط) وتجد «استوديو المحتوى» بتبويبات: التخصصات، الأدوات، المتجر والكتب، أسئلة القيادة، التحديات، أفضل التصرفات، بنك أسئلة الشهادات، إعدادات المنصة، وسجل التغييرات.',
                        'تضغط «إضافة» أو «تعديل» فتظهر نافذة بحقول جاهزة، وتغيّر الأسعار مباشرة من الجدول. عند الحفظ يرى كل مستخدم التغيير خلال لحظات دون إعادة تحميل.',
                        'العناصر الأصلية تُخفى وتُسترجع ولا تُحذف نهائياً، وكل تغيير يُسجَّل في «سجل التغييرات» ويمكن التراجع عنه، كما تستطيع تنزيل نسخة احتياطية. وفي «بنك أسئلة الشهادات» تضيف أسئلة الامتحانات الاحترافية وتعدّلها وتحذفها وتسترجع نسخاً سابقة من البنك.',
                        'من «إعدادات المنصة» تضع اسم المنصة وإعلاناً عاماً وشريط صيانة وبيانات التواصل، وتُخفي أقساماً، وتغيّر أسعار الشهادات.'
                    ],
                    x: [
                        'الصلاحية يفرضها الخادم: بريد المالك مُعرَّف في مكان واحد (owner.py ← AUS_OWNER_EMAIL)، وكل مسار كتابة /api/content/ops/* يتحقق من هوية المالك؛ الواجهة وحدها لا تمنح أي سلطة.',
                        'التعديلات تُخزَّن كطبقة فوق الكتالوج الأصلي (edits وadded وdeleted) وتُدمج في المصفوفات الحيّة (specialties وtoolsData وغيرها) دون تغيير شكلها، فتبقى كل الشاشات القديمة تعمل.',
                        'المزامنة اللحظية عبر Server-Sent Events مع استطلاع احتياطي وBroadcastChannel بين النوافذ؛ وإن انقطع الاتصال تُحفَظ تعديلات المالك في طابور محلي وتُرسَل عند عودته.',
                        'كل مدخل يُنظَّف في الخادم: حدود للأطوال وتحييد للوسوم وقيود على المعرّفات ورقم مراجعة متزايد لكل تغيير؛ والدفع والشهادات تتحقق من الأسعار الجديدة. أما بنوك الامتحانات فتبقى ملفات على الخادم مع مفاتيح الإجابة ولا تُعرَض إلا للمالك، وتُحفَظ نسخة احتياطية عند كل تعديل.'
                    ],
                    e: ['تفهم كيف تُدار منصة حقيقية: فصل المحتوى عن الشيفرة، وطبقات التعديل، وتحكّم الصلاحيات من الخادم، والمزامنة اللحظية.'],
                    a: ['يتيح للمالك تحديث المنهج والأسعار فوراً دون مبرمج، ويقدّم تطبيقاً عملياً لمفاهيم قواعد البيانات والتزامن وأمن الصلاحيات.']
                },
                en: {
                    n: 'Content Studio: Full, Instant Owner Control',
                    t: 'The owner edits specialties, tools, prices, questions and platform settings from the Admin Panel, and every user sees the change at once.',
                    w: 'A section inside the Admin Panel that lets only the owner add, edit, hide and delete platform content with ready-made forms, without touching code. Every save applies to your screen immediately, is stored in the database and localStorage, and then reaches every open browser live.',
                    h: [
                        'Open the Admin Panel (owner only) and find “Content Studio” with the tabs: Specialties, Tools, Store & books, Leadership questions, Challenges, Best actions, Certificate exam banks, Platform settings and Change history.',
                        'Press “Add” or “Edit” and a window with ready fields appears, and prices can be changed straight from the table. After you save, every user sees the change within moments with no reload.',
                        'Built-in items are hidden and restored, never permanently deleted, and every change is recorded in “Change history” and can be undone; you can also download a backup. In “Certificate exam banks” you add, edit and delete the professional-exam questions and restore earlier versions of a bank.',
                        'From “Platform settings” you set the platform name, a public announcement, a maintenance bar and contact details, hide sections and change certificate prices.'
                    ],
                    x: [
                        'Authority is enforced by the server: the owner’s e-mail is defined in one place (owner.py ← AUS_OWNER_EMAIL) and every write route /api/content/ops/* checks the owner identity; the interface alone grants no power.',
                        'Edits are stored as a layer over the original catalogue (edits, added, deleted) and merged into the live arrays (specialties, toolsData and others) without changing their shape, so every existing screen keeps working.',
                        'Live sync uses Server-Sent Events with a polling fallback and a BroadcastChannel between windows; if the connection drops the owner’s edits wait in a local queue and are sent when it returns.',
                        'Every input is cleaned on the server: length limits, neutralised markup, restricted ids and an increasing revision number for each change; payments and certificates verify the new prices. Exam banks stay files on the server with their answer keys, shown only to the owner, and a backup is kept on every edit.'
                    ],
                    e: ['You learn how a real platform is run: separating content from code, override layers, server-side permission control and live synchronisation.'],
                    a: ['It lets the owner update the curriculum and prices instantly without a programmer, and offers a practical example of database, concurrency and access-control concepts.']
                },
                facts: [
                    { v: '7', ar: 'مستندات قابلة للتحرير', en: 'editable documents' },
                    { v: 'SSE', ar: 'تحديث لحظي', en: 'live updates' }
                ],
                files: ['aus_48_content_sync.js', 'aus_49_content_studio.js', 'catalog_admin.js', 'owner.py', 'content_store.py', 'content_bus.py', 'exam_bank_admin.py', 'routes/content_routes.py'],
                open: [{ section: 'adminpanel', role: 'owner', ar: 'افتح استوديو المحتوى', en: 'Open the Content Studio' }]
            },

            {
                id: 'architecture', cat: 'platform', icon: '🏗️', c: '#9d4edd', mode: 'hybrid', sub: 'Local-first · FastAPI · Security',
                ar: {
                    n: 'البنية التقنية: Local-first وFastAPI والأمان',
                    t: 'تعمل المنصة محلياً أولاً، وتستعين بخادم FastAPI للذكاء الاصطناعي والامتحانات والمزامنة.',
                    w: 'الأساس الذي تقوم عليه كل الأنظمة السابقة: واجهة JavaScript خالصة (بلا أطر ولا مُجمِّعات) تعمل دون إنترنت، وخادم Python / FastAPI يوفّر ما لا يصحّ أن يبقى في المتصفح: الذكاء الاصطناعي والمصادقة والدفع والشهادات والواجبات.',
                    h: [
                        'كل شيء يبدأ من المتصفح: البيانات التعليمية والتفضيلات والتقدّم تُحفظ في localStorage فتعمل المنصة بلا خادم أو إنترنت.',
                        'عند توفّر الخادم تتّصل به الواجهة عبر عنوان ديناميكي (يتبدّل بين المحلي والنشر) للذكاء الاصطناعي والتسجيل والدفع والواجبات والامتحانات.',
                        'إن غاب الخادم تتراجع الأنظمة الذكية بسلاسة إلى محرّكات محلية بدل أن تتوقف.'
                    ],
                    x: [
                        'الواجهة: ملفات aus_00 … aus_49 وسجل وحدات (_AUS_REGISTRY) وناقل أحداث (_AUS_BUS) تتواصل به الوحدات؛ وعامل خدمة (Service Worker) يطلب الشبكة أولاً ويحتفظ بنسخة احتياطية، ومانيفست PWA للتثبيت.',
                        'الخادم: FastAPI مع قاعدة SQLite عبر SQLAlchemy غير المتزامن وترحيلات Alembic، وموجّهات للمصادقة والدفع وPayPal والمزامنة وريادة الأعمال والجودة والتحليلات والشهادات.',
                        'طبقة الذكاء الاصطناعي تنتقل تلقائياً Claude ← OpenAI ← وضع محلي، مع إعادة المحاولة ومهلة زمنية وحدود للمعدّل.',
                        'طبقة الأمان: تحديد معدّل الطلبات لكل عنوان IP ولكل مسار، كشف حقن التعليمات وXSS وSQLi وتجاوز المسارات، تتبّع الإساءة وحظر مؤقّت، وسجلّ أمني منظّم.',
                        'ما يحتاج ثقة يبقى على الخادم: درجات الامتحانات ورصيد المحاولات والتحقق من الدفع وهوية الدخول الاجتماعي.'
                    ],
                    e: ['تفهم كيف تُبنى منصة حقيقية: فصل الواجهة عن الخادم، والاعتماد على الخادم فيما يحتاج ثقة (الدرجات والدفع)، والعمل دون اتصال.'],
                    a: ['مثال تطبيقي لمبادئ هندسة البرمجيات وأمن المعلومات التي يدرسها طلاب نظم المعلومات.']
                },
                en: {
                    n: 'Architecture: Local-first, FastAPI & Security',
                    t: 'The platform works locally first and uses a FastAPI server for AI, exams and synchronisation.',
                    w: 'The foundation every system above stands on: a pure JavaScript interface (no frameworks, no bundlers) that works offline, and a Python / FastAPI server that provides what should not live in the browser: AI, authentication, payment, certificates and homework.',
                    h: [
                        'Everything starts in the browser: learning data, preferences and progress are saved in localStorage, so the platform works with no server and no internet.',
                        'When the server is available the interface connects to it through a dynamic address (switching between local and deployed) for AI, sign-up, payment, homework and exams.',
                        'If the server is missing, the smart systems fall back smoothly to local engines instead of stopping.'
                    ],
                    x: [
                        'Front end: files aus_00 … aus_49, a module registry (_AUS_REGISTRY) and an event bus (_AUS_BUS) that modules communicate through; a Service Worker that tries the network first and keeps a fallback copy, and a PWA manifest for installation.',
                        'Server: FastAPI with a SQLite database through async SQLAlchemy and Alembic migrations, and routers for authentication, payment, PayPal, sync, entrepreneurship, quality, analytics and certificates.',
                        'The AI layer falls back automatically Claude → OpenAI → local mode, with retries, a timeout and rate limits.',
                        'The security layer: per-IP and per-endpoint rate limiting, detection of prompt injection, XSS, SQLi and path traversal, abuse tracking with temporary blocks, and a structured security log.',
                        'Whatever needs trust stays on the server: exam scores, attempt credits, payment verification and social-login identity.'
                    ],
                    e: ['You learn how a real platform is built: separating the interface from the server, relying on the server for what needs trust (scores, payment), and working offline.'],
                    a: ['A practical example of the software-engineering and information-security principles studied by information-systems students.']
                },
                facts: [
                    { v: 'PWA', ar: 'قابل للتثبيت', en: 'installable' },
                    { v: '3', ar: 'مستويات للذكاء الاصطناعي', en: 'AI fallback levels' },
                    { v: '7', ar: 'رتب صلاحيات', en: 'permission ranks' }
                ],
                files: ['aus_00_registry.js', 'sw.js', 'main.py', 'ai_layer.py', 'security.py', 'rbac.py', 'database.py'],
                open: []
            }
        ]
    };
})();
