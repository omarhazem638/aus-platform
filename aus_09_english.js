/* ═══════════════════════════════════════════════════════════════
   BUSINESS ENGLISH LEARNING CENTER  ·  aus_09_english.js
   Auto-scroll reader · Business Dictionary · Quiz · Gamification
═══════════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────────
var _eng = {
    level: null, scrolling: false, speed: 0.6, _raf: null,
    learnedWords: new Set(), progress: {}, streak: 0, lastDate: null,
    quizActive: false, quizQ: 0, quizScore: 0, quizAnswered: false,
    startTime: 0, styleInjected: false
};

(function _engLoad() {
    try {
        var p = localStorage.getItem('aus.eng.progress');
        if (p) _eng.progress = JSON.parse(p);
        var w = localStorage.getItem('aus.eng.words');
        if (w) _eng.learnedWords = new Set(JSON.parse(w));
        var s = localStorage.getItem('aus.eng.streak');
        if (s) { var d = JSON.parse(s); _eng.streak = d.c || 0; _eng.lastDate = d.d || null; }
    } catch (e) {}
})();

function _engSave() {
    try {
        localStorage.setItem('aus.eng.progress', JSON.stringify(_eng.progress));
        localStorage.setItem('aus.eng.words', JSON.stringify([..._eng.learnedWords]));
    } catch (e) {}
}

function _engUpdateStreak() {
    var today = new Date().toISOString().slice(0, 10);
    if (_eng.lastDate === today) return;
    var yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    _eng.streak = (_eng.lastDate === yesterday) ? _eng.streak + 1 : 1;
    _eng.lastDate = today;
    try { localStorage.setItem('aus.eng.streak', JSON.stringify({ c: _eng.streak, d: today })); } catch (e) {}
}

// ── Business Dictionary (160 terms) ──────────────────────────────
var _engDict = {
    // ─ Finance & Accounting ─────────────────────────────────────
    'revenue':      { en: 'Total income earned from sales before any expenses are deducted.',                       ar: 'الإيرادات', ex: 'Annual revenue exceeded $10 billion for the first time.', pos: 'noun', ctx: 'The top line of an income statement.' },
    'profit':       { en: 'Financial gain remaining after all costs and taxes are subtracted from revenue.',         ar: 'الربح',     ex: 'Net profit margins improved from 8% to 12%.', pos: 'noun', ctx: 'The bottom line; key measure of business success.' },
    'equity':       { en: 'The ownership interest in a company; assets minus liabilities.',                          ar: 'حقوق الملكية', ex: 'Shareholders\' equity grew by 15% this year.', pos: 'noun', ctx: 'Represents owners\' stake in the business.' },
    'asset':        { en: 'A resource owned by a business that has economic value.',                                  ar: 'الأصول',   ex: 'Total assets on the balance sheet reached $50 million.', pos: 'noun', ctx: 'Includes cash, equipment, property, and inventory.' },
    'liability':    { en: 'A financial obligation or debt owed by a company.',                                        ar: 'الالتزامات (الديون)', ex: 'Current liabilities must be paid within one year.', pos: 'noun', ctx: 'Opposite of assets; includes loans and accounts payable.' },
    'capital':      { en: 'Financial resources invested in a business to generate income.',                           ar: 'رأس المال', ex: 'The startup raised $2 million in seed capital.', pos: 'noun', ctx: 'Can be equity capital (ownership) or debt capital (loans).' },
    'dividend':     { en: 'A portion of a company\'s profit distributed to shareholders.',                            ar: 'الأرباح الموزعة', ex: 'The board approved a dividend of $1.50 per share.', pos: 'noun', ctx: 'Reward for investors; signals financial health.' },
    'depreciation': { en: 'The reduction in value of an asset over time due to use or obsolescence.',                ar: 'الاستهلاك (انخفاض قيمة الأصول)', ex: 'Depreciation of machinery is recorded annually.', pos: 'noun', ctx: 'A non-cash expense that reduces taxable income.' },
    'liquidity':    { en: 'The ease with which assets can be converted into cash.',                                   ar: 'السيولة',   ex: 'High liquidity ensures the firm can meet short-term obligations.', pos: 'noun', ctx: 'Critical for operational stability.' },
    'valuation':    { en: 'The process of determining the present economic value of a company.',                      ar: 'التقييم',   ex: 'The startup received a valuation of $500 million.', pos: 'noun', ctx: 'Used in investments, mergers, and acquisitions.' },
    'roi':          { en: 'Return on Investment; a measure of profitability relative to cost.',                       ar: 'العائد على الاستثمار', ex: 'The marketing campaign delivered an ROI of 300%.', pos: 'noun', ctx: 'Formula: (Net Profit / Cost of Investment) × 100.' },
    'ebitda':       { en: 'Earnings Before Interest, Taxes, Depreciation, and Amortization.',                        ar: 'الأرباح قبل الفوائد والضرائب والاستهلاك', ex: 'EBITDA margin reached 22%, indicating strong operations.', pos: 'noun', ctx: 'Used to compare profitability across companies.' },
    'cashflow':     { en: 'The net amount of money moving in and out of a business.',                                 ar: 'التدفق النقدي', ex: 'Positive cash flow is essential for day-to-day operations.', pos: 'noun', ctx: 'Different from profit; a business can be profitable but cash-poor.' },
    'budget':       { en: 'A financial plan estimating revenues and expenses for a specific period.',                  ar: 'الميزانية',  ex: 'The annual budget was approved by the board of directors.', pos: 'noun', ctx: 'Guides spending and helps control costs.' },
    'investment':   { en: 'The allocation of money or resources with the expectation of future returns.',              ar: 'الاستثمار', ex: 'Long-term investment in R&D drives innovation.', pos: 'noun', ctx: 'Can be in financial instruments, business, or projects.' },
    'acquisition':  { en: 'The purchase of one company by another.',                                                  ar: 'الاستحواذ', ex: 'The acquisition of the startup cost $200 million.', pos: 'noun', ctx: 'A form of inorganic growth strategy.' },
    'merger':       { en: 'The combination of two companies into a single new entity.',                                ar: 'الاندماج',  ex: 'The merger created the largest bank in the region.', pos: 'noun', ctx: 'Used to gain market share, synergies, or capabilities.' },
    'ipo':          { en: 'Initial Public Offering; the first sale of company stock to the public.',                   ar: 'الطرح العام الأولي', ex: 'The tech company\'s IPO raised $1.2 billion.', pos: 'noun', ctx: 'Converts a private company into a publicly traded one.' },
    'amortization': { en: 'The gradual repayment of a debt or reduction of an intangible asset over time.',           ar: 'إطفاء الديون', ex: 'Loan amortization is spread over 20 years.', pos: 'noun', ctx: 'Similar to depreciation but for intangible assets and loans.' },
    'leverage':     { en: 'The use of borrowed capital to potentially increase return on investment.',                  ar: 'الرافعة المالية', ex: 'High leverage amplifies both gains and risks.', pos: 'noun', ctx: 'Common in private equity and real estate.' },

    // ─ Marketing & Sales ────────────────────────────────────────
    'brand':        { en: 'A name, term, design, or symbol that identifies and differentiates a product.',             ar: 'العلامة التجارية', ex: 'Apple has one of the most valuable brands globally.', pos: 'noun', ctx: 'Brand equity represents the added value customers attach to a name.' },
    'market':       { en: 'A group of buyers and sellers engaged in trade of goods or services.',                      ar: 'السوق',     ex: 'The company entered the Southeast Asian market.', pos: 'noun', ctx: 'Markets can be geographic, demographic, or product-based.' },
    'segmentation': { en: 'Dividing a market into distinct groups with similar needs or characteristics.',              ar: 'التجزئة السوقية', ex: 'Market segmentation revealed three key customer groups.', pos: 'noun', ctx: 'Foundation of targeted marketing strategy.' },
    'targeting':    { en: 'Selecting specific market segments to focus marketing efforts on.',                          ar: 'الاستهداف',  ex: 'The company is targeting millennials with its new product line.', pos: 'noun', ctx: 'Follows segmentation; precedes positioning.' },
    'positioning':  { en: 'How a company wants its product perceived in the minds of customers.',                      ar: 'تحديد المكانة', ex: 'Volvo\'s positioning focuses on safety and reliability.', pos: 'noun', ctx: 'The P in STP marketing framework.' },
    'campaign':     { en: 'A coordinated series of marketing activities to achieve a specific goal.',                   ar: 'الحملة التسويقية', ex: 'The digital campaign generated 50,000 leads.', pos: 'noun', ctx: 'Can be product launch, seasonal, or brand awareness.' },
    'conversion':   { en: 'The process of turning potential customers into actual buyers.',                             ar: 'التحويل',   ex: 'The website achieved a 4% conversion rate.', pos: 'noun', ctx: 'Key metric in digital marketing and sales.' },
    'retention':    { en: 'The ability of a company to keep its customers over time.',                                  ar: 'الاحتفاظ بالعملاء', ex: 'Customer retention is cheaper than acquisition.', pos: 'noun', ctx: 'Measured by churn rate; linked to loyalty and LTV.' },
    'pricing':      { en: 'The strategy of setting the monetary value for products or services.',                       ar: 'التسعير',   ex: 'Premium pricing reinforces the luxury brand image.', pos: 'noun', ctx: 'Directly impacts revenue and market positioning.' },
    'distribution': { en: 'The process of getting products from producer to end consumer.',                             ar: 'التوزيع',   ex: 'Efficient distribution reduces delivery time and cost.', pos: 'noun', ctx: 'One of the 4Ps of marketing (Place).' },
    'proposition':  { en: 'A statement explaining how a product solves problems or delivers benefits.',                 ar: 'عرض القيمة', ex: 'The value proposition must be clear and compelling.', pos: 'noun', ctx: 'Central to product and marketing strategy.' },
    'engagement':   { en: 'The level of interaction and emotional connection customers have with a brand.',             ar: 'التفاعل والتواصل', ex: 'Social media engagement rose 40% after the campaign.', pos: 'noun', ctx: 'Higher engagement typically leads to loyalty and advocacy.' },
    'analytics':    { en: 'The systematic analysis of data to inform business decisions.',                              ar: 'التحليلات',  ex: 'Marketing analytics revealed peak purchasing hours.', pos: 'noun', ctx: 'Includes web, social, and customer behavior analytics.' },
    'funnel':       { en: 'A model representing the customer journey from awareness to purchase.',                      ar: 'قمع المبيعات', ex: 'The sales funnel had a 12% conversion at the bottom.', pos: 'noun', ctx: 'Stages: Awareness → Interest → Decision → Action.' },
    'churn':        { en: 'The rate at which customers stop doing business with a company.',                            ar: 'معدل فقدان العملاء', ex: 'Reducing churn by 1% increased annual revenue by $2M.', pos: 'noun', ctx: 'High churn signals poor product-market fit or service quality.' },

    // ─ Management & Strategy ────────────────────────────────────
    'strategy':     { en: 'A long-term plan of action designed to achieve a major goal.',                              ar: 'الاستراتيجية', ex: 'The company\'s five-year strategy targets global expansion.', pos: 'noun', ctx: 'Involves resource allocation and competitive positioning.' },
    'stakeholder':  { en: 'Any person or group with an interest in a company\'s activities.',                          ar: 'أصحاب المصلحة', ex: 'Stakeholders include employees, customers, and investors.', pos: 'noun', ctx: 'Broader than shareholders; includes all affected parties.' },
    'governance':   { en: 'The system by which a company is directed and controlled.',                                 ar: 'الحوكمة',   ex: 'Strong governance protects shareholder interests.', pos: 'noun', ctx: 'Includes board structure, policies, and accountability.' },
    'compliance':   { en: 'Adherence to laws, regulations, and company policies.',                                     ar: 'الامتثال',  ex: 'Compliance with data privacy laws is mandatory.', pos: 'noun', ctx: 'Failure results in fines, legal action, and reputational damage.' },
    'benchmark':    { en: 'A standard or point of reference used for comparison or performance measurement.',           ar: 'معيار القياس', ex: 'We benchmark our costs against industry best practices.', pos: 'noun', ctx: 'Used in competitive analysis and performance management.' },
    'kpi':          { en: 'Key Performance Indicator; a measurable value demonstrating goal achievement.',              ar: 'مؤشر الأداء الرئيسي', ex: 'Monthly active users is a critical KPI for our platform.', pos: 'noun', ctx: 'Good KPIs are SMART: Specific, Measurable, Achievable, Relevant, Time-bound.' },
    'okr':          { en: 'Objectives and Key Results; a goal-setting framework for measurable outcomes.',              ar: 'الأهداف والنتائج الرئيسية', ex: 'Google popularized OKRs across the technology industry.', pos: 'noun', ctx: 'Objectives are qualitative; key results are quantitative.' },
    'portfolio':    { en: 'A collection of investments, products, or projects managed as a group.',                    ar: 'المحفظة',   ex: 'The product portfolio spans five market segments.', pos: 'noun', ctx: 'Diversification across a portfolio reduces overall risk.' },
    'innovation':   { en: 'The introduction of new ideas, products, processes, or methods.',                           ar: 'الابتكار',  ex: 'Continuous innovation is essential for competitive advantage.', pos: 'noun', ctx: 'Incremental vs. disruptive innovation — both are vital.' },
    'disruption':   { en: 'A radical change that displaces established market leaders or practices.',                   ar: 'الاضطراب (تغيير جذري)', ex: 'Streaming services caused major disruption to cable TV.', pos: 'noun', ctx: 'Disruptive innovators typically start with simpler, cheaper products.' },
    'synergy':      { en: 'The increased effectiveness achieved when entities work together.',                          ar: 'التآزر',    ex: 'The merger created significant operational synergies.', pos: 'noun', ctx: 'Often cited in M&A: "2+2=5" concept.' },
    'scalability':  { en: 'The ability of a business to grow and handle increased demand efficiently.',                 ar: 'قابلية التوسع', ex: 'Software business models offer superior scalability.', pos: 'noun', ctx: 'Scalable businesses grow revenue faster than costs.' },
    'pivot':        { en: 'A fundamental change in business strategy while leveraging existing assets.',                ar: 'تحويل الاستراتيجية', ex: 'The startup pivoted from B2C to B2B after market research.', pos: 'noun', ctx: 'Common in early-stage startups when initial model fails.' },
    'disruption':   { en: 'A radical change that displaces established products or market leaders.',                    ar: 'الاضطراب التجاري', ex: 'Ride-sharing caused massive disruption in the taxi industry.', pos: 'noun', ctx: 'Coined by Clayton Christensen in "The Innovator\'s Dilemma".' },
    'outsourcing':  { en: 'Contracting work to an external organization rather than doing it in-house.',                ar: 'الاستعانة بمصادر خارجية', ex: 'The company outsourced IT support to reduce costs.', pos: 'noun', ctx: 'Allows focus on core competencies; reduces fixed costs.' },

    // ─ Human Resources ──────────────────────────────────────────
    'recruitment':  { en: 'The process of finding, attracting, and hiring qualified candidates.',                      ar: 'التوظيف',   ex: 'Recruitment shifted heavily toward online platforms.', pos: 'noun', ctx: 'Includes job posting, screening, interviews, and offer.' },
    'onboarding':   { en: 'The process of integrating new employees into an organization.',                            ar: 'استيعاب الموظفين الجدد', ex: 'A strong onboarding program improves 90-day retention.', pos: 'noun', ctx: 'Covers orientation, training, and cultural integration.' },
    'performance':  { en: 'The achievement of an individual or organization measured against goals.',                   ar: 'الأداء',    ex: 'Performance reviews are conducted semi-annually.', pos: 'noun', ctx: 'Evaluated through KPIs, OKRs, and 360-degree feedback.' },
    'compensation': { en: 'The total monetary and non-monetary rewards provided to employees.',                        ar: 'التعويضات والمكافآت', ex: 'Competitive compensation packages attract top talent.', pos: 'noun', ctx: 'Includes salary, bonuses, benefits, and equity.' },
    'talent':       { en: 'Individuals with exceptional skills or high potential in their field.',                     ar: 'المواهب',   ex: 'Talent acquisition is the biggest challenge in tech.', pos: 'noun', ctx: 'Talent management covers recruitment, development, and retention.' },
    'culture':      { en: 'The shared values, beliefs, and practices that shape an organization.',                     ar: 'الثقافة المؤسسية', ex: 'A positive culture reduces employee turnover significantly.', pos: 'noun', ctx: 'Culture eats strategy for breakfast — Peter Drucker.' },
    'leadership':   { en: 'The ability to guide, inspire, and influence others toward common goals.',                  ar: 'القيادة',   ex: 'Effective leadership drives team performance and morale.', pos: 'noun', ctx: 'Includes transformational, servant, and situational styles.' },
    'empowerment':  { en: 'Giving employees authority, resources, and confidence to make decisions.',                  ar: 'التمكين',   ex: 'Employee empowerment leads to higher engagement and innovation.', pos: 'noun', ctx: 'Associated with flat organizational structures.' },
    'turnover':     { en: 'The rate at which employees leave and are replaced within a company.',                      ar: 'معدل دوران الموظفين', ex: 'High turnover costs companies 50–200% of annual salary.', pos: 'noun', ctx: 'Also refers to revenue (British English usage).' },
    'diversity':    { en: 'The presence of varied characteristics, backgrounds, and perspectives in a workforce.',     ar: 'التنوع',    ex: 'Diversity in leadership improves decision-making quality.', pos: 'noun', ctx: 'Includes gender, ethnicity, age, and cognitive diversity.' },
    'succession':   { en: 'Planning for future leadership by identifying and developing internal candidates.',          ar: 'التخطيط للخلافة الوظيفية', ex: 'Succession planning ensures leadership continuity.', pos: 'noun', ctx: 'Critical for senior and C-suite roles.' },

    // ─ Operations & Supply Chain ────────────────────────────────
    'logistics':    { en: 'The management of the flow of goods, services, and information.',                           ar: 'اللوجستيات', ex: 'Efficient logistics reduced delivery costs by 20%.', pos: 'noun', ctx: 'Includes transportation, warehousing, and inventory management.' },
    'inventory':    { en: 'The stock of goods and materials held by a business.',                                      ar: 'المخزون',   ex: 'Just-in-time systems minimize inventory levels.', pos: 'noun', ctx: 'Too much inventory ties up capital; too little risks stockouts.' },
    'procurement':  { en: 'The process of acquiring goods and services from external suppliers.',                       ar: 'المشتريات', ex: 'Strategic procurement reduced material costs by 15%.', pos: 'noun', ctx: 'Covers sourcing, negotiation, purchasing, and supplier management.' },
    'vendor':       { en: 'A company or individual that supplies goods or services to a business.',                    ar: 'المورد / البائع', ex: 'The company evaluated three vendors before signing.', pos: 'noun', ctx: 'Vendor management ensures quality, cost, and delivery standards.' },
    'throughput':   { en: 'The amount of material or work processed in a given period.',                               ar: 'الإنتاجية (معدل الإنجاز)', ex: 'Factory throughput increased by 30% after automation.', pos: 'noun', ctx: 'A key metric in lean operations and theory of constraints.' },
    'capacity':     { en: 'The maximum output a business can produce with available resources.',                       ar: 'الطاقة الإنتاجية', ex: 'The plant is operating at 90% capacity.', pos: 'noun', ctx: 'Capacity planning ensures resources match demand forecasts.' },
    'efficiency':   { en: 'Achieving maximum output with minimum waste of time, effort, or resources.',                ar: 'الكفاءة',   ex: 'Process efficiency improved after implementing lean methods.', pos: 'noun', ctx: 'Efficiency is doing things right; effectiveness is doing right things.' },
    'automation':   { en: 'The use of technology to perform tasks with minimal human intervention.',                   ar: 'الأتمتة',   ex: 'Automation reduced production errors by 85%.', pos: 'noun', ctx: 'Increases efficiency but requires significant upfront investment.' },
    'outsourcing':  { en: 'Delegating business processes to external service providers.',                               ar: 'الاستعانة بمصادر خارجية', ex: 'Customer service was outsourced to reduce operational costs.', pos: 'noun', ctx: 'Allows focus on core business activities.' },
    'quality':      { en: 'The degree to which a product or service meets specified standards.',                       ar: 'الجودة',    ex: 'ISO certification demonstrates commitment to quality.', pos: 'noun', ctx: 'Total Quality Management (TQM) embeds quality across all processes.' },
    'supplier':     { en: 'An entity that provides goods or services to another business.',                            ar: 'المورد',    ex: 'Diversifying suppliers reduces supply chain risk.', pos: 'noun', ctx: 'Strategic suppliers are partners, not just vendors.' },

    // ─ Entrepreneurship & Startups ──────────────────────────────
    'entrepreneur': { en: 'An individual who creates and runs a new business, taking on financial risk.',              ar: 'رائد الأعمال', ex: 'Serial entrepreneurs apply lessons from past ventures.', pos: 'noun', ctx: 'Differs from businessman — entrepreneurs innovate and disrupt.' },
    'startup':      { en: 'A newly founded company designed to develop a scalable business model.',                    ar: 'الشركة الناشئة', ex: 'The startup grew from 5 to 200 employees in two years.', pos: 'noun', ctx: 'Characterized by uncertainty, rapid growth, and innovation.' },
    'venture':      { en: 'A new business undertaking that involves risk and uncertainty.',                             ar: 'المشروع الجديد', ex: 'The joint venture expanded into three new markets.', pos: 'noun', ctx: 'Venture capital funds high-risk, high-reward startups.' },
    'incubator':    { en: 'A program providing startups with workspace, mentorship, and resources.',                    ar: 'الحاضنة',   ex: 'The university incubator supported 20 startups last year.', pos: 'noun', ctx: 'Different from accelerators — incubators are longer-term.' },
    'accelerator':  { en: 'An intensive program offering startups funding, mentorship, and rapid growth support.',      ar: 'المسرّع',   ex: 'Y Combinator is the world\'s most prestigious accelerator.', pos: 'noun', ctx: 'Typically 3–6 months; ends with a Demo Day for investors.' },
    'bootstrapping':{ en: 'Building a business using only personal savings without external funding.',                  ar: 'التمويل الذاتي', ex: 'They bootstrapped the company to profitability in 18 months.', pos: 'noun', ctx: 'Preserves equity but limits growth speed.' },
    'prototype':    { en: 'An early model of a product built to test a concept.',                                      ar: 'النموذج الأولي', ex: 'User feedback on the prototype shaped the final design.', pos: 'noun', ctx: 'Build-measure-learn cycle in Lean Startup methodology.' },
    'scalable':     { en: 'Capable of growing in size, volume, or revenue without proportional cost increase.',         ar: 'قابل للتوسع', ex: 'A scalable model is essential for investor interest.', pos: 'adj', ctx: 'Software businesses are inherently more scalable than services.' },
    'disruption':   { en: 'A transformation that creates a new market by displacing an existing one.',                  ar: 'التغيير الجذري', ex: 'Fintech is causing disruption across traditional banking.', pos: 'noun', ctx: 'Disruptive innovations often start at the low end of the market.' },
    'mvp':          { en: 'Minimum Viable Product; the simplest version of a product that can be released.',            ar: 'الحد الأدنى من المنتج القابل للتطبيق', ex: 'The MVP was launched in three weeks to test market demand.', pos: 'noun', ctx: 'Core principle of Lean Startup; reduces wasted development.' },

    // ─ Technology & Digital ──────────────────────────────────────
    'digital':      { en: 'Relating to technology that uses binary (computer-based) data systems.',                    ar: 'الرقمي',    ex: 'Digital channels now account for 70% of all sales.', pos: 'adj', ctx: 'Digital transformation goes beyond technology — it changes culture.' },
    'platform':     { en: 'A business model that creates value by facilitating interactions between users.',            ar: 'المنصة',    ex: 'Platform businesses scale rapidly with network effects.', pos: 'noun', ctx: 'Examples: Amazon, Airbnb, Uber — marketplace platforms.' },
    'ecosystem':    { en: 'A complex network of organizations and relationships creating value together.',              ar: 'النظام البيئي للأعمال', ex: 'Apple\'s ecosystem keeps customers loyal across products.', pos: 'noun', ctx: 'Strong ecosystems create switching costs and competitive moats.' },
    'algorithm':    { en: 'A set of rules or instructions a computer follows to complete a task.',                     ar: 'الخوارزمية', ex: 'The recommendation algorithm drives 35% of Netflix views.', pos: 'noun', ctx: 'Algorithms power personalization, pricing, and logistics.' },
    'saas':         { en: 'Software as a Service; software delivered online via subscription.',                         ar: 'البرمجيات كخدمة', ex: 'SaaS revenue models offer predictable recurring income.', pos: 'noun', ctx: 'Opposite of traditional software licensing (one-time purchase).' },
    'subscription': { en: 'A business model where customers pay recurring fees for ongoing access.',                    ar: 'الاشتراك',  ex: 'Subscription models improve revenue predictability.', pos: 'noun', ctx: 'LTV is key — lifetime value must exceed acquisition cost.' },
    'bandwidth':    { en: 'The data transfer capacity of a network or the capacity of an individual.',                 ar: 'النطاق الترددي / الطاقة التشغيلية', ex: 'I don\'t have the bandwidth to take on more projects.', pos: 'noun', ctx: 'Used metaphorically in business to mean time and capacity.' },
    'agile':        { en: 'An iterative approach to project management emphasizing flexibility and collaboration.',      ar: 'المنهجية الرشيقة', ex: 'Agile sprints enabled faster product updates.', pos: 'adj', ctx: 'Contrasts with Waterfall; favors adaptation over rigid planning.' },
    'blockchain':   { en: 'A distributed digital ledger that records transactions across multiple computers.',          ar: 'سلسلة الكتل', ex: 'Blockchain ensures transparency in supply chain tracking.', pos: 'noun', ctx: 'Foundation of cryptocurrency and smart contracts.' },
    'cybersecurity':{ en: 'The practice of protecting systems and networks from digital attacks.',                      ar: 'الأمن السيبراني', ex: 'Cybersecurity spending increased 20% after the breach.', pos: 'noun', ctx: 'Risk management is central to modern cybersecurity strategy.' },

    // ─ Economics & Global Business ──────────────────────────────
    'inflation':    { en: 'The rate at which the general level of prices for goods rises over time.',                  ar: 'التضخم',    ex: 'Rising inflation eroded consumer purchasing power.', pos: 'noun', ctx: 'Measured by Consumer Price Index (CPI). Central banks target ~2%.' },
    'gdp':          { en: 'Gross Domestic Product; the total monetary value of goods and services produced.',           ar: 'الناتج المحلي الإجمالي', ex: 'The country\'s GDP grew by 4.5% last year.', pos: 'noun', ctx: 'Key measure of national economic health and size.' },
    'globalization':{ en: 'The process of increasing interconnection between economies, cultures, and markets.',        ar: 'العولمة',   ex: 'Globalization created new markets but intensified competition.', pos: 'noun', ctx: 'Drives trade, investment, and cultural exchange across borders.' },
    'trade':        { en: 'The exchange of goods, services, or financial instruments between parties.',                 ar: 'التجارة',   ex: 'International trade accounts for 60% of global GDP.', pos: 'noun', ctx: 'Trade policy (tariffs, quotas) significantly impacts business.' },
    'tariff':       { en: 'A tax imposed on imported goods by a government.',                                          ar: 'الرسوم الجمركية', ex: 'Steel tariffs increased raw material costs for manufacturers.', pos: 'noun', ctx: 'Trade wars involve retaliatory tariffs between countries.' },
    'currency':     { en: 'The system of money used in a particular country.',                                         ar: 'العملة',    ex: 'Currency fluctuations affect international profit margins.', pos: 'noun', ctx: 'Exchange rate risk must be managed in global businesses.' },
    'recession':    { en: 'A period of temporary economic decline with reduced trade and activity.',                    ar: 'الركود الاقتصادي', ex: 'The company maintained profitability through the recession.', pos: 'noun', ctx: 'Typically defined as two consecutive quarters of negative GDP growth.' },
    'competition':  { en: 'The rivalry between businesses offering similar products or services.',                      ar: 'المنافسة',  ex: 'Intense competition in the market compressed margins.', pos: 'noun', ctx: 'Porter\'s Five Forces framework analyzes competitive dynamics.' },
    'monopoly':     { en: 'A market with only one provider of a product or service.',                                  ar: 'الاحتكار',  ex: 'Regulatory bodies prevent the formation of monopolies.', pos: 'noun', ctx: 'Natural monopolies (utilities) may be government-regulated.' },
    'demand':       { en: 'Consumer willingness and ability to purchase a product at a given price.',                  ar: 'الطلب',     ex: 'Demand for electric vehicles is growing rapidly.', pos: 'noun', ctx: 'Law of demand: as price rises, quantity demanded falls.' },
    'supply':       { en: 'The quantity of a product available for purchase in the market.',                           ar: 'العرض',     ex: 'Supply chain disruptions reduced supply and raised prices.', pos: 'noun', ctx: 'Supply and demand equilibrium determines market price.' },

    // ─ General Business Terms ───────────────────────────────────
    'stakeholders': { en: 'All parties with an interest in a company\'s performance or outcomes.',                     ar: 'أصحاب المصلحة', ex: 'The report was presented to all key stakeholders.', pos: 'noun', ctx: 'Includes customers, employees, investors, and communities.' },
    'objective':    { en: 'A specific, measurable goal that an organization seeks to achieve.',                        ar: 'الهدف',     ex: 'The quarterly objective is to increase market share by 5%.', pos: 'noun', ctx: 'Objectives should be SMART: Specific, Measurable, Achievable, Relevant, Time-bound.' },
    'forecast':     { en: 'A prediction of future business conditions based on analysis and data.',                    ar: 'التوقعات / التنبؤ', ex: 'Sales forecast for Q4 projects 15% growth.', pos: 'noun', ctx: 'Financial forecasting guides planning and investor communications.' },
    'milestone':    { en: 'A significant event or checkpoint marking progress toward a goal.',                         ar: 'المعلم / الإنجاز المرحلي', ex: 'Reaching 1 million users was a major milestone.', pos: 'noun', ctx: 'Used in project management to track progress and trigger reviews.' },
    'proposal':     { en: 'A formal document suggesting a plan of action or business deal.',                           ar: 'الاقتراح / العرض', ex: 'The vendor submitted a proposal with pricing and timeline.', pos: 'noun', ctx: 'Business proposals should address problem, solution, cost, and timeline.' },
    'negotiation':  { en: 'A discussion aimed at reaching a mutually acceptable agreement.',                           ar: 'التفاوض',   ex: 'Contract negotiation lasted three weeks.', pos: 'noun', ctx: 'Win-win negotiation builds long-term business relationships.' },
    'contract':     { en: 'A legally binding agreement between two or more parties.',                                  ar: 'العقد',     ex: 'The service contract runs for two years.', pos: 'noun', ctx: 'Contracts specify obligations, rights, terms, and remedies.' },
    'audit':        { en: 'An official examination of an organization\'s accounts, processes, or systems.',            ar: 'التدقيق',   ex: 'The annual audit confirmed financial reporting accuracy.', pos: 'noun', ctx: 'External audits provide independence; internal audits ensure compliance.' },
    'transparent':  { en: 'Open and clear in communication, decisions, and operations.',                               ar: 'الشفافية',  ex: 'Transparent reporting builds investor and public trust.', pos: 'adj', ctx: 'Corporate transparency is linked to governance quality.' },
    'accountability':{ en: 'The responsibility to explain and justify one\'s actions and decisions.',                  ar: 'المساءلة',  ex: 'Accountability culture reduced errors and increased productivity.', pos: 'noun', ctx: 'Key component of good corporate governance.' },
};

// ── 10 Level Texts ────────────────────────────────────────────────
var _engTexts = [
`Starting a business is one of the most exciting and challenging decisions a person can make in their professional life. Every great company in the world today began as a simple idea in someone's mind. The entrepreneur who builds a successful business must combine creativity, discipline, and resilience in equal measure, navigating uncertainty with confidence and learning continuously from both failure and success.

The first critical step in launching any business is identifying a genuine market need. Many aspiring entrepreneurs make the costly mistake of falling in love with their product before validating whether customers actually want or need it. Experienced entrepreneurs conduct thorough market research early in the process, gathering data on potential customers, studying existing competitors, analyzing pricing structures, and identifying gaps in the current market offering. This research forms the foundation of every sound business decision that follows.

Once market demand is confirmed, the next essential step is developing a comprehensive business plan. This document serves as the strategic roadmap of your entire venture. A well-crafted business plan clearly outlines your company's mission and long-term vision, provides a detailed description of your target market and ideal customer profile, explains your unique competitive advantage, and presents realistic financial projections covering the first three to five years of operation. Investors, banks, and potential business partners will all carefully review this document, so clarity and realism are absolutely essential.

Funding represents one of the most pressing challenges facing any new startup. Entrepreneurs have several distinct options to consider. Bootstrapping — using personal savings to finance the business — gives you complete ownership and control but significantly limits your speed of growth. Angel investors provide early-stage capital in exchange for equity, typically contributing not only money but also valuable mentorship and industry connections. Venture capital firms invest substantially larger amounts in startups demonstrating strong growth potential and a scalable business model.

Building the right team is equally critical as securing financial resources. The most innovative idea will fail without talented, motivated people to execute it effectively. Successful founders develop a clear understanding of their own strengths and weaknesses, deliberately hiring people who complement and strengthen those areas. Company culture matters enormously from the very first day — the values and behaviors established in the earliest stages will shape your organization for years to come.

Cash flow management is the lifeblood of any new business. Many promising startups fail not because their product is poor, but because they run out of cash before achieving profitability. Carefully monitoring your monthly burn rate and maintaining a minimum operational runway of six months is a fundamental principle of startup financial management.

The journey from startup to established company demands continuous learning, honest self-assessment, and willingness to adapt. Markets shift, customer preferences evolve, and technology disrupts even the most successful models. The entrepreneur who listens to feedback and is willing to pivot when circumstances require gives their business the best chance of long-term success. Starting a business is not merely a financial decision — it is a lasting commitment to personal and professional growth.`,

`Marketing is the engine that drives business growth. Without an effective marketing strategy, even the most innovative product will struggle to reach its intended audience. Understanding how to identify, attract, and retain customers is not simply a skill — it is the foundation upon which every successful commercial enterprise is built.

The starting point of any marketing strategy is a deep understanding of the target customer. Successful marketers do not try to sell to everyone; instead, they practice market segmentation, dividing the total available market into distinct groups of consumers who share similar characteristics, needs, or behaviors. These segments might be defined by demographics such as age, income, or location, or by psychographic factors including values, lifestyle, and purchasing motivations. Once segments are identified, the company selects the most attractive ones to pursue through a process called targeting.

With a defined target audience in mind, the brand can then focus on positioning — establishing a clear and compelling place in the customer's mind relative to competing products. Effective positioning answers a simple but powerful question: why should a customer choose this product over every alternative available? The answer to this question becomes the core of the brand's value proposition, a statement that communicates specific benefits, addresses genuine pain points, and differentiates the offering from the competition in a meaningful way.

The marketing mix — traditionally described as the four Ps of Product, Price, Place, and Promotion — provides a framework for bringing a value proposition to life. Product decisions involve not only the physical item or service but also packaging, quality standards, and after-sales support. Pricing strategy must balance profitability with market expectations, customer perception of value, and competitive dynamics. Distribution channels, representing the "Place" element, determine how conveniently customers can access the product. Promotional activities — including advertising, public relations, social media, email marketing, and content creation — communicate the brand message to potential customers.

In the digital age, marketing has undergone a profound transformation. Data analytics now allows companies to measure the effectiveness of every campaign with precision, tracking metrics such as click-through rates, conversion rates, customer acquisition cost, and return on advertising spend. Social media platforms have created new opportunities for brands to engage directly with customers, building communities and generating authentic word-of-mouth advocacy at scale.

Customer retention has become as important as customer acquisition in modern marketing thinking. Research consistently shows that retaining an existing customer is five to seven times more cost-effective than acquiring a new one. Loyalty programs, personalized communication, exceptional customer service, and consistent delivery of promised value are all powerful tools for reducing customer churn and increasing lifetime value. Building genuine relationships with customers — rather than simply executing transactions — is the hallmark of truly sustainable marketing strategy.

Understanding consumer behavior, the psychological and social processes that influence purchasing decisions, is the deepest layer of marketing mastery. Consumers rarely make purely rational decisions; emotions, social proof, perceived scarcity, and brand trust all play significant roles. The marketer who understands these dynamics can craft messages and experiences that resonate at a fundamental human level, converting prospects into loyal advocates for the brand.`,

`Financial management is the discipline that determines whether a business survives, grows, or ultimately fails. Even companies with outstanding products and brilliant teams can collapse under the weight of poor financial decisions. Understanding the fundamental principles of finance is therefore not optional for business leaders — it is an absolute requirement for sustainable success.

The income statement, balance sheet, and cash flow statement form the three essential financial reports that every manager must be able to read and interpret. The income statement — sometimes called the profit and loss statement — summarizes revenues, costs, and expenses over a specific period, ultimately revealing whether the business generated a profit or incurred a loss. The balance sheet provides a snapshot of the company's financial position at a single point in time, listing assets on one side and liabilities plus shareholders' equity on the other. Assets always equal the sum of liabilities and equity, a principle known as the fundamental accounting equation. The cash flow statement tracks the actual movement of money in and out of the business, distinguishing between operational, investing, and financing activities.

A critical concept that many new managers misunderstand is the difference between profit and cash flow. A business can report healthy profits on its income statement while simultaneously running out of cash. This situation occurs when customers delay payments, when inventory levels are too high, or when capital expenditure commitments exceed available liquidity. Managing working capital — the difference between current assets and current liabilities — is therefore one of the most important and ongoing responsibilities of financial management.

Capital structure refers to the way a company finances its assets and operations through a combination of equity and debt. Equity financing involves selling ownership shares to investors who receive returns through dividends and capital appreciation. Debt financing involves borrowing money from banks or bond markets, creating an obligation to repay principal with interest regardless of business performance. The optimal capital structure balances the tax advantages of debt against the financial risk that high leverage creates, particularly during economic downturns when revenues may decline unexpectedly.

Financial planning and budgeting translate strategic objectives into quantifiable financial targets. An annual budget sets revenue expectations and spending limits for each department, providing a management tool for monitoring performance and controlling costs throughout the year. Variance analysis — comparing actual results to budgeted figures — helps managers identify areas of concern early and make corrective adjustments before small problems become significant crises.

Return on investment remains the most universally applied measure of financial performance. Every capital allocation decision should be evaluated through the lens of expected returns relative to the risk involved. Net present value analysis, which discounts future cash flows to their equivalent current value, provides a rigorous framework for comparing investment opportunities across different time horizons and risk profiles. The cost of capital — the minimum return required to justify a particular investment — serves as the benchmark against which all financial decisions should be measured.

Risk management is the final essential component of sound financial practice. Interest rate changes, currency fluctuations, commodity price volatility, and credit risk can all materially impact financial performance. Modern financial managers use instruments such as derivatives, hedging contracts, and diversification strategies to reduce exposure to these risks, protecting the business from extreme events while preserving the upside potential that drives long-term value creation.`,
`Human Resources management has evolved from a purely administrative function into one of the most strategically important disciplines within modern organizations. The most sophisticated technology, the most innovative products, and the most generous financial resources mean very little without capable, motivated, and engaged people to deploy them effectively. Talent, as business leaders frequently observe, is the only truly sustainable competitive advantage that cannot be purchased, replicated, or reverse-engineered by rivals.

Recruitment and talent acquisition represent the critical first step in building organizational capability. Finding the right people requires more than posting job advertisements and conducting interviews. Leading organizations invest significantly in employer branding — the reputation they build as a workplace — recognizing that top candidates have choices and will select employers whose values, culture, and growth opportunities align with their own professional aspirations. The cost of a poor hiring decision extends far beyond the immediate recruitment expense; research estimates that replacing a poorly matched employee costs between one and two times their annual salary when productivity loss, training costs, and team disruption are properly accounted for.

Once the right people are hired, effective onboarding becomes the foundation of long-term success. A structured onboarding program that introduces new employees to the organization's culture, values, processes, and expectations within the critical first ninety days significantly improves both performance and retention. New employees who feel welcomed, informed, and connected to organizational purpose become productive contributors far more quickly than those left to navigate the environment alone.

Performance management systems provide the structure for ongoing development and accountability. Modern approaches have moved well beyond the traditional annual performance review, recognizing that meaningful feedback must be continuous, specific, and forward-looking rather than retrospective and evaluative only. The most effective performance conversations connect individual goals to organizational strategy through frameworks such as OKRs, helping employees understand how their daily work contributes to the broader mission. Regular one-on-one meetings between managers and team members, quarterly goal reviews, and peer feedback processes all contribute to a culture of continuous improvement.

Compensation and benefits strategy must be carefully designed to attract, retain, and motivate the specific talent profiles the organization requires. Total compensation extends far beyond base salary to include performance bonuses, equity participation, health benefits, retirement contributions, professional development investment, flexible working arrangements, and the intangible value of a positive work environment. Companies that compete on compensation alone, without addressing culture and growth opportunity, often find that high performers remain financially satisfied but emotionally disengaged.

Organizational culture is perhaps the most powerful and least tangible force shaping human behavior within a company. Culture describes the shared values, beliefs, assumptions, and behavioral norms that characterize how people actually work together, make decisions, and treat each other. Culture is not what is written in a values statement on the corporate website — it is what leaders consistently do, reward, and tolerate in practice. Building a strong, positive culture requires intentionality, consistency, and courage: the willingness to address behaviors that contradict stated values, even when those behaviors come from high-performing individuals.

Employee engagement — the degree to which individuals feel emotionally committed to their work and organization — is the outcome that human resources professionals ultimately seek to optimize. Research by Gallup and other institutions consistently demonstrates that teams with high engagement outperform disengaged teams by substantial margins across every meaningful business metric, including productivity, customer satisfaction, quality, safety, and profitability. Engaged employees do not simply complete assigned tasks; they bring discretionary effort, innovative thinking, and genuine commitment to their roles every single day.`,

`Operations management is the disciplined practice of designing, controlling, and continuously improving the processes through which organizations create and deliver products and services. While strategy determines what a company should accomplish and marketing communicates its value, operations determines whether the company can actually deliver on its promises efficiently, consistently, and at a cost that sustains profitability. In a world where customers expect faster delivery, higher quality, and lower prices simultaneously, operational excellence has become a primary source of competitive advantage.

Supply chain management is the cornerstone of modern operations. A supply chain encompasses every step and every organization involved in moving a product from raw material to end customer — including suppliers, manufacturers, distributors, retailers, and logistics providers. The globalization of business over the past three decades has created supply chains of extraordinary complexity and geographic reach, enabling companies to source materials from the lowest-cost producers worldwide. However, as global disruptions such as the COVID-19 pandemic and geopolitical tensions have demonstrated with devastating clarity, extended supply chains also introduce significant risks including demand volatility, transportation delays, supplier failures, and port congestion.

Inventory management represents one of the most financially significant operational challenges. Maintaining excessive inventory ties up capital that could be deployed more productively elsewhere, creates storage costs, and risks obsolescence if market preferences shift. Carrying too little inventory risks stockouts, production stoppages, and lost sales. The just-in-time philosophy, pioneered by Toyota's production system, seeks to eliminate this tension by synchronizing material flows precisely with production requirements, receiving goods only when needed and in exactly the quantities required. While elegant in theory, just-in-time systems require highly reliable suppliers and stable demand patterns to function effectively.

Process design and improvement are ongoing operational responsibilities. Every process within an organization — from order fulfillment and customer service to product development and financial reporting — can be analyzed, measured, and improved. Lean management provides a systematic framework for identifying and eliminating waste in all its forms: overproduction, unnecessary waiting, excess transportation, over-processing, excess inventory, unnecessary movement, and defects. By mapping the value stream and ruthlessly questioning every step that does not directly add value from the customer's perspective, organizations can dramatically increase efficiency without sacrificing quality.

Quality management has evolved from post-production inspection into a comprehensive organizational philosophy. Total Quality Management recognizes that quality cannot be inspected into a product after it is made — it must be built into every process from design through delivery. Six Sigma extends this principle with a rigorous statistical methodology targeting a defect rate of fewer than 3.4 per million opportunities, using the DMAIC cycle of Define, Measure, Analyze, Improve, and Control. Companies that achieve genuine Six Sigma capability not only reduce waste and rework costs dramatically but also build reputations for reliability that command premium pricing in the market.

Automation and technology have fundamentally transformed operational possibilities over recent decades. Robotics, artificial intelligence, advanced analytics, and the Internet of Things are enabling companies to achieve levels of speed, precision, and cost efficiency that were unimaginable a generation ago. A modern fulfillment center operated by Amazon processes millions of orders daily with minimal human intervention, while predictive maintenance algorithms monitor industrial equipment continuously, identifying potential failures before they cause costly production stoppages. The organizations that invest thoughtfully in operational technology today are building capabilities that will determine competitive outcomes for decades to come.

Capacity planning ensures that operational resources are aligned with demand requirements over both short and long time horizons. Insufficient capacity means lost revenue and dissatisfied customers during peak demand periods. Excess capacity means unnecessary fixed costs that erode profitability during slower periods. Effective capacity planning uses demand forecasting, scenario analysis, and flexible resource strategies to match supply with demand as closely as possible, maintaining operational agility without sacrificing efficiency.`,
`Corporate strategy is the art and science of making choices that determine the long-term direction and scope of an organization. While operational excellence ensures that today's business runs efficiently, strategic thinking shapes what the business will become tomorrow and defines the competitive position it will occupy in an evolving marketplace. In an environment of accelerating technological change, shifting customer expectations, and intensifying global competition, strategic clarity has never been more consequential.

The foundation of strategic analysis is a deep understanding of both the external competitive environment and the organization's internal capabilities. Michael Porter's Five Forces framework provides a powerful lens for examining industry dynamics, analyzing the relative power of suppliers and buyers, the threat of new market entrants, the availability of substitute products or services, and the intensity of rivalry among existing competitors. Industries where all five forces are favorable typically generate superior returns for established participants; industries where buyers have enormous bargaining power, substitutes are readily available, and entry barriers are low often deliver disappointing economics regardless of how skillfully individual companies are managed.

Alongside external analysis, understanding internal capabilities through frameworks such as the Resource-Based View of the firm allows strategists to identify core competencies — the unique combinations of skills, knowledge, processes, and assets that the organization possesses and competitors cannot easily replicate. Apple's product design and ecosystem integration, Toyota's lean manufacturing system, and Amazon's logistics and data infrastructure are all examples of core competencies that have generated sustained competitive advantage over many years. Identifying and investing in these distinctive capabilities while managing or outsourcing activities where the firm has no particular advantage is central to sound strategic decision-making.

Generic strategies, as described by Porter, provide three fundamental approaches to competitive positioning. Cost leadership involves achieving the lowest cost structure in the industry, enabling the firm to price competitively while maintaining acceptable margins — a strategy pursued effectively by companies such as Walmart in retail and Ryanair in aviation. Differentiation involves creating products or services that customers perceive as uniquely valuable and worth paying a premium price to obtain — the strategy of luxury brands, innovative technology companies, and premium service providers. Focus strategies apply either cost leadership or differentiation within a specific market niche rather than the broad market, serving a particular customer segment or geographic region with exceptional depth and precision.

Blue Ocean Strategy offers an alternative framework that challenges the conventional assumption of competition as a zero-sum game. Rather than fighting for share in existing overcrowded markets — what Kim and Mauborgne colorfully describe as blood-red oceans — companies can create entirely new market spaces by redefining industry boundaries, combining attributes from different industries, and delivering value innovations that appeal to previously untapped customer segments. Cirque du Soleil, which blended theatrical artistry with circus performance to create an entirely new entertainment category, represents perhaps the most frequently cited example of blue ocean thinking in practice.

Strategic alliances, joint ventures, and partnership ecosystems have become increasingly important as the pace of innovation outstrips the capacity of any single organization to develop all required capabilities internally. Technology companies partner with content providers, manufacturers collaborate with research universities, and retailers share logistics infrastructure with competitors to reduce costs and expand reach. The critical challenge in alliance management is balancing the value of collaboration with the risk of knowledge leakage, misaligned incentives, and dependency on partners over whom the firm has limited control.

Mergers and acquisitions represent the most dramatic form of strategic action, offering the potential for rapid capability acquisition, market share expansion, and synergy realization. However, research consistently demonstrates that the majority of acquisitions fail to create the value anticipated at the time of announcement, often because of cultural incompatibility, integration execution failures, or simply the price paid being too high relative to the value ultimately delivered. The discipline of strategic due diligence — rigorously examining whether an acquisition truly serves the long-term competitive interests of the acquiring firm beyond short-term financial considerations — separates enduring value creators from those who merely generate exciting headlines followed by quiet disappointment.

Scenario planning acknowledges that the future is genuinely uncertain and prepares organizations to perform across a range of possible environments rather than betting everything on a single forecast. By developing and regularly revisiting two to four plausible future scenarios that differ across key uncertainties, leadership teams build the mental flexibility and strategic repertoire needed to respond decisively as the future actually unfolds. In a world where geopolitical instability, technological disruption, and climate change are simultaneously reshaping the business environment, this capacity for strategic adaptability may prove to be the most durable competitive advantage of all.`,

`Digital transformation represents the most profound restructuring of business operations, customer relationships, and competitive dynamics since the Industrial Revolution. It is not simply a matter of adopting new technologies — organizations that approach it as a technology project invariably fail. True digital transformation requires reimagining business models, reshaping organizational culture, rebuilding workforce capabilities, and fundamentally reconceiving the relationship between a company and its customers in a world where the boundaries between physical and digital experience have effectively dissolved.

Cloud computing has been the foundational enabler of the digital revolution. By delivering computing power, storage, software, and advanced services through the internet on a pay-per-use basis, cloud platforms have eliminated the enormous upfront capital investments that previously restricted access to sophisticated technology infrastructure to only the largest and best-resourced organizations. A startup today can access the same quality of computing infrastructure as a global enterprise, simply by subscribing to services from providers such as Amazon Web Services, Microsoft Azure, or Google Cloud. This democratization of technology has dramatically reduced barriers to entry across virtually every industry, accelerating both innovation and competitive disruption simultaneously.

Artificial intelligence has moved from academic research to commercial reality with astonishing speed. Machine learning algorithms — systems that identify patterns in large datasets and improve their performance with experience — are now embedded in a remarkable range of business applications. Recommendation engines predict customer preferences with uncanny accuracy, increasing sales while reducing the friction of product discovery. Fraud detection systems analyze thousands of transaction variables in milliseconds, identifying suspicious patterns before financial losses occur. Predictive maintenance algorithms continuously monitor industrial equipment, detecting early signs of mechanical failure and enabling maintenance interventions that prevent costly production stoppages. Natural language processing enables conversational interfaces that allow customers to interact with systems in everyday language rather than formal commands.

Data has rightfully been called the oil of the twenty-first century, though the analogy understates its potential in one important respect: data, unlike oil, does not diminish when used. It can be refined, shared, and recombined to generate entirely new forms of value. Organizations that invest in data infrastructure — the tools, processes, and capabilities required to collect, store, analyze, and act on data systematically — develop decision-making capabilities that compound over time, creating widening gaps between themselves and less data-sophisticated competitors. The most advanced digital businesses have built data as a strategic asset that informs every significant decision, from product development priorities to pricing adjustments, supply chain optimization, and customer experience personalization.

The Internet of Things is creating unprecedented connectivity between the physical and digital worlds. Sensors embedded in manufacturing equipment, logistics vehicles, agricultural fields, medical devices, consumer products, and urban infrastructure are generating continuous streams of real-time operational data. This data enables new forms of value delivery — predictive services, performance-based pricing models, and remote management capabilities — while simultaneously creating new cybersecurity vulnerabilities that organizations must manage with increasing sophistication. Industrial IoT applications in manufacturing have demonstrated the potential to reduce equipment downtime by thirty percent or more, while consumer IoT applications are creating entirely new categories of personalized service and convenience.

Cybersecurity has become a board-level strategic priority rather than a technical afterthought. As organizations increasingly depend on digital systems for every critical function — from financial transactions and customer data management to supply chain coordination and operational control — the potential business impact of successful cyberattacks has grown to existential proportions. The most sophisticated threat actors include not only criminal organizations seeking financial gain but also state-sponsored groups conducting industrial espionage and infrastructure attacks. Effective cybersecurity requires a multilayered defense strategy combining technical controls, organizational processes, employee education, threat intelligence, and rapid incident response capabilities.

Platform business models represent perhaps the most structurally powerful expression of digital economics. Unlike traditional businesses that create and sell products or services, platform businesses facilitate interactions between multiple user groups, creating value through network effects — the phenomenon whereby each additional user makes the platform more valuable for all existing users. This dynamic allows successful platforms to achieve dominant market positions with remarkable speed, as evidenced by the rise of companies such as Airbnb, Uber, and Alibaba to global scale within a decade of founding. Understanding network effects, the strategies for building critical mass on both sides of a multi-sided market, and the competitive dynamics of winner-take-all platform markets has become essential knowledge for anyone seeking to navigate the digital economy.

Organizational agility — the capacity to sense environmental changes and rapidly reconfigure strategy, structure, and resources in response — has emerged as the critical organizational capability for competing in digital markets characterized by continuous disruption. Agile methodologies, originally developed for software development, are now being applied across entire organizations, replacing annual planning cycles and rigid hierarchies with shorter iteration cycles, cross-functional teams, and distributed decision-making authority. The organizations that are winning in the digital economy are not necessarily those with the largest resources or most established brands, but those with the cultural and structural capacity to learn, adapt, and execute with the speed that digital competition demands.`,
`Mergers and acquisitions represent the most consequential strategic transactions that senior executives and boards undertake. When executed with disciplined analysis, clear strategic rationale, and exceptional integration capability, M&A activity can create enormous shareholder value, rapidly expand market position, and acquire capabilities that would take years to develop organically. When pursued without adequate diligence, at excessive valuations, or without a credible integration plan, the same transactions destroy value just as dramatically — consuming management attention, eroding employee morale, and generating financial losses that take years to reverse.

The motivations for M&A activity are diverse and must be carefully examined for strategic coherence. Horizontal acquisitions — the purchase of a direct competitor — aim to achieve scale economies, eliminate excess industry capacity, and increase market share. Vertical integration involves acquiring companies at different points in the value chain, reducing dependency on external suppliers or capturing margins previously earned by intermediaries. Conglomerate acquisitions seek portfolio diversification across unrelated businesses, a rationale that has generally fallen from strategic favor as capital markets have become more efficient and focused competitors have repeatedly outperformed diversified conglomerates. Capability acquisitions — purchasing companies primarily to obtain their talent, technology, or proprietary processes — have become increasingly prevalent in knowledge-intensive industries where organic development timelines are incompatible with competitive urgency.

Due diligence is the systematic investigation of a target company prior to completing a transaction, and its quality frequently determines whether value is created or destroyed. Financial due diligence scrutinizes historical financial statements, analyzes the quality and sustainability of reported earnings, identifies contingent liabilities and off-balance-sheet obligations, and constructs independent projections of future performance under various scenarios. Legal due diligence reviews contracts, intellectual property ownership, regulatory compliance, litigation exposure, and governance structures that may constrain post-acquisition strategy. Commercial due diligence examines market size and dynamics, competitive positioning, customer relationships, and the defensibility of projected revenue growth assumptions. Technology due diligence assesses the architecture, scalability, security, and technical debt of software and systems assets. Cultural due diligence — perhaps the most frequently neglected but most consequential form — evaluates the compatibility of organizational values, management styles, and behavioral norms between acquirer and target.

Valuation methodology translates strategic assessment into financial terms, providing the quantitative basis for negotiating transaction price. Discounted cash flow analysis constructs an intrinsic value estimate by projecting the target's free cash flows over a multi-year forecast horizon and discounting them to present value at an appropriate risk-adjusted rate. Comparable company analysis benchmarks the target against publicly traded peers, applying market multiples of revenue, EBITDA, or earnings to derive an implied valuation range. Precedent transaction analysis examines prices paid in comparable historical acquisitions, capturing the control premium that buyers typically pay above market trading prices. Leveraged buyout analysis, used extensively by private equity firms, models the maximum price at which a transaction could generate an acceptable return to equity investors while servicing the substantial debt typically used to finance such transactions.

Synergy analysis is the process of identifying and quantifying the incremental value that the combined entity will generate above what the two businesses would achieve independently. Cost synergies — typically the more immediately realizable category — arise from eliminating duplicate functions, consolidating facilities, renegotiating supplier contracts at larger volumes, and rationalizing technology systems. Revenue synergies — which are harder to estimate reliably and take longer to materialize — emerge from cross-selling products and services to each other's customer bases, accelerating market expansion through combined distribution capabilities, and leveraging combined brand strength to enter new segments. Experienced acquirers apply meaningful discount rates to synergy estimates, recognizing that integration complexity, competitive responses, and employee disruption consistently produce actual synergy realization below initial projections.

Post-merger integration is where the actual value of an acquisition is won or lost, and it demands the same quality of planning, resourcing, and leadership attention as the deal process itself. Integration management offices coordinate hundreds of simultaneous workstreams across every functional area, managing interdependencies and resolving conflicts that emerge when two previously independent organizations attempt to become one. Cultural integration — aligning people around a shared identity, set of values, and ways of working — presents the greatest challenge and the greatest risk. Research by McKinsey and other institutions consistently identifies cultural incompatibility as the primary cause of value destruction in failed mergers. Organizations that invest in systematic cultural diagnostics, deliberate culture-building programs, and retention incentives for key talent from the acquired company significantly improve their probability of integration success.

The governance of M&A transactions requires rigorous board oversight throughout the process. Independent directors play a critical role in challenging management assumptions, ensuring that strategic rationale is genuinely compelling rather than merely ambitious, scrutinizing valuation methodology for optimism bias, and verifying that deal terms adequately protect shareholder interests. The history of corporate M&A contains numerous examples of transactions that appeared strategically logical, were enthusiastically championed by management, and were blessed by boards without adequate challenge — only to destroy significant shareholder value in the years following completion.`,

`International business operates in a world of extraordinary complexity, where the pursuit of global opportunity intersects with the realities of cultural difference, regulatory diversity, political risk, and macroeconomic volatility. Companies that navigate this complexity successfully unlock access to billions of new customers, diverse talent pools, specialized resources, and strategic partnerships that domestic markets simply cannot provide. Those that underestimate the challenges of operating across national boundaries, however, frequently discover that international expansion consumes resources and management attention far in excess of the returns it generates.

The decision to internationalize represents a fundamental strategic choice rather than a natural consequence of domestic success. Companies expand internationally to pursue multiple objectives: accessing new revenue streams in markets where their products or services are underrepresented, achieving economies of scale that reduce per-unit production costs through larger volumes, diversifying revenue exposure across economic cycles that may not be synchronized across different geographies, acquiring resources or capabilities available only in specific locations, and pre-empting competitors from establishing strong positions in strategically important markets. Understanding which of these motivations drives a particular expansion decision is essential for designing the right entry strategy and governance model.

Market entry strategies exist on a spectrum from low-commitment approaches that minimize risk while also limiting reward, to high-commitment modes that accept greater risk in pursuit of greater strategic control and financial return. Exporting — shipping products manufactured domestically to foreign customers — requires minimal investment in overseas infrastructure but limits market responsiveness and exposes the company to exchange rate risk and tariff barriers. Licensing and franchising arrangements grant foreign partners the right to produce or sell under the company's brand and using its proprietary systems in exchange for royalties, enabling rapid geographic expansion with limited capital outlay but creating significant risks around quality control and intellectual property protection. Joint ventures combine the resources, local market knowledge, and regulatory relationships of a foreign partner with the technology, capital, and management capabilities of the international entrant, offering a middle path that balances risk sharing with the inevitable tensions of divided control. Wholly owned subsidiaries — established either through greenfield investment or acquisition of an existing local company — provide maximum control and the full capture of financial returns but require the greatest commitment of capital, management resources, and organizational attention.

The PESTEL framework provides a systematic structure for analyzing the macro-environmental factors that shape business opportunities and risks in international markets. Political analysis examines government stability, regulatory philosophy, trade policy orientation, corruption levels, and the quality of legal institutions that protect property rights and enforce contracts. Economic analysis considers GDP growth trajectory, inflation dynamics, interest rate environment, income distribution, and consumer spending capacity. Social analysis explores demographic trends, cultural attitudes toward consumption and business, workforce characteristics, and the social norms that shape customer behavior. Technological analysis assesses digital infrastructure quality, technology adoption rates, and the competitive dynamics introduced by local technology companies. Environmental analysis evaluates climate-related regulatory requirements, resource availability, and the physical risks of extreme weather events to operations and supply chains. Legal analysis examines labor regulations, taxation structures, environmental compliance requirements, and the specific rules governing foreign business ownership in the target market.

Cultural intelligence — the capacity to function effectively across cultural differences — is perhaps the most underestimated competency in international business. Geert Hofstede's pioneering research identified systematic cultural dimensions along which countries vary significantly: power distance, describing the degree to which less powerful members of society accept hierarchical inequality; individualism versus collectivism, characterizing whether social identity derives primarily from personal achievement or group membership; uncertainty avoidance, measuring cultural comfort with ambiguity and novelty; and long-term versus short-term orientation, reflecting whether priorities tend toward patience and perseverance or immediate results. International managers who understand these dimensions and adapt their communication styles, negotiation approaches, and leadership behaviors accordingly are far more effective than those who assume that methods proven successful at home will transfer without modification to dramatically different cultural contexts.

Currency risk management is an inescapable responsibility for companies operating across multiple currency zones. Exchange rate movements that appear modest on a percentage basis can translate into material impacts on reported revenues, costs, and profits when multiplied across the scale of a global business. Companies manage this exposure through various hedging instruments — forward contracts, options, and currency swaps — that lock in exchange rates for future transactions, reducing earnings volatility in exchange for accepting some reduction in potential upside when exchange rate movements are favorable. Beyond financial hedging, operational hedging strategies — such as matching revenues and costs in the same currency, diversifying production across multiple geographies, or negotiating contracts denominated in stable reference currencies — provide structural protection against exchange rate risk that financial instruments alone cannot fully address.

Transfer pricing — the prices at which related entities within a multinational group transact with each other for goods, services, and intellectual property — has become one of the most contested and consequential issues in international tax management. Because multinational companies can theoretically shift profits toward low-tax jurisdictions by manipulating the prices charged between group entities, tax authorities in most major economies require that intercompany transactions be priced on arm's-length terms consistent with what unrelated parties would negotiate in comparable circumstances. Failure to maintain adequately documented, arm's-length transfer pricing exposes multinational companies to substantial tax assessments, penalties, and reputational risks that increasingly attract public and regulatory scrutiny in the current global environment of heightened focus on corporate tax accountability.

Trade policy dynamics — tariffs, import quotas, export subsidies, regulatory standards, and the network of bilateral and multilateral trade agreements that collectively determine the terms on which goods and services cross national boundaries — have become more volatile and unpredictable in recent years than at any point since the post-World War II establishment of the multilateral trading system. Companies with globally integrated supply chains face the challenge of designing supply chain architectures that can withstand trade policy disruptions through strategic sourcing diversification, regional manufacturing flexibility, and robust scenario planning processes that anticipate and prepare for adverse policy changes before they occur.`,

`We stand at an extraordinary inflection point in the evolution of business. The convergence of artificial intelligence, biotechnology, clean energy technology, and advanced materials science is simultaneously creating unprecedented opportunities and disrupting established business models with a speed and comprehensiveness that exceeds even the most ambitious forecasts of a decade ago. Business leaders who approach this moment with intellectual curiosity, strategic flexibility, and genuine commitment to creating value for all stakeholders — not only shareholders but employees, customers, communities, and the natural environment — will be best positioned to build organizations worthy of lasting respect and commercial success.

Leadership in this environment demands a substantially expanded conception of what the role requires. The industrial-era model of leadership as command and control — in which senior executives made decisions and junior employees executed instructions — is incompatible with the organizational requirements of operating effectively in knowledge-intensive, rapidly evolving competitive environments. When the most valuable work involves creativity, complex problem-solving, collaboration across disciplinary boundaries, and the generation of novel insights from ambiguous information, the people closest to each challenge typically possess knowledge and judgment that top management does not. Effective contemporary leadership creates the conditions in which this distributed intelligence can be fully expressed: establishing clear direction and shared values, ensuring adequate resources, removing organizational obstacles, and cultivating psychological safety — the belief that one can speak up with ideas, concerns, or mistakes without fear of punishment or embarrassment.

Emotional intelligence — the capacity to recognize, understand, and manage one's own emotions and to perceive and influence the emotional states of others — has emerged from decades of organizational research as a more powerful predictor of leadership effectiveness than conventional cognitive intelligence. Leaders with high emotional intelligence build stronger relationships, navigate conflict more constructively, inspire greater discretionary effort from their teams, and demonstrate the resilience required to maintain effectiveness under sustained pressure. Daniel Goleman's research identified self-awareness, self-regulation, motivation, empathy, and social skill as the five core components of emotional intelligence, each of which can be developed through deliberate practice and reflection.

Innovation leadership presents distinctive challenges that differ fundamentally from leading established operational excellence. The skills required to extract maximum efficiency from a known process are almost directly opposed to those required to navigate the exploration of genuinely uncertain possibilities. Managing paradox — sustaining operational efficiency in the core business while simultaneously cultivating the exploratory activities that will ensure future relevance — is described in management literature as ambidexterity, and achieving it requires organizational structures, incentive systems, and cultural norms that can support fundamentally different types of work simultaneously. Companies such as Amazon have navigated this challenge by maintaining the perpetual urgency, customer obsession, and experimental culture of a startup even as the core business has grown to global dominance.

Sustainability has transitioned from a reputational consideration on the margins of business strategy to a core dimension of competitive positioning, risk management, and stakeholder accountability. The scientific consensus on climate change, the measurable impacts of ecological degradation on supply chain reliability and regulatory environments, and the rapidly evolving expectations of institutional investors, employees, and consumers have collectively made environmental and social performance a mainstream business concern. ESG — Environmental, Social, and Governance — frameworks provide a structured vocabulary for measuring and communicating corporate sustainability performance, and the quality of ESG disclosures is increasingly scrutinized by institutional investors managing trillions of dollars in capital who recognize that companies with weak sustainability practices carry long-term risks that may not yet be visible in conventional financial metrics.

The circular economy represents perhaps the most transformative reimagining of business model design from a sustainability perspective. In contrast to the linear economy model that has dominated industrial production for two centuries — extract resources, manufacture products, use them, and discard them as waste — the circular economy designs products for longevity, reuse, remanufacturing, and material recovery, closing the loop between production and consumption. Companies that successfully implement circular business models simultaneously reduce material costs, eliminate waste disposal expenses, create new revenue streams from product-as-a-service arrangements, and demonstrate genuine environmental leadership. The transition to circularity requires deep changes in product design, supply chain configuration, customer relationship models, and financial structures — presenting significant complexity but also genuine competitive opportunities for pioneers willing to invest in the organizational transformation required.

The future of work is being simultaneously shaped by technological forces — automation, artificial intelligence, and remote collaboration tools — and demographic shifts, including generational transitions in workforce composition, changing career expectations, and the growing mobility of talent across geographic and organizational boundaries. Automation anxiety is real and legitimate: research suggests that a significant proportion of current occupational tasks can be automated with existing technology, and the pace of capability development in machine learning makes it likely that this proportion will grow substantially over the coming decade. However, historical evidence from previous waves of technological transformation suggests that automation tends to displace specific tasks rather than entire occupations, creating substantial new categories of work even as it makes others obsolete. The organizations and societies that navigate this transition most successfully will be those that invest heavily in continuous learning and reskilling, creating pathways for workers to develop capabilities that complement rather than compete with machine intelligence.

Stakeholder capitalism — the evolving philosophy that corporations bear responsibility not only to shareholders but to all groups that depend on and are affected by their activities — represents a fundamental reconception of the purpose of business that is reshaping governance practices, investment frameworks, and management priorities across the global economy. The Business Roundtable's 2019 Statement on the Purpose of a Corporation, signed by nearly 200 chief executives of America's largest companies, explicitly repudiated the Friedmanite doctrine of shareholder primacy that had dominated corporate governance thinking since the 1970s. While the practical implications of stakeholder capitalism remain contested and implementation is uneven, the direction of travel is clear: companies that create sustainable value for the full range of stakeholders they touch — delivering genuine benefit to customers, opportunity and dignity to employees, partnership to suppliers, prosperity to communities, and responsible stewardship of the natural environment — will earn the trust, loyalty, and social license to operate that sustainable commercial success ultimately requires.

The leaders who will build the organizations that matter most in the coming decades combine strategic sophistication with genuine ethical seriousness. They understand markets with analytical rigor and human beings with empathetic depth. They hold themselves and their organizations to high standards of performance and integrity simultaneously, recognizing that these are not competing demands but mutually reinforcing foundations of lasting excellence. They approach the extraordinary complexity and uncertainty of our historical moment not with anxiety but with the confidence that comes from continuous learning, intellectual honesty, and unwavering commitment to creating something genuinely valuable in the world.`
];

// ── Level Metadata ────────────────────────────────────────────────
var _engLevels = [
    { n:1,  title:'Starting Your Business Journey',             topic:'Entrepreneurship',         diff:'Beginner',       words:500,  color:'#00d4ff' },
    { n:2,  title:'Marketing Strategy and Consumer Behavior',   topic:'Marketing',                diff:'Elementary',     words:600,  color:'#00f5d4' },
    { n:3,  title:'Financial Planning and Capital Management',  topic:'Finance',                  diff:'Pre-Intermediate',words:700, color:'#4cc9f0' },
    { n:4,  title:'Human Resources and Organizational Culture', topic:'Human Resources',          diff:'Intermediate',   words:800,  color:'#9d4edd' },
    { n:5,  title:'Operations and Supply Chain Management',     topic:'Operations',               diff:'Intermediate',   words:900,  color:'#f77f00' },
    { n:6,  title:'Corporate Strategy and Competitive Advantage',topic:'Strategy',               diff:'Upper-Intermediate',words:1000,color:'#fcbf49' },
    { n:7,  title:'Digital Transformation and Technology Strategy',topic:'Digital Business',     diff:'Advanced',       words:1100, color:'#e63946' },
    { n:8,  title:'Mergers, Acquisitions, and Business Valuation',topic:'M&A',                   diff:'Advanced',       words:1200, color:'#a8dadc' },
    { n:9,  title:'International Business and Global Markets',  topic:'Global Business',          diff:'Proficient',     words:1300, color:'#457b9d' },
    { n:10, title:'Leadership, Innovation, and the Future of Business',topic:'Future of Business',diff:'Expert',        words:1400, color:'#d4af37' },
];

// ── Quiz Data (5 MCQ per level) ───────────────────────────────────
var _engQuiz = [
  // Level 1
  [
    { q:'What does an "entrepreneur" primarily do?', opts:['Manages government programs','Creates and runs new businesses','Provides loans to companies','Regulates markets'], ans:1, exp:'An entrepreneur identifies opportunities, takes risks, and builds businesses from scratch.' },
    { q:'A "business plan" is best described as:', opts:['A daily work schedule','A strategic document outlining goals and operations','A marketing flyer','An employee contract'], ans:1, exp:'A business plan is a written roadmap covering goals, market analysis, strategy, and financials.' },
    { q:'What does "market research" involve?', opts:['Buying stocks','Collecting data about customers and competition','Setting interest rates','Auditing accounts'], ans:1, exp:'Market research gathers data about customers, competitors, and industry trends to inform decisions.' },
    { q:'"Cash flow" refers to:', opts:['The number of sales transactions','Money moving in and out of a business','Employee satisfaction levels','Product inventory levels'], ans:1, exp:'Cash flow tracks the net movement of money; positive cash flow means more coming in than going out.' },
    { q:'A "startup" is typically characterized by:', opts:['Slow, steady growth','Being over 50 years old','High growth potential and innovation','Government ownership'], ans:2, exp:'Startups are new ventures designed for rapid growth, often with innovative products or business models.' },
  ],
  // Level 2
  [
    { q:'What does "market segmentation" mean?', opts:['Buying market shares','Dividing customers into groups by similar traits','Setting product prices','Firing underperforming staff'], ans:1, exp:'Segmentation groups customers by shared characteristics (age, needs, behavior) for targeted marketing.' },
    { q:'A "value proposition" explains:', opts:['Company tax strategy','How a product solves customer problems uniquely','Supply chain structure','Board governance policies'], ans:1, exp:'A value proposition clearly states why customers should choose your product over alternatives.' },
    { q:'"Brand positioning" refers to:', opts:['Placing ads in magazines','How customers perceive your brand relative to competitors','Where products are manufactured','Warehouse location strategy'], ans:1, exp:'Positioning shapes the mental image customers hold of your brand within the competitive landscape.' },
    { q:'The marketing "funnel" represents:', opts:['A factory production process','The customer journey from awareness to purchase','Financial investment planning','Inventory management flow'], ans:1, exp:'The funnel model tracks how prospects move through Awareness → Interest → Decision → Action stages.' },
    { q:'"Customer retention" focuses on:', opts:['Finding new customers','Keeping existing customers over time','Reducing product prices','Expanding into new markets'], ans:1, exp:'Retention strategies keep current customers loyal, which is typically more cost-effective than acquiring new ones.' },
  ],
  // Level 3
  [
    { q:'What does "ROI" stand for?', opts:['Rate of Inflation','Return on Investment','Risk of Insolvency','Revenue Over Income'], ans:1, exp:'ROI measures profitability: (Net Profit ÷ Investment Cost) × 100. A 200% ROI means you doubled your investment.' },
    { q:'"Working capital" refers to:', opts:['Office furniture value','Current assets minus current liabilities','Long-term investment returns','Employee wages'], ans:1, exp:'Working capital measures short-term liquidity: the difference between current assets and current liabilities.' },
    { q:'What is "EBITDA" used for?', opts:['Employee training hours','Measuring operational profitability excluding financing and accounting factors','Tracking customer satisfaction','Setting marketing budgets'], ans:1, exp:'EBITDA removes interest, taxes, depreciation, and amortization to compare operating performance across companies.' },
    { q:'"Equity financing" means:', opts:['Borrowing money from a bank','Raising capital by selling ownership shares','Deferring tax payments','Leasing equipment'], ans:1, exp:'Equity financing raises capital by selling shares; investors receive ownership stakes rather than debt repayment.' },
    { q:'A "balance sheet" shows:', opts:['Monthly sales figures','Assets, liabilities, and equity at a point in time','Employee headcount','Marketing campaign results'], ans:1, exp:'The balance sheet is a financial snapshot showing what a company owns (assets), owes (liabilities), and its net worth (equity).' },
  ],
  // Level 4
  [
    { q:'"Employee engagement" best describes:', opts:['Salary negotiation','Emotional commitment and enthusiasm employees have for their work','Number of working hours','Benefits package value'], ans:1, exp:'Engaged employees are motivated, productive, and aligned with organizational goals — not just satisfied, but committed.' },
    { q:'What is "360-degree feedback"?', opts:['Annual salary review','Performance evaluation from peers, subordinates, managers, and self','Customer satisfaction survey','Financial performance analysis'], ans:1, exp:'360-degree feedback collects input from all directions to give a comprehensive view of an employee\'s performance and behavior.' },
    { q:'"Succession planning" involves:', opts:['Planning product launches','Identifying and developing future leaders within the organization','Setting annual budgets','Expanding to new markets'], ans:1, exp:'Succession planning ensures leadership continuity by preparing internal candidates for critical roles.' },
    { q:'A high "employee turnover rate" indicates:', opts:['Strong company growth','Frequent job changes; many employees leaving','Increased customer satisfaction','Higher profit margins'], ans:1, exp:'High turnover means employees leave frequently, which is costly (hiring, training) and signals underlying issues.' },
    { q:'"Organizational culture" refers to:', opts:['Company size and structure','Shared values, beliefs, and behaviors that shape the work environment','Annual revenue targets','Office building design'], ans:1, exp:'Culture is the invisible force shaping how people behave, make decisions, and interact in an organization.' },
  ],
  // Level 5
  [
    { q:'What does "supply chain management" involve?', opts:['Managing customer complaints','Overseeing the flow of goods from raw materials to final customer','Setting advertising budgets','Conducting financial audits'], ans:1, exp:'SCM coordinates procurement, production, logistics, and delivery to ensure efficient flow of products to customers.' },
    { q:'"Just-in-time" (JIT) inventory means:', opts:['Delivering products exactly when needed to minimize inventory','Producing ahead of demand','Stockpiling large reserves','Rapid product development'], ans:0, exp:'JIT minimizes inventory by receiving goods exactly when needed in production, reducing storage costs and waste.' },
    { q:'A "bottleneck" in operations refers to:', opts:['A bottle-shaped storage container','A constraint that limits the overall capacity of a process','An employee conflict','A budget shortfall'], ans:1, exp:'A bottleneck is the slowest step in a process that restricts overall throughput and must be identified and resolved.' },
    { q:'"Six Sigma" is a methodology for:', opts:['Financial investment','Reducing defects and improving process quality','Marketing strategy development','HR recruitment'], ans:1, exp:'Six Sigma aims to reduce defects to fewer than 3.4 per million opportunities using the DMAIC framework.' },
    { q:'"Procurement" primarily involves:', opts:['Hiring employees','Acquiring goods and services from external suppliers','Managing customer relationships','Developing new products'], ans:1, exp:'Procurement covers sourcing, negotiating, and purchasing materials and services needed for business operations.' },
  ],
  // Level 6
  [
    { q:'Porter\'s Five Forces analyzes:', opts:['Employee motivation factors','Competitive forces shaping an industry\'s profitability','Social media marketing tactics','Financial reporting standards'], ans:1, exp:'Porter\'s Five Forces: Competitive rivalry, supplier power, buyer power, threat of new entrants, threat of substitutes.' },
    { q:'A "blue ocean strategy" involves:', opts:['Marine logistics operations','Creating new, uncontested market space rather than competing in existing markets','Deep-sea resource exploration','Color-coded inventory systems'], ans:1, exp:'Blue Ocean Strategy (Kim & Mauborgne) creates demand in uncontested market space, making competition irrelevant.' },
    { q:'"Core competency" refers to:', opts:['Basic employee skills','A company\'s unique strength that competitors cannot easily replicate','Annual performance target','Office facilities'], ans:1, exp:'Core competencies are distinct capabilities that give a company competitive advantage (e.g., Apple\'s design, Toyota\'s lean production).' },
    { q:'"Strategic alliance" means:', opts:['Government regulatory approval','An agreement between companies to pursue shared objectives while remaining independent','Employee union formation','Brand licensing deal'], ans:1, exp:'Strategic alliances allow companies to combine strengths without merging, sharing resources, knowledge, or market access.' },
    { q:'A company\'s "competitive advantage" is:', opts:['Its advertising budget','A unique factor allowing it to outperform rivals sustainably','Number of employees','Office location'], ans:1, exp:'Competitive advantage is a lasting edge over competitors through cost leadership, differentiation, or focus strategies.' },
  ],
  // Level 7
  [
    { q:'"Digital transformation" fundamentally means:', opts:['Buying new computers','Integrating digital technology into all aspects of business, changing how it operates and delivers value','Switching from paper to email','Hiring IT specialists'], ans:1, exp:'Digital transformation reimagines business models, processes, and culture — not just technology adoption.' },
    { q:'What is "cloud computing" in a business context?', opts:['Weather data analysis','Delivering computing services (storage, software, processing) over the internet','Social media marketing','Office building architecture'], ans:1, exp:'Cloud computing enables businesses to access IT resources on-demand, reducing capital expenditure and increasing flexibility.' },
    { q:'"Big data" refers to:', opts:['Large company headquarters','Extremely large datasets analyzed to reveal patterns, trends, and insights','High-capacity storage rooms','International market size'], ans:1, exp:'Big data involves vast volumes of structured and unstructured data processed to extract business intelligence and competitive insights.' },
    { q:'The "Internet of Things" (IoT) enables:', opts:['Online retail shopping','Physical devices connected to the internet to collect and exchange data','Social media networking','Video streaming services'], ans:1, exp:'IoT connects everyday objects (sensors, machines, devices) to collect real-time data, improving efficiency and decision-making.' },
    { q:'"Artificial intelligence" in business primarily helps with:', opts:['Human resource management only','Automating processes, analyzing data, and making predictions at scale','Designing office spaces','Writing legal contracts'], ans:1, exp:'AI enables automation, pattern recognition, predictive analytics, and personalization at scales impossible for human teams.' },
  ],
  // Level 8
  [
    { q:'In M&A, "due diligence" refers to:', opts:['Legal compliance training','Comprehensive investigation of a target company before completing a deal','Customer satisfaction research','Environmental impact assessment'], ans:1, exp:'Due diligence is the thorough analysis of financial, legal, operational, and strategic aspects of a target company before acquisition.' },
    { q:'What is a "hostile takeover"?', opts:['A customer complaint process','An acquisition attempted against the wishes of the target company\'s board','A labor union strike','A regulatory investigation'], ans:1, exp:'A hostile takeover occurs when an acquirer bypasses management and appeals directly to shareholders to purchase enough shares for control.' },
    { q:'"Synergy" in M&A refers to:', opts:['Employee conflicts','The idea that the combined company creates more value than the sum of its parts','Cost-cutting measures only','Regulatory approvals'], ans:1, exp:'M&A synergies include cost savings (eliminating redundancies) and revenue synergies (cross-selling, market access).' },
    { q:'A "leveraged buyout" (LBO) involves:', opts:['Buying office equipment on credit','Acquiring a company primarily using borrowed funds, often secured against the target\'s assets','Launching a new product line','Entering a foreign market'], ans:1, exp:'LBOs use significant debt to finance the acquisition, with the acquired company\'s assets and cash flows used to repay borrowings.' },
    { q:'DCF analysis in valuation stands for:', opts:['Direct Cost Formula','Discounted Cash Flow; projecting future cash flows and discounting them to present value','Debt-to-Capital Finance','Diversified Company Framework'], ans:1, exp:'DCF calculates a company\'s intrinsic value by estimating future free cash flows and discounting them at an appropriate rate.' },
  ],
  // Level 9
  [
    { q:'"Foreign direct investment" (FDI) involves:', opts:['Buying foreign currency','A company investing directly in business operations in another country','Purchasing government bonds abroad','Tourism spending overseas'], ans:1, exp:'FDI occurs when a company establishes or acquires business operations in a foreign country, seeking long-term economic interest.' },
    { q:'What is a "joint venture" in international business?', opts:['A shared office space','A business arrangement where two or more parties pool resources for a specific project','An import-export license','A currency exchange agreement'], ans:1, exp:'Joint ventures combine the strengths, resources, and market knowledge of multiple companies for a shared business purpose.' },
    { q:'The "PESTEL framework" analyzes:', opts:['Employee performance','Political, Economic, Social, Technological, Environmental, and Legal factors affecting business','Pricing strategy options','Supply chain risks'], ans:1, exp:'PESTEL is a strategic analysis tool examining macro-environmental factors that can impact business strategy and performance.' },
    { q:'"Comparative advantage" in trade theory means:', opts:['Having the best technology','The ability to produce a good at a lower relative opportunity cost than competitors','Being the largest economy','Having the lowest wages'], ans:1, exp:'Comparative advantage (Ricardo) explains why countries specialize in goods they produce most efficiently relative to other goods.' },
    { q:'What are "trade barriers"?', opts:['Physical walls between countries','Government measures restricting international trade (tariffs, quotas, regulations)','Language differences in business','Time zone challenges'], ans:1, exp:'Trade barriers include tariffs, import quotas, subsidies, and regulations that restrict the free flow of goods and services.' },
  ],
  // Level 10
  [
    { q:'"Stakeholder capitalism" prioritizes:', opts:['Shareholder returns only','Balancing the interests of all stakeholders — employees, customers, communities, and the environment','Government profit','Short-term financial gains'], ans:1, exp:'Stakeholder capitalism (popularized by the World Economic Forum) argues companies should serve all stakeholders, not just shareholders.' },
    { q:'ESG stands for:', opts:['Enterprise Software Growth','Environmental, Social, and Governance criteria for evaluating business responsibility','Economic Strategy Guidelines','Employee Satisfaction Grading'], ans:1, exp:'ESG criteria assess a company\'s ethical impact and sustainability practices, increasingly influencing investor decisions.' },
    { q:'"Disruptive innovation" (Christensen) describes:', opts:['Internal management conflict','Innovation that creates a new market by starting simple and cheap, eventually displacing incumbents','Incremental product improvement','Cost-cutting measures'], ans:1, exp:'Disruptive innovations start at the low end or create new markets, eventually displacing established products and leaders.' },
    { q:'"Organizational agility" in modern business means:', opts:['Fast employee promotion','The capacity to rapidly sense, respond, and adapt to environmental changes and opportunities','Reducing company headcount','Eliminating company hierarchy'], ans:1, exp:'Organizational agility combines speed and stability — quickly reconfiguring strategy, structure, and processes while maintaining efficiency.' },
    { q:'The "circular economy" business model focuses on:', opts:['Round-the-clock operations','Eliminating waste by keeping resources in use through reuse, repair, and recycling','Global market expansion','Digital business models only'], ans:1, exp:'The circular economy replaces the linear "take-make-dispose" model with closed-loop systems that regenerate value from waste.' },
  ],
];

// ── CSS Injection ─────────────────────────────────────────────────
function _engInjectCSS() {
    if (_eng.styleInjected) return;
    _eng.styleInjected = true;
    var style = document.createElement('style');
    style.textContent = `
    #english { padding: 0; overflow: hidden; }
    .eng-wrap { max-width: 1200px; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
    .eng-header { text-align: center; padding: 2rem 0 1rem; }
    .eng-header h1 { font-family: 'Orbitron', sans-serif; font-size: clamp(1.4rem, 4vw, 2.2rem); font-weight: 800;
        background: linear-gradient(135deg, #d4af37, #fff, #d4af37); -webkit-background-clip: text;
        -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.4rem; }
    .eng-header p { color: rgba(255,255,255,0.6); font-size: 0.9rem; }
    .eng-stats-bar { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin: 1rem 0 1.5rem; }
    .eng-stat { background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);
        border-radius: 12px; padding: 0.5rem 1.2rem; text-align: center; }
    .eng-stat-val { font-size: 1.3rem; font-weight: 800; color: #d4af37; }
    .eng-stat-lbl { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
    .eng-levels-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .eng-level-card { background: rgba(0,29,61,0.4); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 16px; padding: 1.4rem; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
    .eng-level-card:hover { transform: translateY(-4px); border-color: rgba(0,212,255,0.4);
        box-shadow: 0 15px 40px rgba(0,212,255,0.15); }
    .eng-level-card.done { border-color: rgba(0,245,212,0.4); }
    .eng-level-card.done::after { content: '✓'; position: absolute; top: 1rem; left: 1rem;
        background: rgba(0,245,212,0.2); border: 1px solid #00f5d4; color: #00f5d4;
        width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; font-size: 0.8rem; font-weight: 900; }
    .eng-level-num { font-family: 'Orbitron', sans-serif; font-size: 0.75rem; letter-spacing: 0.1em;
        margin-bottom: 0.5rem; }
    .eng-level-title { font-size: 1rem; font-weight: 700; margin-bottom: 0.3rem; }
    .eng-level-topic { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-bottom: 0.8rem; }
    .eng-level-meta { display: flex; gap: 0.8rem; font-size: 0.72rem; }
    .eng-badge { background: rgba(255,255,255,0.08); border-radius: 6px; padding: 0.2rem 0.6rem; }
    .eng-prog-bar { height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-top: 1rem; }
    .eng-prog-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }

    /* Reader */
    .eng-reader-wrap { display: flex; flex-direction: column; height: calc(100vh - 60px); overflow: hidden; }
    .eng-reader-top { padding: 0.8rem 1.5rem; background: rgba(0,0,0,0.4);
        border-bottom: 1px solid rgba(0,212,255,0.15); display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .eng-reader-title { font-weight: 700; font-size: 0.95rem; flex: 1; min-width: 150px; }
    .eng-read-progress { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: rgba(255,255,255,0.6); }
    .eng-read-bar { width: 120px; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
    .eng-read-fill { height: 100%; background: linear-gradient(90deg, #00d4ff, #d4af37); border-radius: 2px; transition: width 0.3s; }
    .eng-controls { display: flex; align-items: center; gap: 0.5rem; }
    .eng-btn { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3);
        border-radius: 8px; color: #fff; padding: 0.4rem 0.8rem; cursor: pointer;
        font-size: 0.8rem; transition: all 0.2s; display: flex; align-items: center; gap: 0.4rem; }
    .eng-btn:hover { background: rgba(0,212,255,0.25); border-color: #00d4ff; }
    .eng-btn.primary { background: linear-gradient(135deg,#00d4ff,#0084ff); border-color: transparent; font-weight: 700; }
    .eng-btn.danger { background: rgba(255,0,110,0.15); border-color: rgba(255,0,110,0.4); }
    .eng-speed-wrap { display: flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; color: rgba(255,255,255,0.6); }
    .eng-speed-wrap input[type=range] { width: 80px; accent-color: #d4af37; }

    .eng-scroll-area { flex: 1; overflow-y: auto; padding: 2rem clamp(1rem,5vw,4rem);
        scroll-behavior: auto; position: relative; }
    .eng-scroll-area::-webkit-scrollbar { width: 4px; }
    .eng-scroll-area::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius: 2px; }
    .eng-text-body { max-width: 800px; margin: 0 auto; font-size: clamp(1rem, 2vw, 1.15rem);
        line-height: 2; color: rgba(255,255,255,0.88); font-family: 'Georgia', serif; }
    .eng-text-body p { margin-bottom: 1.4em; }

    .eng-w { cursor: pointer; transition: background 0.15s; border-radius: 3px; padding: 0 1px; }
    .eng-w:hover { background: rgba(255,255,255,0.12); }
    .eng-term { color: #d4af37; font-weight: 600; border-bottom: 1px dashed rgba(212,175,55,0.5); }
    .eng-term:hover { background: rgba(212,175,55,0.15); }
    .eng-learned { background: rgba(0,245,212,0.1) !important; }

    /* Word Popup */
    .eng-popup { position: fixed; z-index: 9999; background: rgba(0,10,30,0.97);
        border: 1px solid rgba(0,212,255,0.4); border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,212,255,0.1);
        width: min(360px, 92vw); max-height: 75vh; overflow-y: auto;
        backdrop-filter: blur(20px); display: none; padding: 1.2rem; }
    @media(max-width:640px) {
        .eng-popup { position: fixed !important; left: 0 !important; right: 0 !important;
            bottom: 0 !important; top: auto !important; width: 100% !important;
            border-radius: 20px 20px 0 0; max-height: 70vh; }
    }
    .eng-popup-word { font-size: 1.4rem; font-weight: 900; color: #d4af37; margin-bottom: 0.3rem; }
    .eng-popup-pos { font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-bottom: 0.8rem; }
    .eng-popup-section { margin-bottom: 0.8rem; }
    .eng-popup-label { font-size: 0.68rem; letter-spacing: 0.1em; color: #00d4ff;
        text-transform: uppercase; margin-bottom: 0.2rem; font-weight: 700; }
    .eng-popup-text { font-size: 0.85rem; line-height: 1.6; color: rgba(255,255,255,0.85); }
    .eng-popup-ar { color: rgba(255,255,255,0.7); font-family: 'Tajawal',sans-serif; direction: rtl; }
    .eng-popup-ex { color: rgba(255,255,255,0.6); font-style: italic; font-size: 0.82rem; }
    .eng-popup-close { position: absolute; top: 0.8rem; left: 0.8rem; background: rgba(255,255,255,0.1);
        border: none; color: #fff; width: 26px; height: 26px; border-radius: 50%;
        cursor: pointer; font-size: 0.8rem; }
    .eng-mark-btn { width: 100%; margin-top: 0.8rem; background: rgba(0,245,212,0.1);
        border: 1px solid rgba(0,245,212,0.3); border-radius: 8px; color: #00f5d4;
        padding: 0.5rem; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
    .eng-mark-btn:hover { background: rgba(0,245,212,0.2); }
    .eng-mark-btn.marked { background: rgba(0,245,212,0.2); }
    /* Tabbed popup v2 */
    .eng-tabs { display: flex; gap: 4px; margin-bottom: 0.8rem; border-bottom: 1px solid rgba(0,212,255,0.2); padding-bottom: 6px; }
    .eng-tab-btn { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 8px; color: rgba(255,255,255,0.5); padding: 5px 4px; cursor: pointer;
        font-size: 0.7rem; transition: all 0.2s; white-space: nowrap; }
    .eng-tab-btn:hover { background: rgba(0,212,255,0.1); color: #00d4ff; }
    .eng-tab-btn.eng-tab-active { background: rgba(0,212,255,0.15); border-color: rgba(0,212,255,0.5); color: #00d4ff; }
    .eng-tab-pane { animation: eng-fadein 0.2s ease; }
    @keyframes eng-fadein { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
    .eng-tag-row { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
    .eng-tag { font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; }
    .eng-tag-syn { background: rgba(0,212,255,0.12); color: #00d4ff; border: 1px solid rgba(0,212,255,0.3); }
    .eng-tag-ant { background: rgba(255,80,80,0.1); color: #ff6b6b; border: 1px solid rgba(255,80,80,0.3); }
    .eng-tag-fam { background: rgba(212,175,55,0.12); color: #d4af37; border: 1px solid rgba(212,175,55,0.3); }
    .eng-phonetic { color: rgba(255,255,255,0.45); font-size: 0.75rem; cursor: pointer; margin-left: 6px; }
    .eng-phonetic:hover { color: #d4af37; }
    .eng-diff-stars { letter-spacing: 2px; font-size: 0.8rem; }
    .eng-popup-header { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 0.6rem; }

    /* Quiz */
    .eng-quiz-wrap { max-width: 700px; margin: 0 auto; padding: 2rem 1rem; }
    .eng-quiz-q { font-size: 1.05rem; font-weight: 700; margin-bottom: 1.2rem; line-height: 1.6; }
    .eng-quiz-opts { display: flex; flex-direction: column; gap: 0.6rem; }
    .eng-quiz-opt { background: rgba(0,29,61,0.4); border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px; padding: 0.9rem 1.1rem; cursor: pointer; transition: all 0.2s;
        font-size: 0.9rem; text-align: right; direction: ltr; }
    .eng-quiz-opt:hover:not(.disabled) { border-color: #00d4ff; background: rgba(0,212,255,0.08); }
    .eng-quiz-opt.correct { border-color: #00f5d4; background: rgba(0,245,212,0.1); color: #00f5d4; }
    .eng-quiz-opt.wrong { border-color: #ff006e; background: rgba(255,0,110,0.1); color: #ff6690; }
    .eng-quiz-opt.disabled { cursor: default; }
    .eng-quiz-exp { margin-top: 1rem; padding: 0.9rem; background: rgba(0,212,255,0.06);
        border-left: 3px solid #00d4ff; border-radius: 8px; font-size: 0.85rem;
        color: rgba(255,255,255,0.8); display: none; }
    .eng-quiz-nav { display: flex; justify-content: space-between; align-items: center;
        margin-top: 1.5rem; gap: 1rem; }
    .eng-quiz-score-bar { display: flex; gap: 4px; margin-bottom: 1.5rem; }
    .eng-quiz-dot { width: 30px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); }
    .eng-quiz-dot.correct { background: #00f5d4; }
    .eng-quiz-dot.wrong { background: #ff006e; }
    .eng-complete-wrap { text-align: center; padding: 2rem 1rem; }
    .eng-complete-score { font-size: 4rem; font-weight: 900; font-family: 'Orbitron',sans-serif;
        background: linear-gradient(135deg,#d4af37,#fff); -webkit-background-clip:text;
        -webkit-text-fill-color:transparent; background-clip:text; }
    .eng-complete-stars { font-size: 2rem; margin: 0.5rem 0 1rem; }
    .eng-back-btn { background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.3);
        border-radius: 10px; color: #fff; padding: 0.6rem 1.2rem; cursor: pointer;
        font-size: 0.85rem; transition: all 0.2s; }
    .eng-back-btn:hover { background: rgba(0,212,255,0.2); }
    `;
    document.head.appendChild(style);
}

// ── Text tokenizer → HTML with clickable words ────────────────────
function _engTokenize(text) {
    var html = [];
    // Split on word boundaries, keeping whitespace + punctuation
    var parts = text.split(/(\r?\n\r?\n|\r?\n)/);
    parts.forEach(function(block) {
        if (/^\r?\n\r?\n$/.test(block) || block === '') {
            html.push('<p>');
            return;
        }
        if (/^\r?\n$/.test(block)) {
            html.push(' ');
            return;
        }
        // Tokenize words in block
        var tokens = block.split(/(\s+)/);
        tokens.forEach(function(tok) {
            if (/^\s+$/.test(tok)) { html.push(tok); return; }
            // Extract leading punc / word / trailing punc
            var m = tok.match(/^([^a-zA-Z]*)([a-zA-Z''-]*)([^a-zA-Z]*)$/);
            if (!m || !m[2]) { html.push(_escH(tok)); return; }
            var pre = m[1], word = m[2], post = m[3];
            var key = word.toLowerCase().replace(/['''-]/g, '');
            var isTerm = !!_engDict[key];
            var cls = isTerm ? 'eng-w eng-term' : 'eng-w';
            html.push(_escH(pre) + '<span class="' + cls + '" data-w="' + _escH(key) + '">' + _escH(word) + '</span>' + _escH(post));
        });
    });
    // Wrap in paragraphs
    var result = html.join('');
    // Replace <p> markers (we inserted them for double newlines)
    result = '<p>' + result.replace(/<p>/g, '</p><p>') + '</p>';
    return result;
}

function _escH(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Main render: Level Selection ──────────────────────────────────
function renderEnglishCenter() {
    _engInjectCSS();
    var section = document.getElementById('english');
    var totalDone = Object.keys(_eng.progress).filter(function(k){ return _eng.progress[k] && _eng.progress[k].done; }).length;
    var totalWords = _eng.learnedWords.size;
    var totalXP = Object.values(_eng.progress).reduce(function(a,p){ return a + (p.xp || 0); }, 0);

    section.innerHTML = '<div class="eng-wrap">' +
        '<div class="eng-header">' +
        '<h1><i class="fas fa-graduation-cap" style="margin-left:0.5rem"></i> Business English Learning Center</h1>' +
        '<p>10 مستويات متدرجة من Beginner إلى Expert · اقرأ، تعلم، واختبر نفسك</p>' +
        '</div>' +
        '<div class="eng-stats-bar">' +
        '<div class="eng-stat"><div class="eng-stat-val">' + totalDone + '/10</div><div class="eng-stat-lbl">Levels Completed</div></div>' +
        '<div class="eng-stat"><div class="eng-stat-val">' + totalWords + '</div><div class="eng-stat-lbl">Words Learned</div></div>' +
        '<div class="eng-stat"><div class="eng-stat-val">' + totalXP + '</div><div class="eng-stat-lbl">XP Earned</div></div>' +
        '<div class="eng-stat"><div class="eng-stat-val">🔥 ' + _eng.streak + '</div><div class="eng-stat-lbl">Day Streak</div></div>' +
        '</div>' +
        (typeof pcOpen === 'function' ? '<div style="display:flex;gap:10px;margin-bottom:1.2rem;flex-wrap:wrap">' +
            '<button class="eng-btn" style="flex:1;min-width:180px;background:rgba(157,78,221,0.12);border-color:rgba(157,78,221,0.4);color:#c084fc" onclick="pcOpen()">' +
            '🎙️ Pronunciation Coach</button>' +
            '</div>' : '') +
        '<div class="eng-levels-grid">' +
        _engLevels.map(function(lv, i) {
            var prog = _eng.progress[i] || {};
            var done = prog.done;
            var score = prog.score !== undefined ? prog.score : null;
            var pct = prog.pct || 0;
            return '<div class="eng-level-card' + (done ? ' done' : '') + '" onclick="_engOpenLevel(' + i + ')" style="--lc:' + lv.color + '">' +
                '<div class="eng-level-num" style="color:' + lv.color + '">LEVEL ' + lv.n + ' — ' + lv.diff.toUpperCase() + '</div>' +
                '<div class="eng-level-title">' + lv.title + '</div>' +
                '<div class="eng-level-topic"><i class="fas fa-bookmark" style="margin-left:4px;color:' + lv.color + '"></i>' + lv.topic + '</div>' +
                '<div class="eng-level-meta">' +
                '<span class="eng-badge"><i class="fas fa-font" style="margin-left:4px"></i>' + lv.words + ' words</span>' +
                (score !== null ? '<span class="eng-badge" style="color:#d4af37">Quiz: ' + score + '/5</span>' : '') +
                '</div>' +
                '<div class="eng-prog-bar"><div class="eng-prog-fill" style="width:' + pct + '%;background:' + lv.color + '"></div></div>' +
                '</div>';
        }).join('') +
        '</div></div>';

    // popup overlay
    if (!document.getElementById('eng-popup')) {
        var pop = document.createElement('div');
        pop.id = 'eng-popup';
        pop.className = 'eng-popup';
        document.body.appendChild(pop);
    }
}

// ── Open Level → Reader ───────────────────────────────────────────
function _engOpenLevel(i) {
    _eng.level = i;
    _eng.startTime = Date.now();
    _eng.scrolling = false;
    if (_eng._raf) cancelAnimationFrame(_eng._raf);
    _engUpdateStreak();

    var lv = _engLevels[i];
    var rawText = _engTexts[i];
    var textHTML = _engTokenize(rawText);

    var section = document.getElementById('english');
    section.innerHTML =
        '<div class="eng-reader-wrap">' +
        '<div class="eng-reader-top">' +
        '<button class="eng-btn" onclick="if(typeof vrDestroy===\'function\')vrDestroy();renderEnglishCenter()"><i class="fas fa-arrow-right"></i> العودة</button>' +
        '<div class="eng-reader-title" style="color:' + lv.color + '">Level ' + lv.n + ': ' + lv.title + '</div>' +
        '<div class="eng-read-progress"><div class="eng-read-bar"><div class="eng-read-fill" id="eng-rfill" style="width:0%"></div></div><span id="eng-rpct">0%</span></div>' +
        '<div class="eng-controls">' +
        '<div class="eng-speed-wrap"><i class="fas fa-tachometer-alt"></i>' +
        '<input type="range" id="eng-speed" min="1" max="30" value="6" oninput="_engSetSpeed(this.value)" title="Reading speed">' +
        '<span id="eng-speed-lbl">Normal</span></div>' +
        '<button class="eng-btn primary" id="eng-btn-play" onclick="_engPlay()"><i class="fas fa-play"></i> تشغيل</button>' +
        '<button class="eng-btn danger" id="eng-btn-pause" onclick="_engPause()" style="display:none"><i class="fas fa-pause"></i> إيقاف</button>' +
        '<button class="eng-btn" onclick="_engReset()"><i class="fas fa-undo"></i></button>' +
        '</div>' +
        '</div>' +
        '<div class="eng-scroll-area" id="eng-scroll-area" onscroll="_engOnScroll()">' +
        '<div class="eng-text-body" id="eng-text-body">' + textHTML + '</div>' +
        '<div style="height:30vh"></div>' +
        '</div>' +
        '</div>';

    // Word click delegation
    document.getElementById('eng-text-body').addEventListener('click', function(e) {
        var span = e.target.closest('.eng-w');
        if (!span) return;
        _engShowPopup(span.dataset.w, e.clientX, e.clientY, span);
    });

    // Activate AI Voice Reader
    if (typeof vrInit === 'function') vrInit(i);
}

// ── Auto-scroll controls ──────────────────────────────────────────
function _engPlay() {
    if (_eng.scrolling) return;
    _eng.scrolling = true;
    document.getElementById('eng-btn-play').style.display = 'none';
    document.getElementById('eng-btn-pause').style.display = 'flex';
    var area = document.getElementById('eng-scroll-area');
    function step() {
        if (!_eng.scrolling) return;
        area.scrollTop += _eng.speed;
        _engUpdateReadProgress(area);
        if (area.scrollTop >= area.scrollHeight - area.clientHeight - 2) {
            _eng.scrolling = false;
            _engLevelRead();
            return;
        }
        _eng._raf = requestAnimationFrame(step);
    }
    _eng._raf = requestAnimationFrame(step);
}

function _engPause() {
    _eng.scrolling = false;
    cancelAnimationFrame(_eng._raf);
    document.getElementById('eng-btn-play').style.display = 'flex';
    document.getElementById('eng-btn-pause').style.display = 'none';
}

function _engReset() {
    _engPause();
    var area = document.getElementById('eng-scroll-area');
    area.scrollTop = 0;
    _engUpdateReadProgress(area);
}

function _engOnScroll() {
    var area = document.getElementById('eng-scroll-area');
    _engUpdateReadProgress(area);
}

function _engUpdateReadProgress(area) {
    var max = area.scrollHeight - area.clientHeight;
    var pct = max > 0 ? Math.min(100, Math.round((area.scrollTop / max) * 100)) : 0;
    var fill = document.getElementById('eng-rfill');
    var pctEl = document.getElementById('eng-rpct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    // Save progress
    if (!_eng.progress[_eng.level]) _eng.progress[_eng.level] = {};
    _eng.progress[_eng.level].pct = pct;
    if (pct % 10 === 0) _engSave();
}

function _engSetSpeed(val) {
    val = parseFloat(val);
    _eng.speed = val * 0.1;
    var labels = { 1:'Very Slow', 5:'Slow', 10:'Normal', 18:'Fast', 25:'Very Fast', 30:'Max' };
    var lbl = 'Normal';
    Object.keys(labels).forEach(function(k) { if (val >= parseInt(k)) lbl = labels[k]; });
    var el = document.getElementById('eng-speed-lbl');
    if (el) el.textContent = lbl;
}

// ── Word popup (tabbed v2) ─────────────────────────────────────────
function _engShowPopup(word, cx, cy, span) {
    var popup = document.getElementById('eng-popup');
    if (!popup) return;

    // Sanitize: prevent XSS if word somehow contains special chars
    var safeWord = String(word).replace(/[<>"'`]/g, '');
    var isLearned = _eng.learnedWords.has(safeWord);

    // Lookup: BELC v2 dict → legacy dict
    var entry = (typeof window._belcDictLookup === 'function')
        ? window._belcDictLookup(safeWord)
        : (_engDict[safeWord] || null);

    var closeBtn = '<button class="eng-popup-close" onclick="document.getElementById(\'eng-popup\').style.display=\'none\'">×</button>';
    var markBtn  = '<button class="eng-mark-btn' + (isLearned ? ' marked' : '') + '" onclick="_engMarkWord(\'' + safeWord + '\')">' +
                   (isLearned ? '✓ Learned' : '+ Mark as Learned') + '</button>';

    function stars(d) {
        var s = '<span class="eng-diff-stars">';
        for (var i = 1; i <= 5; i++) s += '<span style="color:' + (i <= d ? '#f0b429' : 'rgba(255,255,255,0.18)') + '">★</span>';
        return s + '</span>';
    }
    function tags(arr, cls) {
        return arr.map(function(t) { return '<span class="eng-tag ' + cls + '">' + t + '</span>'; }).join('');
    }

    if (!entry) {
        popup.innerHTML = closeBtn +
            '<div class="eng-popup-word">' + safeWord + '</div>' +
            '<div class="eng-popup-section" id="eng-ai-def-area">' +
                '<div class="eng-popup-text" style="color:rgba(255,255,255,0.45);font-style:italic;font-size:0.82rem">Not in dictionary.</div>' +
                '<button class="eng-tab-btn" style="margin-top:8px;width:100%" onclick="_engAIDefine(\'' + safeWord + '\')" id="eng-ai-btn">✨ Generate AI Definition</button>' +
            '</div>' + markBtn;
    } else {
        var ph = entry.phonetic || '';
        var phHtml = ph ? '<span class="eng-phonetic" onclick="_engSpeak(\'' + safeWord + '\')" title="Play pronunciation">' + ph + ' 🔊</span>'
                        : '<span class="eng-phonetic" onclick="_engSpeak(\'' + safeWord + '\')" title="Play pronunciation">🔊</span>';

        var hasSyn = entry.syn && entry.syn.length;
        var hasAnt = entry.ant && entry.ant.length;
        var hasFamily = entry.family && entry.family.length;
        var hasCtx = !!entry.ctx;
        var hasArEx = !!entry.ar_ex;

        // Tab 1 — Definition
        var defPane = '<div class="eng-tab-pane" id="etab-def">' +
            '<div class="eng-popup-header">' +
                '<span style="font-size:0.72rem;color:rgba(255,255,255,0.4);background:rgba(255,255,255,0.08);padding:1px 8px;border-radius:10px">' + (entry.pos || 'noun') + '</span>' +
                phHtml +
                (entry.difficulty ? stars(entry.difficulty) : '') +
            '</div>' +
            '<div class="eng-popup-section"><div class="eng-popup-text">' + entry.en + '</div></div>' +
            '<div class="eng-popup-section"><div class="eng-popup-label">المعنى</div>' +
            '<div class="eng-popup-text eng-popup-ar">' + entry.ar + '</div></div>' +
            '</div>';

        // Tab 2 — Examples
        var exPane = '<div class="eng-tab-pane" id="etab-ex" style="display:none">' +
            '<div class="eng-popup-section"><div class="eng-popup-label">English</div>' +
            '<div class="eng-popup-text eng-popup-ex">' + entry.ex + '</div></div>' +
            (hasArEx ? '<div class="eng-popup-section"><div class="eng-popup-label">بالعربية</div>' +
            '<div class="eng-popup-text eng-popup-ar">' + entry.ar_ex + '</div></div>' : '') +
            '</div>';

        // Tab 3 — Usage
        var useContent = '';
        if (hasCtx) useContent += '<div class="eng-popup-section"><div class="eng-popup-label">Business Context</div>' +
            '<div class="eng-popup-text" style="font-size:0.8rem;color:rgba(255,255,255,0.65)">' + entry.ctx + '</div></div>';
        if (hasSyn) useContent += '<div class="eng-popup-section"><div class="eng-popup-label">Synonyms</div>' +
            '<div class="eng-tag-row">' + tags(entry.syn, 'eng-tag-syn') + '</div></div>';
        if (hasAnt) useContent += '<div class="eng-popup-section"><div class="eng-popup-label">Antonyms</div>' +
            '<div class="eng-tag-row">' + tags(entry.ant, 'eng-tag-ant') + '</div></div>';
        if (hasFamily) useContent += '<div class="eng-popup-section"><div class="eng-popup-label">Word Family</div>' +
            '<div class="eng-tag-row">' + tags(entry.family, 'eng-tag-fam') + '</div></div>';
        if (!useContent) useContent = '<div class="eng-popup-text" style="color:rgba(255,255,255,0.35);font-size:0.8rem">No additional usage data.</div>';
        var usePane = '<div class="eng-tab-pane" id="etab-use" style="display:none">' + useContent + '</div>';

        var tabBar = '<div class="eng-tabs">' +
            '<button class="eng-tab-btn eng-tab-active" onclick="_engTab(this,\'def\')">📖 Definition</button>' +
            '<button class="eng-tab-btn" onclick="_engTab(this,\'ex\')">💬 Examples</button>' +
            '<button class="eng-tab-btn" onclick="_engTab(this,\'use\')">🔗 Usage</button>' +
            '</div>';

        popup.innerHTML = closeBtn +
            '<div class="eng-popup-word">' + safeWord + '</div>' +
            tabBar + defPane + exPane + usePane + markBtn;
    }

    popup.style.display = 'block';
    var isMobile = window.innerWidth < 640;
    if (!isMobile) {
        var pw = 380, ph2 = 460;
        var x = cx + 12, y = cy + 12;
        if (x + pw > window.innerWidth - 10) x = cx - pw - 12;
        if (y + ph2 > window.innerHeight - 10) y = Math.max(10, window.innerHeight - ph2 - 10);
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
    }

    if (span) {
        document.querySelectorAll('.eng-w.eng-active').forEach(function(el) { el.classList.remove('eng-active'); });
        span.classList.add('eng-active');
    }
}

// Tab switcher
function _engTab(btn, tab) {
    var popup = document.getElementById('eng-popup');
    if (!popup) return;
    popup.querySelectorAll('.eng-tab-btn').forEach(function(b) { b.classList.remove('eng-tab-active'); });
    btn.classList.add('eng-tab-active');
    popup.querySelectorAll('.eng-tab-pane').forEach(function(p) { p.style.display = 'none'; });
    var pane = popup.querySelector('#etab-' + tab);
    if (pane) { pane.style.display = 'block'; pane.style.animation = 'none'; void pane.offsetWidth; pane.style.animation = ''; }
}

// Speak word via Web Speech API
function _engSpeak(word) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US'; u.rate = 0.85;
    speechSynthesis.speak(u);
}

// AI-generate definition for unknown words
function _engAIDefine(word) {
    var btn = document.getElementById('eng-ai-btn');
    var area = document.getElementById('eng-ai-def-area');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating…'; }

    var prompt = 'Define this business English term concisely. Reply ONLY as JSON (no markdown):\n{"en":"1-2 sentence definition","ar":"المعنى","ar_ex":"مثال عربي","ex":"English example","pos":"noun|verb|adj","ctx":"business context","syn":["s1","s2"],"ant":["a1"],"phonetic":"/fəˈnetɪk/","difficulty":3}\n\nTerm: "' + word + '"';

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
        try { var m = raw.match(/\{[\s\S]*\}/); json = JSON.parse(m ? m[0] : raw); } catch(e) {}
        if (json && json.en) {
            try { localStorage.setItem('belc.dict.' + word, JSON.stringify(json)); } catch(e2) {}
            if (area) {
                area.innerHTML = '<div class="eng-popup-section"><div class="eng-popup-text">' + json.en + '</div></div>' +
                    '<div class="eng-popup-section"><div class="eng-popup-label">المعنى</div><div class="eng-popup-text eng-popup-ar">' + json.ar + '</div></div>' +
                    (json.ex ? '<div class="eng-popup-section"><div class="eng-popup-label">Example</div><div class="eng-popup-text eng-popup-ex">' + json.ex + '</div></div>' : '') +
                    '<div style="font-size:0.68rem;color:rgba(255,255,255,0.3);margin-top:4px">✨ AI generated</div>';
            }
        } else {
            if (btn) { btn.disabled = false; btn.textContent = '✨ Retry'; }
        }
    })
    .catch(function() { if (btn) { btn.disabled = false; btn.textContent = '✨ Retry'; } });
}

function _engMarkWord(word) {
    var was = _eng.learnedWords.has(word);
    if (was) { _eng.learnedWords.delete(word); }
    else {
        _eng.learnedWords.add(word);
        if (typeof addXP === 'function') addXP(2);
    }
    _engSave();
    // Re-render popup button
    var btn = document.querySelector('.eng-mark-btn');
    if (btn) { btn.textContent = was ? '+ Mark as Learned' : '✓ Learned'; btn.classList.toggle('marked', !was); }
    // Highlight all instances in text
    document.querySelectorAll('[data-w="' + word + '"]').forEach(function(el) {
        el.classList.toggle('eng-learned', !was);
    });
}

// ── Level complete → start quiz ───────────────────────────────────
function _engLevelRead() {
    var elapsed = Math.round((Date.now() - _eng.startTime) / 1000);
    if (!_eng.progress[_eng.level]) _eng.progress[_eng.level] = {};
    _eng.progress[_eng.level].pct = 100;
    _eng.progress[_eng.level].readTime = elapsed;
    _engSave();
    if (typeof addXP === 'function') addXP(50);
    if (typeof showToast === 'function') showToast('🎉 Reading complete! Starting quiz...', 'xp-toast');
    setTimeout(_engStartQuiz, 1500);
}

// ── Quiz ──────────────────────────────────────────────────────────
function _engStartQuiz() {
    _eng.quizQ = 0;
    _eng.quizScore = 0;
    _eng.quizAnswered = false;
    _engRenderQuiz();
}

function _engRenderQuiz() {
    var section = document.getElementById('english');
    var lv = _engLevels[_eng.level];
    var qs = _engQuiz[_eng.level];
    var q = qs[_eng.quizQ];
    var dots = qs.map(function(_, qi) {
        var prog = _eng.progress[_eng.level] || {};
        var ans = prog.quizAnswers || [];
        var cls = qi < _eng.quizQ ? (ans[qi] ? 'correct' : 'wrong') : '';
        return '<div class="eng-quiz-dot ' + cls + '"></div>';
    }).join('');

    section.innerHTML =
        '<div class="eng-quiz-wrap">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">' +
        '<button class="eng-back-btn" onclick="renderEnglishCenter()"><i class="fas fa-arrow-right"></i> الخروج</button>' +
        '<div style="font-family:\'Orbitron\',sans-serif;font-size:0.75rem;color:#d4af37">QUIZ — Level ' + lv.n + '</div>' +
        '<div style="font-size:0.8rem;color:rgba(255,255,255,0.5)">السؤال ' + (_eng.quizQ + 1) + ' / ' + qs.length + '</div>' +
        '</div>' +
        '<div class="eng-quiz-score-bar">' + dots + '</div>' +
        '<div class="eng-quiz-q">' + q.q + '</div>' +
        '<div class="eng-quiz-opts" id="eng-quiz-opts">' +
        q.opts.map(function(opt, oi) {
            return '<div class="eng-quiz-opt" onclick="_engAnswerQuiz(' + oi + ')">' + opt + '</div>';
        }).join('') +
        '</div>' +
        '<div class="eng-quiz-exp" id="eng-quiz-exp">' + q.exp + '</div>' +
        '<div class="eng-quiz-nav" id="eng-quiz-nav" style="display:none">' +
        '<div style="font-size:0.85rem;color:rgba(255,255,255,0.5)">Score: <strong style="color:#d4af37">' + _eng.quizScore + '</strong></div>' +
        (_eng.quizQ < qs.length - 1
            ? '<button class="eng-btn primary" onclick="_engNextQuiz()"><i class="fas fa-arrow-left"></i> السؤال التالي</button>'
            : '<button class="eng-btn primary" onclick="_engFinishQuiz()"><i class="fas fa-check"></i> إنهاء الاختبار</button>') +
        '</div>' +
        '</div>';
}

function _engAnswerQuiz(chosenIdx) {
    if (_eng.quizAnswered) return;
    _eng.quizAnswered = true;
    var q = _engQuiz[_eng.level][_eng.quizQ];
    var correct = chosenIdx === q.ans;
    if (correct) _eng.quizScore++;

    // Save answer
    if (!_eng.progress[_eng.level]) _eng.progress[_eng.level] = {};
    if (!_eng.progress[_eng.level].quizAnswers) _eng.progress[_eng.level].quizAnswers = [];
    _eng.progress[_eng.level].quizAnswers[_eng.quizQ] = correct;

    var opts = document.querySelectorAll('.eng-quiz-opt');
    opts.forEach(function(el, i) {
        el.classList.add('disabled');
        if (i === q.ans) el.classList.add('correct');
        else if (i === chosenIdx) el.classList.add('wrong');
    });
    document.getElementById('eng-quiz-exp').style.display = 'block';
    document.getElementById('eng-quiz-nav').style.display = 'flex';
    if (typeof addXP === 'function') addXP(correct ? 20 : 5);
}

function _engNextQuiz() {
    _eng.quizQ++;
    _eng.quizAnswered = false;
    _engRenderQuiz();
}

function _engFinishQuiz() {
    var score = _eng.quizScore;
    var total = _engQuiz[_eng.level].length;
    var pct = Math.round((score / total) * 100);
    var stars = score >= 5 ? '⭐⭐⭐' : score >= 3 ? '⭐⭐' : '⭐';
    var lv = _engLevels[_eng.level];

    // Save
    if (!_eng.progress[_eng.level]) _eng.progress[_eng.level] = {};
    _eng.progress[_eng.level].done = true;
    _eng.progress[_eng.level].score = score;
    _eng.progress[_eng.level].xp = 50 + (score * 20);
    _engSave();
    if (typeof addXP === 'function') addXP(50 + score * 20);

    var section = document.getElementById('english');
    section.innerHTML =
        '<div class="eng-complete-wrap">' +
        '<div style="font-family:\'Orbitron\',sans-serif;color:#d4af37;font-size:0.8rem;margin-bottom:1rem">LEVEL ' + lv.n + ' COMPLETE</div>' +
        '<div class="eng-complete-score">' + score + '/' + total + '</div>' +
        '<div class="eng-complete-stars">' + stars + '</div>' +
        '<div style="color:rgba(255,255,255,0.6);margin-bottom:0.5rem">' + pct + '% Correct</div>' +
        '<div style="color:#d4af37;font-weight:700;margin-bottom:1.5rem">+' + (50 + score * 20) + ' XP Earned</div>' +
        '<div style="max-width:480px;margin:0 auto 2rem;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:1rem;font-size:0.85rem;color:rgba(255,255,255,0.7)">' +
        (score === 5 ? '🏆 Perfect score! You have mastered this level.' :
         score >= 3 ? '✅ Well done! Review the words you marked and try again for a perfect score.' :
         '💪 Good effort! Re-read the text and focus on the highlighted business terms before retrying.') +
        '</div>' +
        '<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">' +
        '<button class="eng-back-btn" onclick="renderEnglishCenter()"><i class="fas fa-home"></i> مركز التعلم</button>' +
        (_eng.level < 9 ? '<button class="eng-btn primary" onclick="_engOpenLevel(' + (_eng.level + 1) + ')"><i class="fas fa-arrow-left"></i> المستوى التالي</button>' : '') +
        '<button class="eng-back-btn" onclick="_engOpenLevel(' + _eng.level + ')"><i class="fas fa-redo"></i> إعادة</button>' +
        '</div>' +
        '</div>';
}

// ── Close popup on outside click ──────────────────────────────────
document.addEventListener('click', function(e) {
    var popup = document.getElementById('eng-popup');
    if (popup && popup.style.display !== 'none' && !popup.contains(e.target) && !e.target.closest('.eng-w')) {
        popup.style.display = 'none';
    }
});
