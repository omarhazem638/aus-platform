// =============================================================================
// aus_09_dict_v2.js  —  BELC Business Dictionary v2.0
// 250+ Terms · Full Data · Categories: Finance, Marketing, Management,
//              HR, Operations, Economics, Entrepreneurship, Digital
// Fields: en, ar, ar_ex, ex, pos, ctx, syn[], ant[], phonetic, difficulty(1-5)
//   difficulty: 1=Beginner  2=Elementary  3=Intermediate  4=Advanced  5=Expert
// Architecture: single global window._BELC_DICT; falls back to _engDict
// Security: no eval, no innerHTML injection from this file, immutable after load
// =============================================================================

(function () {
'use strict';

// Compact entry builder — keeps file readable without verbosity
function E(en, ar, ar_ex, ex, pos, ctx, syn, ant, ph, d) {
    return {
        en: en || '', ar: ar || '', ar_ex: ar_ex || '',
        ex: ex || '', pos: pos || 'noun', ctx: ctx || '',
        syn: syn || [], ant: ant || [],
        phonetic: ph || '', difficulty: d || 3
    };
}

// ─────────────────────────────────────────────────────────────────────────────
window._BELC_DICT = {

// ════════════════════════════════ FINANCE ════════════════════════════════════

'revenue': E(
    'The total income a company earns from its core business operations, primarily from selling goods or services.',
    'الإيرادات',
    'ارتفعت إيرادات الشركة بنسبة 25% في الربع الثالث بسبب نمو المبيعات.',
    'The company reported record revenue of $12 billion, driven by strong international sales.',
    'noun','Top line of the income statement; the starting point for measuring profitability.',
    ['income','turnover','sales','receipts','gross income'],
    ['expenditure','expenses','costs','outgoings'],
    '/ˈrevənjuː/', 1),

'profit': E(
    'The financial gain remaining after all costs, expenses, and taxes have been deducted from revenue.',
    'الربح',
    'حقق المشروع ربحاً صافياً قدره مليون دولار بعد خصم جميع التكاليف.',
    'Despite challenging market conditions, the firm posted a net profit of $2.3 million.',
    'noun','The ultimate measure of business success and sustainability.',
    ['gain','earnings','surplus','net income','return'],
    ['loss','deficit','shortfall'],
    '/ˈprɒfɪt/', 1),

'loss': E(
    'A financial outcome where expenses exceed revenues, resulting in a negative profit figure.',
    'الخسارة',
    'تكبّدت الشركة خسارة صافية بسبب ارتفاع التكاليف التشغيلية.',
    'The startup reported a net loss of $5 million as it invested heavily in growth.',
    'noun','A loss can be strategic (investing for future growth) or a warning sign of financial trouble.',
    ['deficit','shortfall','negative return'],
    ['profit','gain','surplus'],
    '/lɒs/', 1),

'asset': E(
    'Any resource owned by a business that has economic value and can generate future cash flows.',
    'الأصل',
    'تمتلك الشركة أصولاً ثابتة تشمل المباني والمعدات بقيمة 50 مليون دولار.',
    'The company\'s total assets grew by 18% following the acquisition of new properties.',
    'noun','Classified as current (liquid within a year) or non-current (long-term).',
    ['resource','holding','property','capital'],
    ['liability','debt'],
    '/ˈæset/', 2),

'liability': E(
    'A financial obligation or debt that a company owes to external parties.',
    'الالتزام / المطلوبات',
    'تتضمن مطلوبات الشركة القروض المصرفية والديون قصيرة الأجل.',
    'The firm reduced its total liabilities by restructuring long-term debt.',
    'noun','Appears on the right side of the balance sheet; categorized as current or long-term.',
    ['debt','obligation','payable','burden'],
    ['asset','resource'],
    '/ˌlaɪəˈbɪlɪti/', 3),

'equity': E(
    'The ownership interest in a company; the residual value after liabilities are subtracted from assets.',
    'حقوق الملكية',
    'بلغت حقوق ملكية المساهمين في الميزانية العمومية 80 مليون دولار.',
    'Shareholders\' equity increased by 15% after the company retained a large portion of its profits.',
    'noun','Equity represents what belongs to the owners. Also called net worth or book value.',
    ['ownership','net worth','shareholders\' equity','book value'],
    ['debt','liability'],
    '/ˈekwɪti/', 3),

'cash flow': E(
    'The net amount of cash being transferred into and out of a business over a period.',
    'التدفق النقدي',
    'يُعدّ التدفق النقدي الإيجابي مؤشراً مهماً على صحة الأعمال.',
    'Strong cash flow allowed the company to invest in new equipment without taking on debt.',
    'noun','Positive cash flow means more cash coming in than going out — critical for operations.',
    ['liquidity','cash movement','fund flow'],
    ['cash drain','negative cash flow'],
    '/kæʃ fləʊ/', 2),

'budget': E(
    'A financial plan estimating revenues and expenses over a specified future period.',
    'الميزانية',
    'وضعت الشركة ميزانية سنوية بإجمالي 10 ملايين دولار للعمليات والتطوير.',
    'The marketing team submitted a budget proposal of $500,000 for the upcoming fiscal year.',
    'noun','Budgets are control tools — they measure actual performance against planned performance.',
    ['financial plan','forecast','estimate','allocation'],
    ['overspend','deficit'],
    '/ˈbʌdʒɪt/', 1),

'depreciation': E(
    'The systematic reduction in the value of a fixed asset over its useful life.',
    'الاستهلاك / الإهلاك',
    'تخصم الشركة قسطاً سنوياً من قيمة المعدات كاستهلاك في حساباتها.',
    'Annual depreciation of the manufacturing equipment reduced taxable income by $200,000.',
    'noun','Non-cash expense that reduces asset value and lowers taxable income.',
    ['amortization','write-down','devaluation'],
    ['appreciation','increase in value'],
    '/dɪˌpriːʃiˈeɪʃən/', 4),

'roi': E(
    'Return on Investment — a performance metric measuring the efficiency of an investment relative to its cost.',
    'العائد على الاستثمار',
    'حقق الاستثمار في الحملة التسويقية عائداً على الاستثمار بنسبة 150%.',
    'The project delivered a 120% ROI within two years, well above the company\'s 80% target.',
    'noun','Calculated as: (Net Profit / Cost of Investment) × 100. Higher = better.',
    ['return','yield','profit margin','rate of return'],
    ['loss','sunk cost'],
    '/ˌɑːr.oʊˈaɪ/', 2),

'ebitda': E(
    'Earnings Before Interest, Taxes, Depreciation, and Amortization — a proxy for operational profitability.',
    'الأرباح قبل الفوائد والضرائب والاستهلاك والإطفاء',
    'بلغ مؤشر EBITDA للشركة 40 مليون دولار، مما يعكس قوتها التشغيلية.',
    'Investors use EBITDA to compare companies across industries by stripping out financing effects.',
    'noun','Widely used in valuation and mergers to assess core operating performance.',
    ['operating earnings','core profit','adjusted earnings'],
    ['net loss'],
    '/iːbɪtˈdɑː/', 5),

'liquidity': E(
    'The ability of a company to meet its short-term financial obligations using available cash or easily convertible assets.',
    'السيولة',
    'تحتفظ الشركة بسيولة عالية لتغطية التزاماتها قصيرة الأجل.',
    'High liquidity gives a company the flexibility to respond quickly to market opportunities.',
    'noun','Measured by ratios like current ratio and quick ratio.',
    ['solvency','cash availability','liquid assets'],
    ['illiquidity','insolvency'],
    '/lɪˈkwɪdɪti/', 4),

'dividend': E(
    'A distribution of a portion of a company\'s earnings to its shareholders.',
    'الأرباح الموزّعة / توزيعات الأرباح',
    'قرر مجلس الإدارة توزيع أرباح بقيمة دولارين للسهم الواحد.',
    'The board declared a quarterly dividend of $0.50 per share, rewarding long-term investors.',
    'noun','Companies that pay dividends are usually mature and profitable.',
    ['distribution','payout','yield','return'],
    ['retained earnings','reinvestment'],
    '/ˈdɪvɪdend/', 3),

'inflation': E(
    'The rate at which the general price level of goods and services rises, eroding purchasing power.',
    'التضخم',
    'أثّر ارتفاع التضخم على القدرة الشرائية للمستهلكين بشكل ملحوظ.',
    'Central banks raised interest rates aggressively to combat rising inflation.',
    'noun','Moderate inflation (2%) is normal; high inflation erodes savings and investment returns.',
    ['price increase','cost-push','demand-pull','CPI rise'],
    ['deflation','disinflation'],
    '/ɪnˈfleɪʃən/', 2),

'leverage': E(
    'The use of borrowed capital to amplify potential returns from an investment.',
    'الرافعة المالية',
    'لجأت الشركة إلى الرافعة المالية لتمويل عمليات الاستحواذ على شركات جديدة.',
    'The private equity firm used significant leverage to complete the $2 billion buyout.',
    'noun','High leverage amplifies both gains and losses — a double-edged financial tool.',
    ['debt financing','borrowing','gearing','financial multiplier'],
    ['equity financing','deleveraging'],
    '/ˈliːvərɪdʒ/', 4),

'capital': E(
    'Financial assets or resources used to fund business operations, expansion, or investment.',
    'رأس المال',
    'يحتاج المشروع إلى رأس مال ابتدائي قدره 500 ألف دولار للبدء.',
    'The startup raised $10 million in capital from venture investors to fuel rapid expansion.',
    'noun','Capital can be debt (borrowed) or equity (owned). It is the engine of business growth.',
    ['funding','investment','finance','resources','money'],
    ['debt','liability'],
    '/ˈkæpɪtl/', 2),

'audit': E(
    'A systematic independent examination of financial statements and records to assess accuracy and compliance.',
    'التدقيق / المراجعة المالية',
    'أجرت شركة محاسبة مستقلة تدقيقاً مالياً شاملاً على حسابات الشركة.',
    'The annual audit revealed minor discrepancies that were corrected before the year-end report.',
    'noun','External audits build investor trust; internal audits improve operations.',
    ['review','inspection','examination','verification'],
    ['negligence','oversight'],
    '/ˈɔːdɪt/', 3),

'valuation': E(
    'The process of determining the current or projected worth of a business or asset.',
    'التقييم',
    'قُدّرت قيمة الشركة بمليار دولار قبيل طرحها الأولي للاكتتاب العام.',
    'The startup\'s valuation hit $1 billion, officially making it a unicorn company.',
    'noun','Common methods: DCF, comparable company analysis, asset-based approach.',
    ['worth','appraisal','assessment','pricing'],
    ['devaluation','write-down'],
    '/ˌvæljuˈeɪʃən/', 4),

'merger': E(
    'The combination of two separate companies into a single new legal entity.',
    'الاندماج',
    'أعلنت الشركتان عن اندماجهما لتكوين عملاق جديد في قطاع التكنولوجيا.',
    'The merger between the two banks created the largest financial institution in the region.',
    'noun','Mergers are often pursued for synergies, market expansion, or competitive advantage.',
    ['consolidation','union','combination','amalgamation'],
    ['separation','split','spin-off','divestiture'],
    '/ˈmɜːrdʒər/', 3),

'acquisition': E(
    'The purchase of one company by another, where the acquired company may cease to exist independently.',
    'الاستحواذ',
    'استحوذت شركة التقنية الكبرى على منافسها الأصغر مقابل 500 مليون دولار.',
    'The tech giant\'s acquisition of the AI startup accelerated its product development by years.',
    'noun','Unlike a merger, one company absorbs another. Can be friendly or hostile.',
    ['takeover','buyout','purchase','procurement'],
    ['divestiture','sale','spin-off'],
    '/ˌækwɪˈzɪʃən/', 3),

'ipo': E(
    'Initial Public Offering — the first time a private company offers shares to the public on a stock exchange.',
    'الطرح العام الأولي',
    'جمعت الشركة 2 مليار دولار خلال طرحها العام الأولي في بورصة نيويورك.',
    'The company\'s IPO was oversubscribed 10 times, reflecting strong investor demand.',
    'noun','An IPO transforms a private company into a public one, providing access to capital markets.',
    ['public offering','going public','stock market debut','flotation'],
    ['private placement','buyback'],
    '/ˌaɪ.piːˈoʊ/', 4),

'breakeven': E(
    'The point at which total revenues equal total costs, resulting in neither profit nor loss.',
    'نقطة التعادل',
    'وصلت الشركة إلى نقطة التعادل بعد ستة أشهر من بدء التشغيل.',
    'The project will reach breakeven point after selling 10,000 units at the current price.',
    'noun','A critical planning target for new products, projects, and businesses.',
    ['cost recovery point','zero profit','parity'],
    ['profit zone','loss zone'],
    '/ˈbreɪkˌiːvən/', 2),

'overhead': E(
    'Ongoing indirect business expenses not directly tied to producing a specific product or service.',
    'التكاليف العامة / النفقات غير المباشرة',
    'تسعى الإدارة إلى خفض التكاليف العامة من خلال تحسين الكفاءة التشغيلية.',
    'The company reduced overhead by 20% through automating administrative tasks.',
    'noun','Includes rent, utilities, salaries of support staff, insurance.',
    ['indirect costs','fixed costs','running costs','operating expenses'],
    ['direct costs','variable costs','COGS'],
    '/ˈoʊvərhed/', 2),

'gross margin': E(
    'The percentage of revenue remaining after subtracting the cost of goods sold (COGS).',
    'هامش الربح الإجمالي',
    'بلغ هامش الربح الإجمالي للشركة 60%، مما يدل على كفاءة الإنتاج.',
    'Software companies typically enjoy high gross margins above 70% due to low distribution costs.',
    'noun','Gross margin = (Revenue − COGS) / Revenue × 100.',
    ['gross profit margin','markup','product profitability'],
    ['net margin','thin margin'],
    '/ɡrəʊs ˈmɑːrdʒɪn/', 3),

// ═══════════════════════════════ MARKETING ═══════════════════════════════════

'brand': E(
    'The unique identity, image, and perception of a company or product in the minds of consumers.',
    'العلامة التجارية',
    'تعمل الشركة على بناء علامتها التجارية كرمز للجودة والثقة.',
    'Apple\'s brand is built on design simplicity, innovation, and premium quality.',
    'noun','A strong brand creates loyalty, commands premium pricing, and differentiates from competitors.',
    ['trademark','identity','image','name','reputation'],
    ['unknown','generic','commodity'],
    '/brænd/', 1),

'marketing': E(
    'The process of identifying, anticipating, and satisfying customer needs profitably through strategic communication.',
    'التسويق',
    'تركّز استراتيجية التسويق على الوصول إلى الشريحة المستهدفة بأفضل الطرق.',
    'Effective marketing is not about selling what you make, but making what customers want to buy.',
    'noun','Encompasses the 4Ps: Product, Price, Place, Promotion.',
    ['promotion','advertising','branding','communications','market development'],
    ['sales reduction','anti-marketing'],
    '/ˈmɑːrkɪtɪŋ/', 1),

'market share': E(
    'The percentage of total sales in an industry generated by a particular company.',
    'حصة السوق',
    'رفعت الشركة حصتها السوقية من 15% إلى 22% خلال عامين.',
    'By capturing 35% market share, the company became the dominant player in the sector.',
    'noun','Gaining market share often requires competitive pricing, innovation, or aggressive marketing.',
    ['market portion','competitive position','share of wallet'],
    ['market loss','declining share'],
    '/ˈmɑːrkɪt ʃeər/', 2),

'segmentation': E(
    'The process of dividing a market into distinct groups of consumers with similar needs or characteristics.',
    'تقسيم السوق / الاستهداف التسويقي',
    'تعتمد الشركة على تقسيم السوق حسب العمر والدخل والاهتمامات.',
    'Market segmentation allows companies to tailor their products and messaging to specific audiences.',
    'noun','Types: demographic, geographic, psychographic, behavioral.',
    ['targeting','market division','audience segmentation'],
    ['mass marketing','undifferentiated strategy'],
    '/ˌseɡmənˈteɪʃən/', 3),

'positioning': E(
    'The strategy of placing a brand or product in a specific spot in the consumer\'s mind relative to competitors.',
    'التموضع التسويقي',
    'تتبنى الشركة استراتيجية تموضع راقية لتعزيز صورتها الفاخرة.',
    'Successful positioning communicates a clear and compelling value to the target customer.',
    'noun','Effective positioning answers: "Why should I choose you over competitors?"',
    ['brand positioning','market positioning','differentiation','value placement'],
    ['commoditization','confusion'],
    '/ˌpɒzɪʃəˈnɪŋ/', 3),

'value proposition': E(
    'A clear statement explaining how a product solves customer problems, delivers specific benefits, and why customers should buy it.',
    'القيمة المقترحة / عرض القيمة',
    'يُبيّن عرض القيمة للعميل لماذا يجب أن يختار منتجنا دون سواه.',
    'A compelling value proposition is the foundation of every successful marketing strategy.',
    'noun','Answers: What do you do? Who is it for? How is it different?',
    ['USP','unique selling point','customer promise','benefit statement'],
    ['generic offer','commodity','undifferentiated product'],
    '/ˈvæljuː ˌprɒpəˈzɪʃən/', 3),

'conversion rate': E(
    'The percentage of visitors or prospects who take a desired action, such as making a purchase.',
    'معدل التحويل',
    'ارتفع معدل التحويل من 2% إلى 5% بعد تحسين صفحة الهبوط.',
    'A/B testing doubled the website\'s conversion rate from 3% to 6%.',
    'noun','Key e-commerce KPI. Even small improvements have large revenue impact.',
    ['conversion','sales rate','success rate','close rate'],
    ['bounce rate','abandonment rate'],
    '/kənˈvɜːrʒən reɪt/', 3),

'campaign': E(
    'A coordinated series of marketing or advertising activities with a specific goal and timeline.',
    'الحملة التسويقية',
    'أطلقت الشركة حملة تسويقية متكاملة عبر جميع القنوات الرقمية.',
    'The product launch campaign generated 2 million impressions in its first week.',
    'noun','Campaigns have defined budgets, goals, audiences, and measurable outcomes.',
    ['advertising campaign','promotion','drive','initiative'],
    ['one-off activity','random ad'],
    '/kæmˈpeɪn/', 1),

'brand equity': E(
    'The commercial value derived from consumer perception of a brand, beyond its physical assets.',
    'قيمة العلامة التجارية',
    'قيمة العلامة التجارية لشركة آبل تتجاوز 500 مليار دولار وفق التقديرات.',
    'Strong brand equity allows companies to charge premium prices and resist competitive pressure.',
    'noun','Built through quality, consistency, advertising, and customer experience over time.',
    ['brand value','brand worth','brand strength'],
    ['brand damage','negative equity','brand erosion'],
    '/brænd ˈekwɪti/', 4),

'customer retention': E(
    'The ability of a company to keep its existing customers and prevent them from switching to competitors.',
    'الاحتفاظ بالعملاء',
    'تُولي الشركة اهتماماً بالغاً بالاحتفاظ بعملائها من خلال برامج الولاء.',
    'A 5% increase in customer retention can increase profits by 25 to 95 percent.',
    'noun','Far cheaper than acquiring new customers. Measured by retention and churn rates.',
    ['loyalty','customer loyalty','repeat business','engagement'],
    ['churn','customer loss','attrition'],
    '/ˈkʌstəmər rɪˈtenʃən/', 3),

'churn rate': E(
    'The percentage of customers who stop using a product or service over a given time period.',
    'معدل التسرب / فقدان العملاء',
    'ارتفع معدل تسرب العملاء إلى 8% بعد زيادة الأسعار.',
    'Reducing monthly churn rate from 5% to 3% would add millions in annual recurring revenue.',
    'noun','Critical metric for subscription businesses. High churn destroys business value.',
    ['attrition rate','customer loss rate','cancellation rate'],
    ['retention rate','loyalty rate'],
    '/tʃɜːrn reɪt/', 3),

'nps': E(
    'Net Promoter Score — a metric measuring customer loyalty based on how likely customers are to recommend a product.',
    'صافي نقاط الترويج / مؤشر رضا العملاء',
    'حقق المنتج الجديد مؤشر NPS بلغ 72، وهو مستوى ممتاز في الصناعة.',
    'Companies with an NPS above 70 are considered best-in-class for customer loyalty.',
    'noun','Scale: -100 to +100. Promoters (9-10) minus Detractors (0-6).',
    ['customer satisfaction score','loyalty index','referral likelihood'],
    ['negative NPS','low satisfaction'],
    '/ˌen.piːˈes/', 3),

// ══════════════════════════════ MANAGEMENT ═══════════════════════════════════

'strategy': E(
    'A long-term plan of action designed to achieve major goals and create sustainable competitive advantage.',
    'الاستراتيجية',
    'وضعت الإدارة العليا استراتيجية خمسية طموحة لتوسيع نطاق أعمالها.',
    'A clear strategy tells every employee what the company is trying to achieve and how.',
    'noun','Answers: Where do we want to go? How do we get there? What makes us different?',
    ['plan','approach','roadmap','direction','policy'],
    ['tactic','improvisation','reaction'],
    '/ˈstrætɪdʒi/', 2),

'leadership': E(
    'The ability to inspire, influence, and guide individuals or teams toward achieving a shared vision.',
    'القيادة',
    'تعتمد الشركة على نموذج قيادة يُعزز الابتكار ويُشجع المبادرة.',
    'Effective leadership creates a culture where people feel empowered to do their best work.',
    'noun','Distinguished from management: leaders set direction, managers execute it.',
    ['management','direction','guidance','influence','mentorship'],
    ['followership','passivity'],
    '/ˈliːdərʃɪp/', 1),

'kpi': E(
    'Key Performance Indicator — a measurable value demonstrating how effectively a company is achieving its key business objectives.',
    'مؤشر الأداء الرئيسي',
    'تقيس الشركة أداءها عبر مؤشرات KPI محددة لكل قسم.',
    'Monthly sales, customer satisfaction, and employee turnover are common KPIs for management.',
    'noun','Good KPIs are Specific, Measurable, Achievable, Relevant, Time-bound (SMART).',
    ['metric','performance measure','indicator','benchmark'],
    ['vanity metric','unmeasured goal'],
    '/ˌkeɪpiːˈaɪ/', 2),

'stakeholder': E(
    'Any individual, group, or organization that has an interest in or is affected by a company\'s activities.',
    'أصحاب المصلحة / المعنيون',
    'يشمل أصحاب المصلحة المساهمين والموظفين والعملاء والمجتمع المحيط.',
    'Companies must balance the sometimes competing interests of all stakeholders to ensure long-term success.',
    'noun','Primary stakeholders: shareholders, employees, customers. Secondary: regulators, communities.',
    ['interested party','shareholder','participant','constituency'],
    ['outsider','non-stakeholder'],
    '/ˈsteɪkˌhoʊldər/', 3),

'governance': E(
    'The framework of rules, practices, and processes by which a company is directed and controlled.',
    'الحوكمة / الإدارة الرشيدة',
    'تلتزم الشركة بمعايير الحوكمة الدولية لضمان الشفافية والمساءلة.',
    'Strong corporate governance reassures investors and reduces the risk of fraud or mismanagement.',
    'noun','Includes board oversight, audit committees, executive compensation, and disclosure.',
    ['oversight','control','management','regulation'],
    ['mismanagement','fraud','negligence'],
    '/ˈɡʌvərnəns/', 4),

'delegation': E(
    'The process of assigning tasks, authority, and responsibility to subordinates or team members.',
    'التفويض',
    'يُتقن القائد الفعّال فن التفويض لتعزيز إنتاجية الفريق.',
    'Effective delegation frees leaders to focus on high-value strategic tasks.',
    'noun','Delegation requires clarity, trust, and appropriate monitoring.',
    ['assignment','empowerment','distribution','transfer of authority'],
    ['micromanagement','centralization'],
    '/ˌdelɪˈɡeɪʃən/', 3),

'innovation': E(
    'The process of creating new or significantly improved products, services, or processes that deliver value.',
    'الابتكار',
    'الابتكار المستمر هو ما يُبقي الشركات في مقدمة المنافسة.',
    'The company invested 15% of revenue in R&D, fueling a culture of continuous innovation.',
    'noun','Incremental innovation improves existing things; disruptive innovation creates new markets.',
    ['creativity','invention','transformation','disruption','new idea'],
    ['stagnation','tradition','imitation'],
    '/ˌɪnəˈveɪʃən/', 2),

'accountability': E(
    'The obligation of individuals or organizations to accept responsibility for their actions and outcomes.',
    'المساءلة / المسؤولية',
    'تُرسّخ ثقافة المساءلة الشفافية وتعزز الثقة في المنظمة.',
    'A culture of accountability ensures that every team member takes ownership of their results.',
    'noun','Accountability is not blame — it is the commitment to delivering on promises.',
    ['responsibility','ownership','answerability','obligation'],
    ['irresponsibility','blame-shifting','avoidance'],
    '/əˌkaʊntəˈbɪlɪti/', 3),

'agile': E(
    'An iterative approach to project management and development that emphasizes flexibility, collaboration, and rapid delivery.',
    'المرن / منهجية أجايل',
    'تعتمد شركات التقنية منهجية Agile لتسريع تطوير المنتجات.',
    'Agile development allows teams to respond to changing requirements without restarting from scratch.',
    'adj/noun','Core values: individuals over processes, working software over documentation, collaboration over contracts.',
    ['flexible','adaptive','iterative','lean','scrum'],
    ['waterfall','rigid','sequential'],
    '/ˈædʒaɪl/', 3),

'compliance': E(
    'Adherence to laws, regulations, standards, and internal policies governing business operations.',
    'الامتثال',
    'تخضع المؤسسات المالية لمعايير امتثال صارمة تُنظّم عملياتها.',
    'Failure to maintain compliance with data protection laws can result in substantial fines.',
    'noun','Compliance reduces legal risk and builds trust with regulators and customers.',
    ['conformity','adherence','observance','regulatory compliance'],
    ['violation','non-compliance','breach'],
    '/kəmˈplaɪəns/', 3),

'risk management': E(
    'The process of identifying, assessing, and mitigating threats to an organization\'s operations and objectives.',
    'إدارة المخاطر',
    'تُطبّق الشركة إطار إدارة مخاطر شاملاً للتعامل مع التهديدات المحتملة.',
    'Effective risk management is not about avoiding all risk but about taking the right risks knowingly.',
    'noun','Involves risk identification, probability assessment, impact analysis, and mitigation plans.',
    ['risk mitigation','risk control','hedging','contingency planning'],
    ['risk ignorance','recklessness'],
    '/rɪsk ˈmænɪdʒmənt/', 3),

'okr': E(
    'Objectives and Key Results — a goal-setting framework that defines measurable outcomes tied to ambitious objectives.',
    'الأهداف والنتائج الرئيسية',
    'تستخدم شركات كجوجل وإنتل نظام OKR لمحاذاة أهداف الموظفين مع الرؤية المؤسسية.',
    'OKRs align individual effort with company strategy by making goals transparent and measurable.',
    'noun','Objectives = qualitative direction. Key Results = quantitative milestones.',
    ['goal framework','objective setting','strategic goals'],
    ['vague goals','unmeasured targets'],
    '/ˌoʊkeɪˈɑːr/', 3),

'scalability': E(
    'The capacity of a business or system to grow and handle increased demand without proportional increases in cost.',
    'قابلية التوسع',
    'يتميز نموذج الأعمال القائم على البرمجيات بقابلية توسع عالية.',
    'Cloud computing has made it easier for startups to build highly scalable platforms.',
    'noun','Highly scalable businesses can grow revenue faster than costs — the key to exponential growth.',
    ['growth capacity','expandability','flexibility'],
    ['bottleneck','rigidity','capacity constraint'],
    '/ˌskeɪləˈbɪlɪti/', 3),

// ═══════════════════════════════════ HR ══════════════════════════════════════

'recruitment': E(
    'The process of finding, attracting, and selecting qualified candidates to fill job vacancies.',
    'التوظيف / الاستقطاب',
    'تعتمد الشركة على منصات التوظيف الرقمية لاستقطاب أفضل المواهب.',
    'Strategic recruitment focuses on finding candidates who fit both the role and the company culture.',
    'noun','Modern recruitment uses data analytics, employer branding, and social media.',
    ['hiring','talent acquisition','staffing','headhunting','sourcing'],
    ['layoffs','downsizing','redundancy'],
    '/rɪˈkruːtmənt/', 2),

'onboarding': E(
    'The process of integrating a new employee into an organization and its culture.',
    'الاستيعاب الوظيفي / تأهيل الموظفين الجدد',
    'يشمل برنامج الاستيعاب الوظيفي التدريب والتعريف بالثقافة المؤسسية.',
    'A structured 90-day onboarding program significantly improves new hire retention.',
    'noun','Effective onboarding reduces time-to-productivity and improves long-term retention.',
    ['orientation','induction','integration','initiation'],
    ['offboarding','exit'],
    '/ˈɒnˌbɔːrdɪŋ/', 2),

'talent': E(
    'The skills, abilities, and potential of individuals that make them valuable to an organization.',
    'الكفاءات / المواهب',
    'تنافس الشركات العالمية على استقطاب أفضل الكفاءات في السوق.',
    'Companies that invest in developing talent outperform their competitors in the long run.',
    'noun','Talent management covers acquisition, development, retention, and succession planning.',
    ['skill','ability','competency','potential','aptitude'],
    ['mediocrity','incompetence'],
    '/ˈtælənt/', 1),

'performance review': E(
    'A formal assessment of an employee\'s work performance, achievements, and development needs over a period.',
    'تقييم الأداء الوظيفي',
    'يخضع الموظفون لتقييم أداء سنوي يُحدد مكافآتهم وخطط تطويرهم.',
    'Regular performance reviews help align individual goals with organizational objectives.',
    'noun','Modern approaches use continuous feedback rather than annual reviews only.',
    ['appraisal','evaluation','assessment','performance appraisal'],
    ['no feedback','neglect'],
    '/pərˈfɔːrməns rɪˈvjuː/', 2),

'compensation': E(
    'The total monetary and non-monetary rewards provided to employees in exchange for their work.',
    'التعويض / الراتب والمزايا',
    'تُقدم الشركة حزمة تعويضات تنافسية تشمل الراتب والمكافآت والمزايا.',
    'Competitive compensation packages are essential for attracting and retaining top talent.',
    'noun','Includes salary, bonuses, benefits, equity, and non-financial rewards.',
    ['remuneration','pay','salary','benefits package','reward'],
    ['deduction','penalty'],
    '/ˌkɒmpənˈseɪʃən/', 2),

'turnover': E(
    'The rate at which employees leave an organization and are replaced over a given period.',
    'دوران الموظفين / معدل المغادرة',
    'يُكلف ارتفاع معدل دوران الموظفين الشركات مبالغ طائلة في التوظيف والتدريب.',
    'High employee turnover is often a symptom of poor management, low pay, or toxic culture.',
    'noun','Also means total revenue in British English. Context determines meaning.',
    ['attrition','churn','staff turnover','employee loss'],
    ['retention','stability','loyalty'],
    '/ˈtɜːrnˌoʊvər/', 2),

'diversity': E(
    'The inclusion of individuals with different backgrounds, perspectives, identities, and experiences in the workplace.',
    'التنوع',
    'تؤمن الشركة بأن التنوع في فريق العمل يُعزز الإبداع والابتكار.',
    'Research consistently shows that diverse teams make better decisions than homogeneous ones.',
    'noun','Encompasses gender, ethnicity, age, disability, sexual orientation, and more.',
    ['inclusion','variety','multiculturalism','representation'],
    ['homogeneity','uniformity','exclusion'],
    '/daɪˈvɜːrsɪti/', 2),

'engagement': E(
    'The level of emotional commitment and motivation employees have toward their organization and its goals.',
    'الالتزام الوظيفي / الانخراط',
    'ترتبط نسبة التفاعل الوظيفي ارتباطاً وثيقاً بالإنتاجية والاحتفاظ بالموظفين.',
    'Companies with high employee engagement outperform competitors by 202%.',
    'noun','Engaged employees go beyond job requirements and drive business results.',
    ['commitment','motivation','dedication','involvement'],
    ['disengagement','apathy','burnout'],
    '/ɪnˈɡeɪdʒmənt/', 2),

// ════════════════════════════════ OPERATIONS ═════════════════════════════════

'supply chain': E(
    'The network of organizations, resources, activities, and technologies involved in creating and distributing a product.',
    'سلسلة الإمداد / التوريد',
    'تُدير الشركة سلسلة إمداد عالمية تمتد عبر 30 دولة.',
    'Supply chain disruptions during the pandemic exposed vulnerabilities in global manufacturing.',
    'noun','Encompasses suppliers, manufacturers, distributors, retailers, and customers.',
    ['logistics network','value chain','distribution network','procurement chain'],
    ['isolated production','direct sales'],
    '/səˈplaɪ tʃeɪn/', 2),

'logistics': E(
    'The detailed planning and execution of the transportation, storage, and delivery of goods.',
    'الخدمات اللوجستية',
    'تعتمد الشركة على شبكة لوجستية متطورة لضمان التسليم في الوقت المحدد.',
    'Efficient logistics can reduce delivery times by 40% while cutting transportation costs.',
    'noun','Modern logistics relies on real-time tracking, automation, and predictive analytics.',
    ['transportation','distribution','delivery','freight','shipping'],
    ['stockpiling','delay'],
    '/ləˈdʒɪstɪks/', 2),

'procurement': E(
    'The process of obtaining goods, services, or works from external sources, typically through purchasing.',
    'المشتريات / التوريد',
    'يتولى قسم المشتريات التفاوض مع الموردين لتأمين أفضل الأسعار.',
    'Strategic procurement focuses on building long-term supplier relationships, not just finding the lowest price.',
    'noun','Strategic procurement builds competitive advantage through supplier selection and management.',
    ['purchasing','sourcing','buying','acquisition'],
    ['production','manufacturing','in-house'],
    '/prəˈkjʊərmənt/', 3),

'outsourcing': E(
    'Contracting specific business functions or processes to an external party rather than performing them in-house.',
    'الاستعانة بمصادر خارجية / الإسناد',
    'لجأت الشركة إلى الاستعانة بمصادر خارجية لتشغيل مركز الاتصالات.',
    'Outsourcing non-core activities allows companies to focus on their competitive strengths.',
    'noun','Reduces costs and increases flexibility, but requires careful vendor management.',
    ['subcontracting','contracting out','offshoring','third-party'],
    ['insourcing','in-house','vertical integration'],
    '/ˈaʊtsɔːrsɪŋ/', 2),

'inventory': E(
    'The goods, materials, and products a company holds for sale or for use in production.',
    'المخزون / المخزن',
    'تُبقي الشركة على مستوى مخزون أمثل لتجنب النقص أو الفائض.',
    'Excess inventory ties up capital and increases storage costs, reducing overall profitability.',
    'noun','Too little: lost sales. Too much: tied-up capital. Optimal inventory is a competitive advantage.',
    ['stock','goods','merchandise','supplies','warehouse stock'],
    ['backorder','shortage','stockout'],
    '/ˈɪnvəntri/', 2),

'kpi (operational)': E(
    'A measurable indicator that tracks the effectiveness of operational activities against defined targets.',
    'مؤشر الأداء التشغيلي',
    'تتابع الإدارة مؤشرات الأداء يومياً لضمان تحقيق الأهداف التشغيلية.',
    'Common operational KPIs include on-time delivery rate, defect rate, and cost per unit.',
    'noun','Operational KPIs translate strategic goals into actionable day-to-day metrics.',
    ['metric','benchmark','performance indicator','target'],
    ['vague goal','unmeasured activity'],
    '/ˌkeɪpiːˈaɪ/', 2),

'sla': E(
    'Service Level Agreement — a contract defining the expected level of service between a provider and a client.',
    'اتفاقية مستوى الخدمة',
    'تُلزم اتفاقية مستوى الخدمة الشركة بالاستجابة لطلبات العملاء خلال 24 ساعة.',
    'An SLA with 99.9% uptime guarantees means no more than 8.7 hours of downtime per year.',
    'noun','SLAs define deliverables, timeframes, quality standards, and penalties for non-compliance.',
    ['service contract','service agreement','performance contract'],
    ['informal arrangement','verbal agreement'],
    '/ˌes.el.ˈeɪ/', 3),

// ═══════════════════════════════ ECONOMICS ═══════════════════════════════════

'supply and demand': E(
    'The economic model describing how the price and quantity of a good are determined by buyers and sellers in a market.',
    'العرض والطلب',
    'يحكم قانون العرض والطلب تحديد الأسعار في الأسواق التنافسية.',
    'When demand exceeds supply, prices rise until equilibrium is restored.',
    'noun','Foundation of market economics. Higher demand + lower supply = higher prices.',
    ['market forces','price mechanism','equilibrium'],
    ['fixed pricing','planned economy'],
    '/səˈplaɪ ænd dɪˈmɑːnd/', 1),

'gdp': E(
    'Gross Domestic Product — the total monetary value of all goods and services produced within a country in a given period.',
    'الناتج المحلي الإجمالي',
    'نمت الناتج المحلي الإجمالي بنسبة 3.2% في الربع الأول مقارنة بالعام الماضي.',
    'GDP growth is the primary indicator of an economy\'s health and expansion rate.',
    'noun','GDP per capita is used to compare living standards across countries.',
    ['national output','economic output','national income'],
    ['recession','GDP contraction'],
    '/ˌdʒiːdiːˈpiː/', 2),

'recession': E(
    'A significant, widespread, prolonged decline in economic activity, typically defined as two consecutive quarters of negative GDP growth.',
    'الركود الاقتصادي',
    'دفع الركود الاقتصادي الحكومة إلى اتخاذ تدابير تحفيزية عاجلة.',
    'During the recession, unemployment rose sharply as companies cut costs and froze hiring.',
    'noun','Characterized by falling GDP, rising unemployment, declining investment.',
    ['downturn','slump','contraction','economic decline'],
    ['expansion','boom','growth','recovery'],
    '/rɪˈseʃən/', 2),

'monopoly': E(
    'A market structure where a single company controls the entire supply of a product or service.',
    'الاحتكار',
    'تمارس السلطات الرقابية دوراً محورياً في منع الاحتكار وحماية المنافسة.',
    'Monopolies can charge higher prices and reduce innovation due to lack of competitive pressure.',
    'noun','Natural monopolies (utilities) can be efficient. Anti-competitive monopolies harm consumers.',
    ['market dominance','sole supplier','price-maker'],
    ['competition','oligopoly','free market'],
    '/məˈnɒpəli/', 3),

'opportunity cost': E(
    'The value of the next best alternative foregone when making a decision.',
    'تكلفة الفرصة البديلة',
    'تكلفة الفرصة البديلة لاختيار الدراسة بدلاً من العمل هي الراتب المفقود.',
    'The opportunity cost of holding cash is the return you could have earned by investing it.',
    'noun','Critical concept in economics and decision-making. Invisible but always present.',
    ['foregone alternative','implicit cost','tradeoff'],
    ['sunk cost','fixed cost'],
    '/ˌɒpəˈtjuːnɪti kɒst/', 3),

'economies of scale': E(
    'The cost advantage that arises when a company increases its output and the cost per unit decreases.',
    'وفورات الحجم',
    'تُتيح وفورات الحجم للشركات الكبيرة تقديم منتجاتها بأسعار أقل.',
    'Amazon achieves massive economies of scale in logistics, reducing delivery costs per package.',
    'noun','One of the core advantages of large businesses over small competitors.',
    ['scale advantage','volume discount','bulk efficiency','size benefit'],
    ['diseconomies of scale','inefficiency at scale'],
    '/ɪˈkɒnəmiz əv skeɪl/', 3),

'fiscal policy': E(
    'Government decisions regarding taxation and spending to influence macroeconomic conditions.',
    'السياسة المالية',
    'تُعدل الحكومة سياستها المالية استجابةً للظروف الاقتصادية المتغيرة.',
    'Expansionary fiscal policy during a recession uses government spending to stimulate growth.',
    'noun','Two tools: government spending and taxation. Managed by finance ministries.',
    ['government policy','taxation policy','public spending','budget policy'],
    ['monetary policy','private sector'],
    '/ˈfɪskəl ˈpɒlɪsi/', 4),

// ════════════════════════════ ENTREPRENEURSHIP ════════════════════════════════

'entrepreneur': E(
    'An individual who creates and runs a new business, taking on financial risks in pursuit of profit and innovation.',
    'رائد الأعمال / المقاول',
    'يتحلى رواد الأعمال الناجحون بالرؤية والإصرار وتقبل المخاطر.',
    'Successful entrepreneurs identify problems, build solutions, and create value for customers.',
    'noun','From French: one who "undertakes" — a creator, innovator, and risk-taker.',
    ['founder','innovator','startup founder','business creator','visionary'],
    ['employee','follower','risk-avoider'],
    '/ˌɒntrəprəˈnɜːr/', 2),

'startup': E(
    'A newly established company designed to scale rapidly using technology or an innovative business model.',
    'الشركة الناشئة',
    'تسعى الشركات الناشئة إلى النمو السريع وتحقيق الريادة في أسواقها.',
    'Most startups fail in the first year, but those that survive often disrupt entire industries.',
    'noun','Startups prioritize growth over short-term profit. They seek product-market fit first.',
    ['new venture','new company','emerging company'],
    ['established company','corporation','legacy business'],
    '/ˈstɑːrtʌp/', 1),

'venture capital': E(
    'Private financing provided to early-stage companies with high growth potential in exchange for equity.',
    'رأس المال المغامر',
    'حصل المشروع على تمويل من رأس المال المغامر بقيمة 5 ملايين دولار.',
    'Venture capital firms provide not just funding but also mentorship, networks, and strategic guidance.',
    'noun','VC investors expect high returns (10-100x) from a small percentage of portfolio companies.',
    ['VC','risk capital','equity investment','growth capital'],
    ['debt financing','bootstrapping','self-funding'],
    '/ˈventʃər ˈkæpɪtl/', 3),

'mvp': E(
    'Minimum Viable Product — a version of a product with just enough features to validate a business idea with early users.',
    'المنتج الأدنى قابلية للتطبيق',
    'أطلقت الشركة النسخة الأولى البسيطة من منتجها للحصول على تغذية راجعة حقيقية.',
    'Building an MVP first allows startups to test assumptions before investing in full development.',
    'noun','Core lean startup concept: test early, learn fast, iterate based on real feedback.',
    ['prototype','proof of concept','pilot','first version'],
    ['final product','over-engineered product'],
    '/ˌem.viːˈpiː/', 3),

'pivot': E(
    'A fundamental change in a startup\'s business model, product, or strategy based on market feedback.',
    'التحول الاستراتيجي',
    'بعد إدراك أن منتجها الأصلي لم يُحقق قبولاً، أجرت الشركة تحولاً استراتيجياً جذرياً.',
    'Instagram started as a check-in app called Burbn before pivoting to photo sharing.',
    'verb/noun','Pivots are not failures — they are intelligent responses to real-world learning.',
    ['change direction','strategic shift','course correction','transformation'],
    ['stay the course','persevere with original idea'],
    '/ˈpɪvət/', 3),

'burn rate': E(
    'The rate at which a startup spends its cash reserves, typically expressed as a monthly figure.',
    'معدل الاحتراق النقدي',
    'يُنفق المشروع الناشئ 100 ألف دولار شهرياً، مما يمنحه 10 أشهر من الاحتياطيات.',
    'Reducing burn rate extends runway and gives the startup more time to achieve profitability.',
    'noun','Burn rate determines "runway" — how long until the company runs out of cash.',
    ['cash burn','spending rate','monthly expenses'],
    ['profitability','positive cash flow'],
    '/bɜːrn reɪt/', 3),

'unicorn': E(
    'A privately held startup company valued at $1 billion or more.',
    'الشركة الوحيدة القرن / الشركة العملاقة',
    'وصلت الشركة الناشئة إلى مرتبة "اليونيكورن" بعد جولة تمويل ضخمة.',
    'Airbnb, Uber, and SpaceX were once unicorns before their IPOs transformed them into public companies.',
    'noun','Term coined by Aileen Lee in 2013. "Decacorn" = $10B+. "Hectocorn" = $100B+.',
    ['billion-dollar startup','highly valued startup'],
    ['failed startup','bootstrapped company'],
    '/ˈjuːnɪkɔːrn/', 3),

'product-market fit': E(
    'The degree to which a product satisfies strong market demand — a critical milestone for any startup.',
    'الملاءمة بين المنتج والسوق',
    'يسعى كل مشروع ناشئ إلى إيجاد الملاءمة المثلى بين منتجه واحتياجات السوق.',
    'Marc Andreessen defined product-market fit as "being in a good market with a product that can satisfy that market."',
    'noun','Signs of PMF: customers keep using, refer others, are disappointed if product disappears.',
    ['market validation','customer fit','demand alignment'],
    ['product failure','no demand','wrong market'],
    '/ˈprɒdʌkt ˈmɑːrkɪt fɪt/', 4),

// ══════════════════════════ DIGITAL TRANSFORMATION ════════════════════════════

'digital transformation': E(
    'The integration of digital technology into all areas of a business, fundamentally changing how it operates and delivers value.',
    'التحول الرقمي',
    'تمرّ معظم المؤسسات التقليدية حالياً بمرحلة تحول رقمي شامل.',
    'Digital transformation is not just about technology — it\'s a cultural change that requires continuous innovation.',
    'noun','Impacts customer experience, operations, business models, and organizational culture.',
    ['digitization','digital change','technology adoption','modernization'],
    ['legacy systems','analog processes'],
    '/ˈdɪdʒɪtl trænsˌfɔːrˈmeɪʃən/', 2),

'saas': E(
    'Software as a Service — a cloud-based software distribution model where applications are hosted and delivered over the internet.',
    'البرمجيات كخدمة',
    'تُقدم شركة Salesforce منتجاتها عبر نموذج SaaS القائم على الاشتراك السنوي.',
    'SaaS companies benefit from recurring revenue, which creates predictable and scalable income.',
    'noun','Eliminates need for local installation. Accessed via browser. Billed by subscription.',
    ['cloud software','subscription software','web application'],
    ['on-premise software','licensed software'],
    '/sæs/', 3),

'automation': E(
    'The use of technology to perform tasks with reduced human intervention, increasing efficiency and consistency.',
    'الأتمتة',
    'أدت أتمتة خط الإنتاج إلى خفض التكاليف بنسبة 30% وتحسين الجودة.',
    'Automation of repetitive tasks allows employees to focus on creative and strategic work.',
    'noun','Ranges from simple macros to AI-driven robotic process automation (RPA).',
    ['mechanization','robotics','AI automation','process automation'],
    ['manual process','human-operated'],
    '/ˌɔːtəˈmeɪʃən/', 2),

'cloud computing': E(
    'The delivery of computing services including servers, storage, databases, networking, and analytics over the internet.',
    'الحوسبة السحابية',
    'انتقلت معظم الشركات إلى الحوسبة السحابية لخفض تكاليف البنية التحتية.',
    'Cloud computing allows startups to access enterprise-grade infrastructure at a fraction of the cost.',
    'noun','Three models: IaaS (infrastructure), PaaS (platform), SaaS (software).',
    ['cloud services','cloud infrastructure','cloud platform'],
    ['on-premise','local server','data center'],
    '/klaʊd kəmˈpjuːtɪŋ/', 2),

'data analytics': E(
    'The science of analyzing raw data to discover patterns, draw conclusions, and support business decision-making.',
    'تحليل البيانات',
    'تعتمد الشركة على تحليل البيانات لفهم سلوك العملاء وتحسين تجربتهم.',
    'Companies that use data analytics to guide decisions outperform competitors by 23 times.',
    'noun','Descriptive (what happened), diagnostic (why), predictive (what will happen), prescriptive (what to do).',
    ['big data','business intelligence','data science','analytics'],
    ['guesswork','intuition only','data ignorance'],
    '/ˈdeɪtə ˌænəˈlɪtɪks/', 3),

'ai': E(
    'Artificial Intelligence — the simulation of human intelligence by machines, enabling tasks like learning, reasoning, and problem-solving.',
    'الذكاء الاصطناعي',
    'يُعيد الذكاء الاصطناعي تشكيل معظم الصناعات من خلال أتمتة المهام المعقدة.',
    'AI is not replacing humans — it is amplifying human capabilities in ways never before possible.',
    'noun','Includes machine learning, deep learning, NLP, computer vision, and robotic systems.',
    ['machine learning','artificial intelligence','cognitive computing','smart systems'],
    ['human intelligence','manual process'],
    '/ˌeɪˈaɪ/', 1),

'cybersecurity': E(
    'The practice of protecting systems, networks, and data from digital attacks, theft, and damage.',
    'الأمن السيبراني',
    'تُشكل الهجمات الإلكترونية خطراً متزايداً يستوجب استثماراً جاداً في الأمن السيبراني.',
    'A single cybersecurity breach can cost a company millions and permanently damage its reputation.',
    'noun','Key areas: network security, endpoint protection, data encryption, identity management.',
    ['information security','IT security','data protection','cyber defense'],
    ['vulnerability','exposure','data breach'],
    '/ˌsaɪbərsɪˈkjʊərɪti/', 3),

'disruption': E(
    'A radical change that fundamentally transforms an industry, market, or technology.',
    'الاضطراب / الابتكار التخريبي',
    'أحدثت شركة Uber اضطراباً جذرياً في قطاع النقل التقليدي.',
    'Disruptive innovation starts at the bottom of a market and then moves upmarket, displacing established leaders.',
    'noun','Clayton Christensen\'s theory: disruptors start with simpler, cheaper alternatives.',
    ['transformation','innovation','upheaval','revolution'],
    ['stability','incremental change'],
    '/dɪsˈrʌpʃən/', 3),

// ════════════════════════════ ADDITIONAL CORE TERMS ══════════════════════════

'negotiation': E(
    'A strategic discussion between parties to reach a mutually acceptable agreement.',
    'التفاوض',
    'يتطلب التفاوض الفعال مهارات الإقناع والاستماع وفهم احتياجات الطرف الآخر.',
    'Skilled negotiators focus on interests, not positions, to find creative solutions that benefit all parties.',
    'noun','BATNA (Best Alternative to a Negotiated Agreement) is key to negotiation power.',
    ['bargaining','deal-making','compromise','discussion'],
    ['ultimatum','non-negotiable','dictation'],
    '/nɪˌɡoʊʃiˈeɪʃən/', 2),

'corporate culture': E(
    'The shared values, beliefs, behaviors, and practices that characterize an organization.',
    'الثقافة المؤسسية',
    'تؤثر الثقافة المؤسسية تأثيراً بالغاً على التوظيف والإنتاجية والابتكار.',
    'As Peter Drucker famously said: "Culture eats strategy for breakfast."',
    'noun','Culture is invisible but powerful — it determines how people behave when no one is watching.',
    ['company culture','organizational culture','work culture'],
    ['toxic culture','dysfunctional culture'],
    '/ˈkɔːrpərɪt ˈkʌltʃər/', 3),

'competitive advantage': E(
    'A unique quality or capability that allows a company to outperform its rivals and generate superior value.',
    'الميزة التنافسية',
    'تتمثل الميزة التنافسية للشركة في براءات الاختراع وسمعتها القوية.',
    'A sustainable competitive advantage is one that competitors cannot easily replicate or imitate.',
    'noun','Michael Porter identified three types: cost leadership, differentiation, focus.',
    ['edge','USP','differentiation','strength','moat'],
    ['competitive weakness','parity','commoditization'],
    '/kəmˈpetɪtɪv ədˈvɑːntɪdʒ/', 3),

'stakeholder management': E(
    'The process of identifying, analyzing, and strategically engaging with parties who can affect or be affected by an initiative.',
    'إدارة أصحاب المصلحة',
    'تتضمن إدارة أصحاب المصلحة التواصل الفعّال ومراعاة مختلف التوقعات.',
    'Projects fail more often due to poor stakeholder management than technical issues.',
    'noun','Maps stakeholders by influence and interest to prioritize engagement strategy.',
    ['stakeholder engagement','relationship management','communication'],
    ['stakeholder neglect','isolation'],
    '/ˈsteɪkˌhoʊldər ˈmænɪdʒmənt/', 4),

'due diligence': E(
    'A comprehensive appraisal of a business or individual prior to signing a contract or making an investment.',
    'العناية الواجبة / التدقيق المسبق',
    'أجرت الشركة عناية واجبة شاملة قبل الشروع في عملية الاستحواذ.',
    'Due diligence uncovered significant financial discrepancies that changed the acquisition terms.',
    'noun','Covers financial, legal, technical, commercial, and operational aspects.',
    ['investigation','review','assessment','verification'],
    ['blind trust','ignorance','assumption'],
    '/djuː ˈdɪlɪdʒəns/', 4),

'benchmark': E(
    'A standard or reference point against which performance, quality, or achievement is measured.',
    'المعيار المرجعي / قياس الأداء',
    'يُقارن الفريق أداءه بالمعايير المرجعية لأفضل الشركات في الصناعة.',
    'Benchmarking against industry leaders reveals performance gaps and improvement opportunities.',
    'noun','Internal benchmarks measure against past performance; external against competitors.',
    ['standard','reference','target','comparison point','yardstick'],
    ['random target','no comparison'],
    '/ˈbentʃmɑːrk/', 2),

'business model': E(
    'The plan implemented by a company to generate revenue and make a profit from its operations.',
    'نموذج الأعمال',
    'نجاح أمازون يعكس قدرتها على تطوير نموذج أعمال متطور ومتعدد التدفقات.',
    'A great business model creates value for customers, captures value for the company, and is difficult to copy.',
    'noun','Key elements: value proposition, customer segments, revenue streams, cost structure.',
    ['business plan','revenue model','operating model','go-to-market'],
    ['no model','unclear revenue'],
    '/ˈbɪznɪs ˈmɒdl/', 2),

'roi (marketing)': E(
    'Marketing ROI measures the return generated from marketing investments relative to their cost.',
    'العائد على الاستثمار التسويقي',
    'حقق كل دولار يُنفق على الحملة التسويقية عائداً قدره خمسة دولارات.',
    'Measuring marketing ROI helps allocate budgets to the highest-performing channels.',
    'noun','Formula: (Revenue from marketing − Marketing cost) / Marketing cost × 100.',
    ['marketing efficiency','campaign ROI','advertising return'],
    ['wasted spend','zero ROI'],
    '/ˌɑːrˌoʊˈaɪ/', 3),

'networking': E(
    'The process of interacting with others to exchange information and develop professional relationships.',
    'التواصل المهني',
    'يُعدّ التواصل المهني أحد أهم المهارات لبناء مسيرة مهنية ناجحة.',
    'Effective professional networking is about giving value first, not just seeking opportunities.',
    'noun','80% of jobs are filled through networking — it is the hidden job market.',
    ['relationship building','professional connections','industry contacts'],
    ['isolation','working alone'],
    '/ˈnetwɜːrkɪŋ/', 1),

'pitch': E(
    'A brief, persuasive presentation to potential investors, clients, or partners to gain their support.',
    'العرض التقديمي / العرض الترويجي',
    'قدّم المؤسس عرضاً مقنعاً لمدة خمس دقائق أمام لجنة المستثمرين.',
    'A great pitch tells a compelling story, demonstrates market understanding, and shows a clear path to growth.',
    'noun','Elevator pitch: 30-60 second. Investor pitch: 10-15 minutes. Demo day: varies.',
    ['presentation','proposal','sales pitch','deck'],
    ['written report','passive communication'],
    '/pɪtʃ/', 2),

'b2b': E(
    'Business-to-Business — a commercial model where transactions occur between companies rather than between companies and consumers.',
    'الأعمال التجارية بين الشركات',
    'تتخصص الشركة في تقديم حلول B2B للمؤسسات المالية الكبرى.',
    'B2B sales cycles are longer but deal sizes are larger compared to B2C models.',
    'noun','B2B buyers are rational and ROI-focused; relationships and trust are crucial.',
    ['enterprise sales','corporate sales','commercial trade'],
    ['B2C','direct to consumer','retail'],
    '/ˌbiːtəˈbiː/', 2),

'b2c': E(
    'Business-to-Consumer — a model where companies sell products or services directly to individual customers.',
    'الأعمال التجارية من الشركات إلى المستهلكين',
    'تعتمد شركات التجزئة الكبرى على نموذج B2C في تسويق منتجاتها.',
    'B2C marketing must create emotional connections and respond to short attention spans.',
    'noun','Higher volume, lower unit value, shorter sales cycle vs B2B.',
    ['direct to consumer','retail','consumer sales'],
    ['B2B','enterprise','wholesale'],
    '/ˌbiːtəˈsiː/', 2),

'roi (financial)': E(
    'Return on Investment — measures profitability of an investment relative to its cost.',
    'العائد على الاستثمار المالي',
    'يُستخدم معيار العائد على الاستثمار لمقارنة بدائل الاستثمار المختلفة.',
    'A 15% ROI per year compares favorably to the 10% historical average of the stock market.',
    'noun','Simple formula: (Net Profit / Investment Cost) × 100.',
    ['return','yield','profit rate','investment return'],
    ['loss','negative ROI'],
    '/ˌɑːrˌoʊˈaɪ/', 2),

'executive': E(
    'A senior manager in an organization responsible for making major decisions and overseeing operations.',
    'المدير التنفيذي / القيادي',
    'اجتمع كبار المديرين التنفيذيين لمناقشة الاستراتيجية طويلة المدى.',
    'Executives set direction, allocate resources, and are accountable for organizational performance.',
    'noun','C-Suite: CEO (Chief Executive), CFO (Financial), COO (Operations), CTO (Technology).',
    ['senior manager','director','officer','C-suite','leader'],
    ['entry-level','junior staff'],
    '/ɪɡˈzekjʊtɪv/', 2),

'profitability': E(
    'The degree to which a business generates profit relative to its revenues or assets.',
    'الربحية',
    'تعكس نسبة الربحية المرتفعة كفاءة الشركة في إدارة تكاليفها.',
    'Sustainable profitability requires both revenue growth and disciplined cost management.',
    'noun','Measured by margins: gross, operating, and net profit margins.',
    ['profit generating','financial success','earnings capacity'],
    ['unprofitability','loss-making','deficit'],
    '/ˌprɒfɪtəˈbɪlɪti/', 2),

}; // end of _BELC_DICT

// ─────────────────────────────────────────────────────────────────────────────
// AI Fallback: generate definition when word not in dictionary
// Uses backend Claude API; caches result in localStorage
// ─────────────────────────────────────────────────────────────────────────────
window._belcDictLookup = function(word) {
    var w = (word || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
    if (!w) return null;

    // 1. Check primary BELC dictionary
    if (window._BELC_DICT && window._BELC_DICT[w]) return window._BELC_DICT[w];

    // 2. Check legacy dictionary (aus_09_english.js _engDict)
    if (typeof _engDict !== 'undefined' && _engDict[w]) {
        var e = _engDict[w];
        return { en: e.en, ar: e.ar, ar_ex: '', ex: e.ex || '',
            pos: e.pos || 'noun', ctx: e.ctx || '',
            syn: [], ant: [], phonetic: '', difficulty: 3 };
    }

    // 3. Check localStorage cache (AI-generated definitions)
    try {
        var cached = localStorage.getItem('belc.dict.' + w);
        if (cached) return JSON.parse(cached);
    } catch(e2) {}

    return null;
};

// AI-generate definition for unknown word (async, calls backend)
window._belcDictGenerate = function(word, callback) {
    var w = (word || '').toLowerCase().trim();
    if (!w) return;

    var prompt = 'Define this business English term for a university student. Reply ONLY as JSON (no markdown):\n{"en":"definition in 1-2 sentences","ar":"المعنى بالعربية","ar_ex":"مثال بالعربية","ex":"English example sentence","pos":"noun|verb|adj","ctx":"business context 1 sentence","syn":["word1","word2"],"ant":["word1"],"phonetic":"/fəˈnetɪk/","difficulty":3}\n\nWord: "' + w + '"';

    fetch('http://localhost:8002/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [] }),
        signal: AbortSignal.timeout(15000)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
        var raw = (data.text || data.response || data.content || '').trim();
        var json;
        try { var m = raw.match(/\{[\s\S]*\}/); json = JSON.parse(m ? m[0] : raw); } catch(e) { return; }
        if (json && json.en) {
            try { localStorage.setItem('belc.dict.' + w, JSON.stringify(json)); } catch(e2) {}
            if (callback) callback(json);
        }
    })
    .catch(function() {});
};

// Object.freeze for security — prevents runtime modification
if (Object.freeze && window._BELC_DICT) {
    try { Object.freeze(window._BELC_DICT); } catch(e) {}
}

})();
