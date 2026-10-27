// =============================================================================
// aus_21_biz_sim.js  —  AI BUSINESS SIMULATOR  (Module 2)
// Choose role → Manage company → Real decisions → Financial impact → Report
// =============================================================================
(function () {
'use strict';

var _sim = {
    active: false, round: 0, totalRounds: 5,
    role: null, company: null,
    metrics: { revenue:0, profit:0, cashFlow:0, marketShare:0, satisfaction:0, morale:0 },
    decisions: [],
    scenario: null,
    styleInjected: false, score: 0
};

var _roles = [
    { id:'ceo',   icon:'👔', title:'CEO',              desc:'اتخذ القرارات الاستراتيجية الكبرى' },
    { id:'cmo',   icon:'📣', title:'CMO',              desc:'قود استراتيجية التسويق والنمو' },
    { id:'cfo',   icon:'💹', title:'CFO',              desc:'أدر المالية وحسّن الربحية' },
    { id:'coo',   icon:'⚙️', title:'COO',              desc:'نظّم العمليات وسلسلة التوريد' },
    { id:'hr',    icon:'👥', title:'HR Director',      desc:'اجذب المواهب وطوّر الفريق' },
    { id:'found', icon:'🚀', title:'Entrepreneur',     desc:'أسس شركتك الناشئة من الصفر' }
];

var _companies = [
    { id:'startup', icon:'🚀', name:'Startup',      budget:200000,  employees:8,   rev:50000   },
    { id:'sme',     icon:'🏪', name:'SME',           budget:1000000, employees:45,  rev:300000  },
    { id:'corp',    icon:'🏢', name:'Corporation',   budget:5000000, employees:200, rev:2000000 }
];

function _css() {
    if (_sim.styleInjected) return;
    _sim.styleInjected = true;
    var s = document.createElement('style');
    s.textContent = [
        '#sim-wrap{padding:20px 16px 100px;max-width:860px;margin:0 auto}',
        '.sim-title{font-family:Orbitron,sans-serif;font-size:1.2rem;color:#00d4ff;letter-spacing:.1em;margin-bottom:4px;text-align:center}',
        '.sim-sub{font-size:.78rem;color:rgba(255,255,255,.35);text-align:center;margin-bottom:24px}',
        '.sim-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,212,255,.2);border-radius:14px;padding:18px;margin-bottom:14px}',
        '.sim-card-title{font-size:.65rem;letter-spacing:.12em;text-transform:uppercase;color:#00d4ff;margin-bottom:12px;font-weight:700}',
        /* Role/Company grid */
        '.sim-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}',
        '@media(max-width:600px){.sim-grid{grid-template-columns:repeat(2,1fr)}}',
        '.sim-choice{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;text-align:center;cursor:pointer;transition:all .2s}',
        '.sim-choice:hover,.sim-choice.selected{border-color:rgba(0,212,255,.6);background:rgba(0,212,255,.08);transform:translateY(-2px)}',
        '.sim-choice-icon{font-size:1.6rem;margin-bottom:6px}',
        '.sim-choice-title{font-size:.85rem;font-weight:700;margin-bottom:3px}',
        '.sim-choice-desc{font-size:.65rem;color:rgba(255,255,255,.45);line-height:1.4}',
        /* Metrics dashboard */
        '.sim-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
        '@media(max-width:600px){.sim-metrics{grid-template-columns:repeat(2,1fr)}}',
        '.sim-metric{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px;text-align:center}',
        '.sim-m-val{font-family:Orbitron,sans-serif;font-size:.95rem;font-weight:700}',
        '.sim-m-lbl{font-size:.58rem;color:rgba(255,255,255,.4);margin-top:3px;letter-spacing:.06em}',
        '.sim-m-delta{font-size:.65rem;margin-top:2px}',
        '.delta-up{color:#00f5a0}','.delta-dn{color:#ff6b6b}',
        /* Round indicator */
        '.sim-rounds{display:flex;gap:6px;justify-content:center;margin-bottom:16px}',
        '.sim-round-dot{width:28px;height:8px;border-radius:4px;background:rgba(255,255,255,.1);transition:background .3s}',
        '.sim-round-dot.done{background:#00d4ff}',
        '.sim-round-dot.current{background:#d4af37;box-shadow:0 0 8px rgba(212,175,55,.5)}',
        /* Scenario */
        '.sim-scenario{background:rgba(0,0,0,.3);border-left:3px solid #d4af37;border-radius:0 10px 10px 0;padding:14px;margin-bottom:14px;font-size:.88rem;line-height:1.7;color:rgba(255,255,255,.85)}',
        '.sim-options{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}',
        '.sim-option{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px 14px;cursor:pointer;font-size:.83rem;transition:all .2s;text-align:right}',
        '.sim-option:hover{border-color:rgba(0,212,255,.5);background:rgba(0,212,255,.07)}',
        '.sim-option.selected{border-color:#d4af37;background:rgba(212,175,55,.1)}',
        /* Impact */
        '.sim-impact{background:rgba(0,245,160,.05);border:1px solid rgba(0,245,160,.2);border-radius:10px;padding:14px;margin-bottom:14px}',
        '.sim-impact-title{font-size:.65rem;color:#00f5a0;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;font-weight:700}',
        '.sim-impact-text{font-size:.83rem;line-height:1.7;color:rgba(255,255,255,.8)}',
        /* Report */
        '.sim-report-score{font-family:Orbitron,sans-serif;font-size:2.5rem;font-weight:700;text-align:center;margin:8px 0}',
        '.sim-grade{font-size:1rem;text-align:center;color:rgba(255,255,255,.5);margin-bottom:16px}',
        /* Buttons */
        '.sim-btn{padding:10px 22px;border-radius:10px;border:1px solid;cursor:pointer;font-size:.84rem;font-weight:600;transition:all .2s}',
        '.sim-btn-cyan{background:rgba(0,212,255,.1);border-color:rgba(0,212,255,.4);color:#00d4ff}',
        '.sim-btn-gold{background:rgba(212,175,55,.15);border-color:rgba(212,175,55,.4);color:#d4af37}',
        '.sim-btn-ghost{background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12);color:rgba(255,255,255,.5)}',
        '.sim-btn-row{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}',
        '.sim-loading{text-align:center;padding:30px;font-size:.85rem;color:rgba(255,255,255,.4)}',
        '.sim-spin{width:36px;height:36px;border:3px solid rgba(0,212,255,.2);border-top-color:#00d4ff;border-radius:50%;animation:sb-spin .8s linear infinite;margin:0 auto 10px}',
    ].join('');
    document.head.appendChild(s);
}

// ─── Main render ──────────────────────────────────────────────────────────────
function simOpen() {
    _css();
    var sec = document.getElementById('biz-sim');
    if (!sec) return;
    if (!_sim.role) { _renderSetup(sec); return; }
    _renderDashboard(sec);
}

// ─── Setup ────────────────────────────────────────────────────────────────────
function _renderSetup(sec) {
    var roleHtml = _roles.map(function(r) {
        return '<div class="sim-choice' + (_sim.role===r.id?' selected':'') + '" onclick="_simSelectRole(\'' + r.id + '\')">' +
            '<div class="sim-choice-icon">' + r.icon + '</div>' +
            '<div class="sim-choice-title">' + r.title + '</div>' +
            '<div class="sim-choice-desc">' + r.desc + '</div></div>';
    }).join('');

    var compHtml = _companies.map(function(c) {
        return '<div class="sim-choice' + (_sim.company===c.id?' selected':'') + '" onclick="_simSelectCompany(\'' + c.id + '\')">' +
            '<div class="sim-choice-icon">' + c.icon + '</div>' +
            '<div class="sim-choice-title">' + c.name + '</div>' +
            '<div class="sim-choice-desc">ميزانية: ' + _AUS_UTILS.currency(c.budget) + '<br>' + c.employees + ' موظف</div></div>';
    }).join('');

    sec.innerHTML = '<div id="sim-wrap"><div class="sim-title">🏢 Business Simulator</div>' +
        '<div class="sim-sub">محاكاة واقعية · قرارات حقيقية · تأثير مباشر على الأعمال</div>' +
        '<div class="sim-card"><div class="sim-card-title">اختر دورك</div><div class="sim-grid">' + roleHtml + '</div></div>' +
        '<div class="sim-card"><div class="sim-card-title">اختر نوع الشركة</div><div class="sim-grid">' + compHtml + '</div></div>' +
        '<div class="sim-btn-row" style="justify-content:center">' +
        '<button class="sim-btn sim-btn-gold" onclick="_simStart()" id="sim-start-btn" disabled>ابدأ المحاكاة →</button></div></div>';
}

window._simSelectRole = function(id) {
    _sim.role = id;
    document.querySelectorAll('.sim-choice').forEach(function(el) { el.classList.remove('selected'); });
    event.currentTarget.classList.add('selected');
    _checkStartReady();
};

window._simSelectCompany = function(id) {
    _sim.company = id;
    document.querySelectorAll('.sim-choice').forEach(function(el) { el.classList.remove('selected'); });
    event.currentTarget.classList.add('selected');
    _checkStartReady();
};

function _checkStartReady() {
    var btn = document.getElementById('sim-start-btn');
    if (btn) btn.disabled = !(_sim.role && _sim.company);
}

window._simStart = function() {
    var comp = _companies.find(function(c){ return c.id === _sim.company; });
    if (!comp) return;
    _sim.metrics = {
        revenue: comp.rev, profit: Math.round(comp.rev * 0.12),
        cashFlow: Math.round(comp.budget * 0.3), marketShare: 8,
        satisfaction: 70, morale: 72
    };
    _sim.round = 1; _sim.decisions = []; _sim.score = 0;
    window._AUS_BUS.emit('SIM_STARTED', { role: _sim.role, company: _sim.company });
    _renderDashboard(document.getElementById('biz-sim'));
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
function _renderDashboard(sec) {
    var role = _roles.find(function(r){ return r.id === _sim.role; }) || _roles[0];
    var comp = _companies.find(function(c){ return c.id === _sim.company; }) || _companies[0];
    var u = _AUS_UTILS;

    var roundDots = '';
    for (var i = 1; i <= _sim.totalRounds; i++) {
        roundDots += '<div class="sim-round-dot' + (i < _sim.round ? ' done' : i === _sim.round ? ' current' : '') + '"></div>';
    }

    var metricsData = [
        { key:'revenue',      label:'Revenue',          val: u.currency(_sim.metrics.revenue),      color:'#d4af37' },
        { key:'profit',       label:'Profit',           val: u.currency(_sim.metrics.profit),       color: _sim.metrics.profit >= 0 ? '#00f5a0' : '#ff6b6b' },
        { key:'cashFlow',     label:'Cash Flow',        val: u.currency(_sim.metrics.cashFlow),     color:'#00d4ff' },
        { key:'marketShare',  label:'Market Share',     val: _sim.metrics.marketShare + '%',        color:'#c084fc' },
        { key:'satisfaction', label:'Customer Sat.',    val: _sim.metrics.satisfaction + '/100',    color:'#ffc800' },
        { key:'morale',       label:'Team Morale',      val: _sim.metrics.morale + '/100',          color:'#00f5a0' }
    ];

    var mHtml = metricsData.map(function(m) {
        var d = _sim['_prev_' + m.key];
        var delta = d !== undefined ? (_sim.metrics[m.key] - d) : null;
        var dHtml = '';
        if (delta !== null && delta !== 0) {
            var isUp = delta > 0;
            dHtml = '<div class="sim-m-delta ' + (isUp ? 'delta-up' : 'delta-dn') + '">' + (isUp ? '▲' : '▼') + ' ' + Math.abs(Math.round(delta)) + '</div>';
        }
        return '<div class="sim-metric"><div class="sim-m-val" style="color:' + m.color + '">' + m.val + '</div>' +
            '<div class="sim-m-lbl">' + m.label + '</div>' + dHtml + '</div>';
    }).join('');

    var bodyHtml = '';
    if (!_sim.scenario && _sim.round <= _sim.totalRounds) {
        bodyHtml = '<div class="sim-loading"><div class="sim-spin"></div>يُولِّد السيناريو...</div>';
    } else if (_sim.round > _sim.totalRounds) {
        bodyHtml = _buildReport();
    } else {
        bodyHtml = _renderScenarioHTML();
    }

    sec.innerHTML = '<div id="sim-wrap">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">' +
        '<div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:#00d4ff;flex:1">' + role.icon + ' ' + role.title + ' · ' + comp.name + '</div>' +
        '<button class="sim-btn sim-btn-ghost" style="font-size:.72rem;padding:5px 12px" onclick="_simReset()">إعادة ضبط</button></div>' +
        '<div class="sim-rounds">' + roundDots + '</div>' +
        '<div class="sim-card"><div class="sim-card-title">📊 مؤشرات الشركة</div>' +
        '<div class="sim-metrics">' + mHtml + '</div></div>' +
        '<div class="sim-card">' + bodyHtml + '</div></div>';

    if (!_sim.scenario && _sim.round <= _sim.totalRounds) _loadScenario();
}

/* ── Scenario types — one per round, shuffled ──────────────────────────────── */
var _scenarioTypes = [
    {
        id:'crisis', icon:'🚨', label:'إدارة الأزمات', color:'#ff6b6b',
        hint:'تحدٍّ عاجل يتطلب قراراً فورياً تحت ضغط الوقت',
        directive:'Create an URGENT CRISIS scenario (cyberattack, product recall, key employee resignation, PR disaster, or cash flow emergency). Stress the time pressure.'
    },
    {
        id:'financial', icon:'💹', label:'قرار مالي', color:'#d4af37',
        hint:'أرقام وميزانيات — هل تستثمر أم توفّر؟',
        directive:'Create a FINANCIAL DECISION scenario involving budget allocation, cost cutting, investment choices, or funding decisions. Include specific dollar amounts to make it concrete.'
    },
    {
        id:'negotiation', icon:'🤝', label:'تفاوض', color:'#00d4ff',
        hint:'مورد أو مستثمر أو شريك — ما موقفك؟',
        directive:'Create a NEGOTIATION scenario with a supplier demanding higher prices, an investor offering unfavorable terms, a potential acquisition offer, or a key partnership deal. Focus on the leverage and trade-offs.'
    },
    {
        id:'people', icon:'👥', label:'قيادة وفريق', color:'#c084fc',
        hint:'قرارات الناس — التوظيف، الثقافة، الاحتفاظ',
        directive:'Create a PEOPLE & LEADERSHIP scenario about a top performer wanting to leave, team conflict, diversity issues, performance management, or scaling the hiring process. Focus on human dynamics.'
    },
    {
        id:'market', icon:'🌍', label:'فرصة السوق', color:'#00f5a0',
        hint:'توسع جغرافي أو دخول قطاع جديد',
        directive:'Create a MARKET OPPORTUNITY scenario about entering a new market, geographic expansion, targeting a new customer segment, or launching a new product line. Include market size and risk factors.'
    },
    {
        id:'ops', icon:'⚙️', label:'كفاءة العمليات', color:'#ffc800',
        hint:'عمليات وإنتاجية وسلسلة توريد',
        directive:'Create an OPERATIONS scenario about supply chain disruption, process inefficiency, technology upgrade decisions, outsourcing vs insourcing, or quality control issues.'
    },
    {
        id:'innovation', icon:'💡', label:'ابتكار وتقنية', color:'#a78bfa',
        hint:'تقنية جديدة أو تحول في المنتج',
        directive:'Create an INNOVATION scenario about whether to adopt AI/automation, pivot the product based on new user data, acquire a tech startup, or respond to a disruptive competitor using new technology.'
    },
    {
        id:'ethics', icon:'⚖️', label:'معضلة أخلاقية', color:'#fb923c',
        hint:'منطقة رمادية — الربح مقابل المبادئ',
        directive:'Create an ETHICAL DILEMMA scenario — a grey area where profit and ethics conflict, such as data privacy, environmental impact, labor practices in a supply chain, or misleading marketing. There is no perfect answer.'
    }
];

/* Assign one type per round, no repeats across 5 rounds */
function _getScenarioType(round) {
    if (!_sim._roundTypes) {
        var pool = _scenarioTypes.slice();
        _sim._roundTypes = [];
        while (_sim._roundTypes.length < 5) {
            var idx = Math.floor(Math.random() * pool.length);
            _sim._roundTypes.push(pool.splice(idx, 1)[0]);
        }
    }
    return _sim._roundTypes[(round - 1) % _sim._roundTypes.length];
}

/* Fallback scenarios per type — THREE variants each (not one) so offline play
   (or any time the AI backend at :8002 is unreachable) still feels varied
   across repeated simulation runs instead of replaying the same case file. */
var _fallbacks = {
    crisis: [
        { scenario:'Your lead developer just submitted their resignation and plans to leave in 2 weeks — taking critical product knowledge with them. Three major features are mid-development.', options:[{id:'a',text:'Offer a large counter-offer and retention bonus'},{id:'b',text:'Begin emergency knowledge transfer and document everything'},{id:'c',text:'Start recruiting immediately while slowing features'},{id:'d',text:'Bring in a contractor to cover the gap immediately'}] },
        { scenario:'A critical production server suffered a security breach exposing customer emails and hashed passwords. Regulators require disclosure within 72 hours, but your PR team needs more time to prepare messaging.', options:[{id:'a',text:'Disclose immediately per regulation despite incomplete details'},{id:'b',text:'Take 48 hours to prepare a complete, reassuring disclosure'},{id:'c',text:'Hire an external crisis PR firm before saying anything'},{id:'d',text:'Notify only directly affected users and skip broader disclosure'}] },
        { scenario:'Your biggest customer, representing 25% of revenue, just threatened to cancel their contract after a service outage cost them significant money.', options:[{id:'a',text:'Offer a generous service credit and a personal apology from leadership'},{id:'b',text:'Decline to renegotiate — the outage terms were within contract'},{id:'c',text:'Propose a joint post-mortem and process overhaul together'},{id:'d',text:'Escalate internally to review contract termination exposure'}] }
    ],
    financial: [
        { scenario:'You have $500K in unallocated budget. Sales growth has plateaued at 3%. You must decide how to deploy this capital before the quarter ends.', options:[{id:'a',text:'Double down on paid marketing and growth channels'},{id:'b',text:'Hire 3 senior engineers to accelerate product development'},{id:'c',text:'Open a new regional office to capture a new market'},{id:'d',text:'Build a 9-month cash reserve as economic uncertainty rises'}] },
        { scenario:'Quarterly results show costs grew 22% while revenue grew only 9%. The board wants a plan to restore margins within two quarters.', options:[{id:'a',text:'Implement an across-the-board 10% cost reduction'},{id:'b',text:'Freeze hiring and renegotiate all vendor contracts'},{id:'c',text:'Restructure by cutting the lowest-performing 15% of the team'},{id:'d',text:'Raise prices by 8% and accept some customer churn'}] },
        { scenario:'A competitor just raised $50M in funding and is undercutting your prices by 20%. Your cash runway is 14 months at the current burn rate.', options:[{id:'a',text:'Match the price cuts and extend runway via a bridge round'},{id:'b',text:'Differentiate on premium features instead of competing on price'},{id:'c',text:'Cut burn rate by 30% to extend runway past 20 months'},{id:'d',text:'Accelerate fundraising now before market conditions worsen'}] }
    ],
    negotiation: [
        { scenario:'A major supplier wants to raise prices by 18% citing inflation. They supply 60% of your raw materials. Switching suppliers takes 3 months.', options:[{id:'a',text:'Accept the price increase to avoid supply disruption'},{id:'b',text:'Negotiate: accept 10% now, review in 6 months'},{id:'c',text:'Begin supplier diversification immediately despite short-term risk'},{id:'d',text:'Pass the cost increase to customers with a price adjustment'}] },
        { scenario:'An investor is offering a $2M term sheet, but wants a board seat, a 2x liquidation preference, and veto rights over major decisions.', options:[{id:'a',text:'Accept the terms — capital now outweighs control concerns'},{id:'b',text:'Counter-negotiate to remove the veto rights specifically'},{id:'c',text:'Walk away and seek less restrictive investors'},{id:'d',text:'Accept but negotiate a sunset clause on the veto rights'}] },
        { scenario:'A larger competitor has offered to acquire your company for $12M, below your internal valuation of $20M, citing current market conditions.', options:[{id:'a',text:'Reject and continue building toward the higher valuation'},{id:'b',text:'Counter at $16M as a realistic middle ground'},{id:'c',text:'Accept — certainty now beats uncertain future upside'},{id:'d',text:'Request an earn-out structure to bridge the valuation gap'}] }
    ],
    people: [
        { scenario:'Your top sales manager — responsible for 40% of revenue — is being actively recruited by a competitor and has asked for a 35% raise.', options:[{id:'a',text:'Match their ask — retention is cheaper than replacement'},{id:'b',text:'Offer equity instead of cash to align incentives'},{id:'c',text:'Decline and begin succession planning now'},{id:'d',text:'Counter with 20% raise plus accelerated performance bonus'}] },
        { scenario:'Two of your engineering leads are in an escalating conflict over technical direction, and it is starting to affect team morale and delivery timelines.', options:[{id:'a',text:'Mediate a joint session to align on a shared technical vision'},{id:'b',text:'Make the final call yourself and end the debate'},{id:'c',text:'Split the team so each lead owns a separate area'},{id:'d',text:'Bring in an external technical advisor to arbitrate'}] },
        { scenario:'An anonymous survey reveals 40% of employees feel burned out, right before a critical product launch the whole company is counting on.', options:[{id:'a',text:'Delay the launch by 3 weeks to protect team wellbeing'},{id:'b',text:'Proceed with the launch but offer post-launch time off'},{id:'c',text:'Bring in temporary contractors to share the load'},{id:'d',text:'Ask for volunteers to push through with extra compensation'}] }
    ],
    market: [
        { scenario:'A market research report shows strong demand for your product in Southeast Asia, but entering requires $800K investment and 18 months before first revenue.', options:[{id:'a',text:'Pursue full market entry with a dedicated local team'},{id:'b',text:'Test with a digital-only go-to-market at low cost'},{id:'c',text:'Find a local distribution partner to reduce risk'},{id:'d',text:'Defer expansion and focus on deepening current market'}] },
        { scenario:'Your core market shows signs of saturation, but an adjacent customer segment has expressed strong interest in a simplified version of your product.', options:[{id:'a',text:'Build a dedicated lightweight product for the new segment'},{id:'b',text:'Bundle a simplified tier into your existing product line'},{id:'c',text:'Run a 90-day pilot before committing engineering resources'},{id:'d',text:'Stay focused on deepening the core market instead'}] },
        { scenario:'A well-funded competitor just entered your home market with an aggressive freemium model, and early data shows some customer churn toward them.', options:[{id:'a',text:'Launch a competing freemium tier within 60 days'},{id:'b',text:'Double down on premium value and customer service instead'},{id:'c',text:'Lock in customers with annual contracts and added incentives'},{id:'d',text:'Study churned customers deeply before reacting'}] }
    ],
    ops: [
        { scenario:'Your main cloud provider announces a 40% price increase. Migrating to another provider would take 4 months and cost $120K in engineering time.', options:[{id:'a',text:'Absorb the cost increase — stability is worth more'},{id:'b',text:'Negotiate a multi-year contract for better pricing'},{id:'c',text:'Begin migration to cut long-term costs'},{id:'d',text:'Move to a hybrid cloud architecture to reduce dependency'}] },
        { scenario:'A key manufacturing partner missed three consecutive delivery deadlines, delaying product shipments and frustrating customers.', options:[{id:'a',text:'Issue a formal warning with a defined improvement plan'},{id:'b',text:'Begin qualifying a backup manufacturing partner immediately'},{id:'c',text:"Send your own team to the partner's facility to diagnose issues"},{id:'d',text:'Terminate the contract and absorb the short-term disruption'}] },
        { scenario:'An internal audit reveals your customer data pipeline has quality issues, causing incorrect reports to go out to several major clients.', options:[{id:'a',text:'Pause all outbound reporting until the pipeline is fixed'},{id:'b',text:'Proactively notify affected clients and issue corrections'},{id:'c',text:'Fix silently and monitor closely without alerting clients'},{id:'d',text:'Bring in an external data engineering firm to rebuild it'}] }
    ],
    innovation: [
        { scenario:'A new AI tool could automate 60% of your customer support at a fraction of the cost, but 8 support staff would need to be redeployed or let go.', options:[{id:'a',text:'Implement AI fully and redeploy staff to other functions'},{id:'b',text:'Pilot AI on 30% of tickets while keeping full team'},{id:'c',text:'Delay until AI tools are more proven'},{id:'d',text:'Build a custom AI solution for a competitive advantage'}] },
        { scenario:'User data shows your flagship feature is used by only 8% of customers, while a smaller experimental feature is seeing unexpectedly high engagement.', options:[{id:'a',text:'Pivot resources to double down on the experimental feature'},{id:'b',text:'Keep both running and gather more data before deciding'},{id:'c',text:'Sunset the flagship feature gradually over two quarters'},{id:'d',text:'Combine both into a single redesigned core experience'}] },
        { scenario:'A startup you could acquire for $3M has technology that would save you 18 months of R&D, but their team culture clashes with yours.', options:[{id:'a',text:'Proceed with the acquisition and manage integration carefully'},{id:'b',text:'License the technology instead of acquiring the company'},{id:'c',text:'Build the equivalent technology in-house despite the delay'},{id:'d',text:'Acquire only the technology and IP, not the team'}] }
    ],
    ethics: [
        { scenario:"A data analytics partner offers to sell you detailed behavioral data on your competitor's customers. It's legal but ethically questionable, and it could double your conversion rate.", options:[{id:'a',text:'Purchase the data — it is legal and competitors likely will'},{id:'b',text:'Decline — protect your brand reputation and values'},{id:'c',text:'Request a legal review and ethics committee opinion first'},{id:'d',text:'Use only anonymized aggregate data from the same source'}] },
        { scenario:"You discover a low-cost supplier your company relies on has labor practices that don't meet international standards, but switching would raise costs by 15%.", options:[{id:'a',text:'Switch suppliers immediately despite the cost increase'},{id:'b',text:'Give the current supplier 6 months to meet standards or lose the contract'},{id:'c',text:'Continue as-is since practices are legal in that jurisdiction'},{id:'d',text:'Absorb higher costs partially by adjusting margins and pricing'}] },
        { scenario:"Your marketing team wants to use a growth tactic that boosts conversions but relies on a slightly misleading urgency countdown timer that isn't real.", options:[{id:'a',text:'Approve it — many competitors use similar tactics'},{id:'b',text:'Reject it and find an honest alternative to drive urgency'},{id:'c',text:'Test it briefly then remove it regardless of results'},{id:'d',text:'Modify it to reflect a real, verifiable time constraint'}] }
    ]
};

// Pick a fallback scenario for this type, avoiding the same variant shown
// last time (persisted across sessions) so repeat play doesn't replay the
// identical case file every time the AI backend happens to be unreachable.
function _pickFallbackScenario(typeId) {
    var variants = _fallbacks[typeId] || _fallbacks.crisis;
    var lastKey = 'aus.sim.lastFallback.' + typeId;
    var lastIdx = -1;
    try { lastIdx = parseInt(localStorage.getItem(lastKey), 10); } catch (e) {}
    var pool = variants.map(function (_, i) { return i; });
    if (variants.length > 1 && pool.indexOf(lastIdx) !== -1) pool.splice(pool.indexOf(lastIdx), 1);
    var choice = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(lastKey, String(choice)); } catch (e) {}
    return variants[choice];
}

function _loadScenario() {
    var role = _roles.find(function(r){ return r.id === _sim.role; }) || _roles[0];
    var comp = _companies.find(function(c){ return c.id === _sim.company; }) || _companies[0];
    var type = _getScenarioType(_sim.round);

    var prompt = 'Create a realistic business scenario for Round ' + _sim.round + '/5.\n' +
        'Role: ' + role.title + ', Company type: ' + comp.name + ', Revenue: $' + _sim.metrics.revenue + ', Market Share: ' + _sim.metrics.marketShare + '%\n' +
        'Scenario type: ' + type.label + ' — ' + type.directive + '\n' +
        'IMPORTANT: Make the scenario specific to the role (' + role.title + ') and company size (' + comp.name + ').\n' +
        'Reply ONLY as JSON: {"scenario":"2-3 sentence situation","options":[{"id":"a","text":"Option A"},{"id":"b","text":"Option B"},{"id":"c","text":"Option C"},{"id":"d","text":"Option D"}]}';

    _AUS_AI.askJSON('businessSim', prompt,
        'You are a Harvard Business School case writer. Create realistic, nuanced scenarios with no obvious right answer. Each option should have real trade-offs.',
        function(err, json) {
            if (!json) json = _pickFallbackScenario(type.id);
            json._type = type;
            _sim.scenario = json;
            _renderDashboard(document.getElementById('biz-sim'));
        });
}

function _renderScenarioHTML() {
    if (!_sim.scenario) return '';
    var type = _sim.scenario._type || { icon:'🎯', label:'قرار أعمال', color:'#00d4ff', hint:'' };
    var html = '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
        '<div class="sim-card-title" style="margin-bottom:0">الجولة ' + _sim.round + ' من ' + _sim.totalRounds + '</div>' +
        '<span style="padding:3px 12px;border-radius:20px;font-size:.68rem;font-weight:700;letter-spacing:.05em;border:1px solid ' + type.color + '33;background:' + type.color + '18;color:' + type.color + '">' + type.icon + ' ' + type.label + '</span>' +
        '</div>' +
        '<div style="font-size:.65rem;color:rgba(255,255,255,.3);margin-bottom:10px;font-style:italic">' + type.hint + '</div>' +
        '<div class="sim-scenario">' + _AUS_UTILS.sanitize(_sim.scenario.scenario) + '</div>' +
        '<div style="font-size:.68rem;color:rgba(255,255,255,.35);margin-bottom:10px">اختر القرار الأنسب:</div>' +
        '<div class="sim-options">';
    (_sim.scenario.options || []).forEach(function(opt) {
        html += '<div class="sim-option" id="simopt-' + opt.id + '" onclick="_simChoose(\'' + opt.id + '\')">' +
            _AUS_UTILS.sanitize(opt.text) + '</div>';
    });
    html += '</div>';
    if (_sim._impact) {
        html += '<div class="sim-impact"><div class="sim-impact-title">📈 تأثير القرار</div>' +
            '<div class="sim-impact-text">' + _AUS_UTILS.sanitize(_sim._impact) + '</div></div>' +
            '<div class="sim-btn-row"><button class="sim-btn sim-btn-gold" onclick="_simNextRound()">الجولة التالية →</button></div>';
    }
    return html;
}

window._simChoose = function(optId) {
    document.querySelectorAll('.sim-option').forEach(function(el){ el.classList.remove('selected'); });
    var el = document.getElementById('simopt-' + optId);
    if (el) el.classList.add('selected');
    var opt = (_sim.scenario.options || []).find(function(o){ return o.id === optId; });
    if (!opt) return;
    _evaluateDecision(opt.text);
};

// Varied fallback outcomes for when the AI backend is unreachable — without
// this pool, every single decision (regardless of which option was picked)
// produced the exact same generic feedback and the exact same score.
var _impactFallbacks = [
    { impact:'قرار جريء يفتح الباب لنمو أسرع لكنه يرفع المخاطر التشغيلية على المدى القريب.', revenueChange:8, profitChange:-2, cashFlowChange:-5, marketShareChange:4, satisfactionChange:3, moraleChange:-2, score:72 },
    { impact:'خيار متحفظ يحافظ على الاستقرار المالي، لكنه يبطئ وتيرة النمو مؤقتاً.', revenueChange:1, profitChange:4, cashFlowChange:6, marketShareChange:-1, satisfactionChange:1, moraleChange:2, score:68 },
    { impact:'نتيجة مختلطة — تحسّن ملموس في رضا العملاء يقابله ضغط إضافي على الفريق.', revenueChange:3, profitChange:1, cashFlowChange:-2, marketShareChange:2, satisfactionChange:6, moraleChange:-4, score:65 },
    { impact:'عزّز القرار ثقة الفريق الداخلي بوضوح، لكن الأثر على الأرقام المالية كان محدوداً هذه الجولة.', revenueChange:0, profitChange:0, cashFlowChange:1, marketShareChange:0, satisfactionChange:2, moraleChange:9, score:70 },
    { impact:'استجابة سريعة وحاسمة حسّنت المؤشرات التشغيلية، لكنها استهلكت جزءاً من السيولة المتاحة.', revenueChange:5, profitChange:3, cashFlowChange:-8, marketShareChange:3, satisfactionChange:4, moraleChange:1, score:74 },
    { impact:'نهج حذر أدى لتراجع طفيف في الحصة السوقية أمام منافس أكثر جرأة، مقابل حماية الهامش الربحي.', revenueChange:-2, profitChange:5, cashFlowChange:3, marketShareChange:-3, satisfactionChange:-1, moraleChange:0, score:60 },
    { impact:'قرار متوازن حقق مكاسب معتدلة عبر معظم المؤشرات دون مخاطرة كبيرة.', revenueChange:4, profitChange:2, cashFlowChange:1, marketShareChange:1, satisfactionChange:2, moraleChange:1, score:71 },
    { impact:'رغم النية الجيدة، جاءت النتائج أضعف من المتوقع بسبب عوامل خارجة عن السيطرة.', revenueChange:-3, profitChange:-4, cashFlowChange:-2, marketShareChange:-1, satisfactionChange:-2, moraleChange:-3, score:52 }
];
function _pickFallbackImpact() {
    var lastIdx = -1;
    try { lastIdx = parseInt(localStorage.getItem('aus.sim.lastImpactFallback'), 10); } catch (e) {}
    var pool = _impactFallbacks.map(function (_, i) { return i; });
    if (pool.indexOf(lastIdx) !== -1) pool.splice(pool.indexOf(lastIdx), 1);
    var choice = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem('aus.sim.lastImpactFallback', String(choice)); } catch (e) {}
    return Object.assign({}, _impactFallbacks[choice]); // copy — caller may read/mutate freely
}

function _evaluateDecision(decision) {
    var prompt = 'Evaluate this business decision. Reply ONLY as JSON:\n' +
        '{"impact":"2-3 sentence explanation of consequences","revenueChange":5,"profitChange":3,"cashFlowChange":2,"marketShareChange":1,"satisfactionChange":2,"moraleChange":-1,"score":75}\n' +
        '(changes are percentage points, can be negative)\n' +
        'Context: ' + (_sim.scenario||{}).scenario + '\nDecision: ' + decision;

    _AUS_AI.askJSON('businessSim', prompt,
        'You are a business analyst. Provide realistic impact assessments. Mix positive and negative consequences.',
        function(err, json) {
            if (!json) json = _pickFallbackImpact();

            // Store prev for delta display
            Object.keys(_sim.metrics).forEach(function(k){ _sim['_prev_'+k] = _sim.metrics[k]; });

            // Apply changes
            _sim.metrics.revenue     = Math.round(_sim.metrics.revenue     * (1 + (json.revenueChange||0)/100));
            _sim.metrics.profit      = Math.round(_sim.metrics.profit      * (1 + (json.profitChange||0)/100));
            _sim.metrics.cashFlow    = Math.round(_sim.metrics.cashFlow    * (1 + (json.cashFlowChange||0)/100));
            _sim.metrics.marketShare = Math.min(100, Math.max(0, _sim.metrics.marketShare + (json.marketShareChange||0)));
            _sim.metrics.satisfaction= Math.min(100, Math.max(0, _sim.metrics.satisfaction + (json.satisfactionChange||0)));
            _sim.metrics.morale      = Math.min(100, Math.max(0, _sim.metrics.morale + (json.moraleChange||0)));

            _sim.score += (json.score || 65);
            _sim._impact = json.impact;
            _sim.decisions.push({ round: _sim.round, decision: decision, score: json.score || 65, impact: json.impact });

            window._AUS_BUS.emit('SIM_DECISION_MADE', { round: _sim.round, score: json.score });
            _renderDashboard(document.getElementById('biz-sim'));
        });
}

window._simNextRound = function() {
    _sim.round++;
    _sim.scenario = null;
    _sim._impact = null;
    if (_sim.round > _sim.totalRounds) {
        window._AUS_BUS.emit('SIM_COMPLETED', { finalScore: Math.round(_sim.score / _sim.totalRounds) });
        window._AUS_BUS.emit('XP_AWARDED', { amount: 50, source: 'sim_completed' });
    }
    _renderDashboard(document.getElementById('biz-sim'));
};

window._simReset = function() {
    _sim.role = null; _sim.company = null; _sim.round = 0; _sim.scenario = null;
    _sim._impact = null; _sim.decisions = []; _sim.score = 0; _sim._roundTypes = null;
    simOpen();
};

function _buildReport() {
    var avg = _sim.decisions.length ? Math.round(_sim.score / _sim.decisions.length) : 60;
    var grade = avg >= 80 ? 'A — ممتاز 🌟' : avg >= 70 ? 'B — جيد جداً' : avg >= 60 ? 'C — جيد' : 'D — يحتاج تطوير';
    var color = _AUS_UTILS.scoreColor(avg);

    var html = '<div class="sim-card-title">📊 تقرير المحاكاة النهائي</div>' +
        '<div class="sim-report-score" style="color:' + color + '">' + avg + '</div>' +
        '<div class="sim-grade">' + grade + '</div>';

    html += '<div style="margin-bottom:14px">';
    _sim.decisions.forEach(function(d, i) {
        var c = _AUS_UTILS.scoreColor(d.score);
        html += '<div style="border-left:3px solid ' + c + ';padding:8px 12px;margin-bottom:8px;background:rgba(255,255,255,.03);border-radius:0 8px 8px 0">' +
            '<div style="font-size:.65rem;color:rgba(255,255,255,.4);margin-bottom:3px">الجولة ' + (i+1) + ' · نتيجة: <span style="color:' + c + '">' + d.score + '/100</span></div>' +
            '<div style="font-size:.75rem;color:rgba(255,255,255,.65)">' + _AUS_UTILS.sanitize(d.impact) + '</div></div>';
    });
    html += '</div>';

    html += '<div class="sim-btn-row">' +
        '<button class="sim-btn sim-btn-gold" onclick="_simReset()">🔄 محاكاة جديدة</button>' +
        '</div>';
    return html;
}

// Register
if (window._AUS_REGISTRY) {
    window._AUS_REGISTRY.register('businessSim', { open: simOpen }, {
        name: 'Business Simulator', icon: '🏢', sectionId: 'biz-sim',
        defaultEnabled: true, sprint: 2
    });
}
window.simOpen = simOpen;

})();
