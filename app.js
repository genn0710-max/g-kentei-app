/**
 * G検定対策アプリ フロントエンドロジック (音声読み上げ & 用語辞書連動対応版)
 */

// グローバル状態
const state = {
  categories: [],
  questions: [],
  terms: [],
  serverInfo: null,
  
  // 模擬試験状態
  exam: {
    active: false,
    questions: [],
    currentIndex: 0,
    answers: {}, // { index: selectedChoiceIndex }
    flags: {},   // { index: true/false }
    timerInterval: null,
    remainingSeconds: 0,
    totalSeconds: 0,
    startTime: null,
    elapsedSeconds: 0,
    paceSeconds: 40,
    paceRemaining: 40,
    paceInterval: null
  },

  // 分野別ドリル状態
  drill: {
    category: null,
    questions: [],
    currentIndex: 0,
    hasAnswered: false
  },

  // 音声読み上げ（TTS）状態
  tts: {
    synth: window.speechSynthesis,
    voice: null,
    enVoice: null,
    rate: 1.0,
    isSpeaking: false,
    isPaused: false,
    queue: [],
    currentIndex: 0
  },

  // 各章・重要用語 聞き流しモード状態
  audioFlow: {
    mode: 'questions', // 'questions' | 'terms'
    category: 'all',
    items: [],
    currentIndex: 0,
    isPlaying: false,
    isPaused: false,
    thinkingTime: true,
    repeat: true,
    speed: 1.0,
    preventSleep: true, // スリープ・自動消灯防止 (Wake Lock)
    phase: 'idle', // 'idle' | 'question' | 'thinking' | 'explanation' | 'term'
    timerId: null
  },

  // 選択中の用語モーダルデータ
  activeModalTerm: null
};

// DOM要素
const elements = {
  headerQCount: document.getElementById('header-q-count'),
  headerTCount: document.getElementById('header-t-count'),
  headerPort: document.getElementById('header-port'),
  navTabs: document.querySelectorAll('.nav-tab'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  toast: document.getElementById('toast'),

  // 音声コントロールバー
  audioBar: document.getElementById('audio-control-bar'),
  audioReadingTitle: document.getElementById('audio-reading-title'),
  btnAudioPlayPause: document.getElementById('btn-audio-play-pause'),
  btnAudioStop: document.getElementById('btn-audio-stop'),
  audioSpeedSelect: document.getElementById('audio-speed-select'),

  // 用語モーダル
  termModal: document.getElementById('term-modal'),
  modalTermTitle: document.getElementById('modal-term-title'),
  modalTermStars: document.getElementById('modal-term-stars'),
  modalTermCategory: document.getElementById('modal-term-category'),
  modalTermSummary: document.getElementById('modal-term-summary'),
  modalTermDetails: document.getElementById('modal-term-details'),
  modalRelationSection: document.getElementById('modal-relation-section'),
  modalRelatedTerms: document.getElementById('modal-related-terms'),
  modalRelationNote: document.getElementById('modal-relation-note'),
  modalRelatedQuestions: document.getElementById('modal-related-questions'),
  modalBtnSpeak: document.getElementById('modal-btn-speak'),
  modalBtnClose: document.getElementById('modal-btn-close'),
  modalBtnOk: document.getElementById('modal-btn-ok'),

  // 模試要素
  examStartView: document.getElementById('exam-start-view'),
  examPlayView: document.getElementById('exam-play-view'),
  examResultView: document.getElementById('exam-result-view'),
  btnStartExam: document.getElementById('btn-start-exam'),
  examCountSelect: document.getElementById('exam-count-select'),
  examTimerToggle: document.getElementById('exam-timer-toggle'),
  examQProgress: document.getElementById('exam-q-progress'),
  examCurrentCategory: document.getElementById('exam-current-category'),
  examTimerBox: document.getElementById('exam-timer-box'),
  examTimerText: document.getElementById('exam-timer-text'),
  perQuestionTimerBox: document.getElementById('per-question-timer-box'),
  paceSecondsText: document.getElementById('pace-seconds-text'),
  paceProgressBar: document.getElementById('pace-progress-bar'),
  btnSpeakExamQ: document.getElementById('btn-speak-exam-q'),
  btnFlagToggle: document.getElementById('btn-flag-toggle'),
  btnFinishExam: document.getElementById('btn-finish-exam'),
  btnAbortExam: document.getElementById('btn-abort-exam'),
  examQuestionText: document.getElementById('exam-question-text'),
  examChoicesContainer: document.getElementById('exam-choices-container'),
  btnExamPrev: document.getElementById('btn-exam-prev'),
  btnExamNext: document.getElementById('btn-exam-next'),
  examPaletteGrid: document.getElementById('exam-palette-grid'),
  btnTogglePalette: document.getElementById('btn-toggle-palette'),
  paletteCollapsibleContent: document.getElementById('palette-collapsible-content'),
  paletteChevron: document.getElementById('palette-chevron'),
  paletteAnsweredCount: document.getElementById('palette-answered-count'),
  paletteCountLabel: document.getElementById('palette-count-label'),
  resultScorePercent: document.getElementById('result-score-percent'),
  resultScoreFraction: document.getElementById('result-score-fraction'),
  resultVerdict: document.getElementById('result-verdict'),
  resultFeedback: document.getElementById('result-feedback'),
  resultTimeTaken: document.getElementById('result-time-taken'),
  resultCorrectCount: document.getElementById('result-correct-count'),
  resultWrongCount: document.getElementById('result-wrong-count'),
  btnExamRestart: document.getElementById('btn-exam-restart'),
  btnFilterMistakes: document.getElementById('btn-filter-mistakes'),
  btnShowAllReviews: document.getElementById('btn-show-all-reviews'),
  btnSpeakAllExplanations: document.getElementById('btn-speak-all-explanations'),
  examReviewContainer: document.getElementById('exam-review-container'),
  categoryBreakdownList: document.getElementById('category-breakdown-list'),

  // ドリル要素
  drillCategoryGrid: document.getElementById('drill-category-grid'),
  drillActiveView: document.getElementById('drill-active-view'),
  btnDrillBack: document.getElementById('btn-drill-back'),
  drillProgressText: document.getElementById('drill-progress-text'),
  drillCategoryName: document.getElementById('drill-category-name'),
  btnSpeakDrillQ: document.getElementById('btn-speak-drill-q'),
  drillQuestionText: document.getElementById('drill-question-text'),
  drillChoicesContainer: document.getElementById('drill-choices-container'),
  drillExplanationBox: document.getElementById('drill-explanation-box'),
  drillResultBanner: document.getElementById('drill-result-banner'),
  btnSpeakDrillExp: document.getElementById('btn-speak-drill-exp'),
  drillExplanationText: document.getElementById('drill-explanation-text'),
  btnDrillNext: document.getElementById('btn-drill-next'),

  // 聞き流しモード要素
  flowModeBtnQuestions: document.getElementById('btn-flow-mode-questions'),
  flowModeBtnRelation: document.getElementById('btn-flow-mode-relation'),
  flowModeBtnTerms: document.getElementById('btn-flow-mode-terms'),
  flowCategorySelect: document.getElementById('flow-category-select'),
  flowThinkingToggle: document.getElementById('flow-thinking-toggle'),
  flowRepeatToggle: document.getElementById('flow-repeat-toggle'),
  flowWakeLockToggle: document.getElementById('flow-wakelock-toggle'),
  flowWakeLockPill: document.getElementById('flow-wakelock-pill'),
  flowSpeedSelect: document.getElementById('flow-speed-select'),
  flowStatusBadge: document.getElementById('flow-status-badge'),
  flowCounterText: document.getElementById('flow-counter-text'),
  flowCurrentCategoryPill: document.getElementById('flow-current-category-pill'),
  flowProgressBarFill: document.getElementById('flow-progress-bar-fill'),
  btnFlowPrev: document.getElementById('btn-flow-prev'),
  btnFlowPlayPause: document.getElementById('btn-flow-play-pause'),
  btnFlowNext: document.getElementById('btn-flow-next'),
  btnFlowStop: document.getElementById('btn-flow-stop'),
  flowCurrentCard: document.getElementById('flow-current-card'),
  flowItemNum: document.getElementById('flow-item-num'),
  flowStepPhase: document.getElementById('flow-step-phase'),
  flowItemTitle: document.getElementById('flow-item-title'),
  flowChoicesList: document.getElementById('flow-choices-list'),
  flowItemAnswerBox: document.getElementById('flow-item-answer-box'),
  flowItemAnswerText: document.getElementById('flow-item-answer-text'),
  flowItemExplanationBox: document.getElementById('flow-item-explanation-box'),
  flowItemExplanationText: document.getElementById('flow-item-explanation-text'),
  flowItemRelationBox: document.getElementById('flow-item-relation-box'),
  flowRelTermsContainer: document.getElementById('flow-rel-terms-container'),
  flowRelNote: document.getElementById('flow-rel-note'),
  flowRelQuestionsContainer: document.getElementById('flow-rel-questions-container'),
  flowListCount: document.getElementById('flow-list-count'),
  flowPlaylist: document.getElementById('flow-playlist'),
  btnStartTermsFlow: document.getElementById('btn-start-terms-flow'),

  // 用語集要素
  termsContainer: document.getElementById('terms-container'),
  termsSearchInput: document.getElementById('terms-search-input'),
  termsCategoryFilter: document.getElementById('terms-category-filter'),

  // 管理画面要素
  formCategory: document.getElementById('form-category'),
  formSource: document.getElementById('form-source'),
  formQuestion: document.getElementById('form-question'),
  choiceInputs: [
    document.getElementById('choice-0'),
    document.getElementById('choice-1'),
    document.getElementById('choice-2'),
    document.getElementById('choice-3')
  ],
  formExplanation: document.getElementById('form-explanation'),
  addQuestionForm: document.getElementById('add-question-form'),
  adminTableCount: document.getElementById('admin-table-count'),
  adminQuestionsTbody: document.getElementById('admin-questions-tbody'),
  adminSearchInput: document.getElementById('admin-search-input')
};

// ==========================================
// ユーティリティ
// ==========================================
function showToast(message, duration = 3000) {
  elements.toast.textContent = message;
  elements.toast.classList.remove('hidden');
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, duration);
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(sec) {
  if (sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 音声読み上げ（TTS）エンジン
// ==========================================
function initTTS() {
  if (!('speechSynthesis' in window)) {
    console.warn("このブラウザは音声合成に対応していません。");
    return;
  }

  function pickVoices() {
    const voices = state.tts.synth.getVoices();
    if (!voices || voices.length === 0) return;

    // 1. 高品質な日本語音声の選定（Siri, Kyoko, Otoya, Google, Enhanced等を優先）
    const jaVoices = voices.filter(v => v.lang.includes('ja') || v.lang.includes('JP'));
    const preferredJa = jaVoices.find(v => (v.name.includes('Siri') || v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Google') || v.name.includes('Natural')) && !v.name.includes('Compact'))
      || jaVoices.find(v => !v.name.includes('Compact'))
      || jaVoices[0];
    if (preferredJa) {
      state.tts.voice = preferredJa;
    }

    // 2. 本格的な英語ネイティブ音声の選定（Samantha, Karen, Daniel, Siri, Google US English等）
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    const preferredEn = enVoices.find(v => (v.name.includes('Siri') || v.name.includes('Samantha') || v.name.includes('Karen') || v.name.includes('Daniel') || v.name.includes('Google US') || v.name.includes('Natural')) && !v.name.includes('Compact'))
      || enVoices.find(v => v.lang.includes('US') || v.lang.includes('GB'))
      || enVoices[0];
    if (preferredEn) {
      state.tts.enVoice = preferredEn;
    }
  }

  pickVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = pickVoices;
  }
}

function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';

  let clean = text
    .replace(/【|】|■|○|×|★|▼|▲|●|◆|◇|◎/g, ' ')
    .replace(/第\s*(\d+)\s*問/g, 'だい $1 もん')
    .replace(/①/g, '1番、').replace(/②/g, '2番、').replace(/③/g, '3番、').replace(/④/g, '4番、')
    // 「XAI」および「AI」を「エーアイ」に確実に発音させる（英単語内部のaiには誤爆しないよう単語境界チェック）
    .replace(/ＸＡＩ/gi, 'エックスエーアイ')
    .replace(/(?<![a-zA-Z])XAI(?![a-zA-Z])/gi, 'エックスエーアイ')
    .replace(/ＡＩ/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])AI(?![a-zA-Z])/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])Ai(?![a-zA-Z])/g, 'エーアイ')
    // F値、p値、Q学習、k近傍法など専門記号の発音補正
    .replace(/(?<![a-zA-Z])F値(?![a-zA-Z])/g, 'エフち')
    .replace(/(?<![a-zA-Z])p値(?![a-zA-Z])/g, 'ピーち')
    .replace(/(?<![a-zA-Z])Q値(?![a-zA-Z])/g, 'キューち')
    .replace(/(?<![a-zA-Z])Q学習(?![a-zA-Z])/g, 'キューがくしゅう')
    .replace(/k近傍法/gi, 'ケーきんぼうほう')
    .replace(/k平均法/gi, 'ケーへいきんほう')
    .replace(/k分割交差検証/gi, 'ケーぶんかつ こうさけんしょう')
    .replace(/k分割/gi, 'ケーぶんかつ')
    .replace(/交差エントロピー/g, 'こうさエントロピー')
    .replace(/平均二乗誤差/g, 'へいきんにじょうごさ')
    .replace(/過適合/g, 'かてきごう')
    .replace(/正則化項/g, 'せいそくかこう')
    .replace(/潜在空間/g, 'せんざいくうかん')
    .replace(/事前学習/g, 'じぜんがくしゅう')
    .replace(/事後確率/g, 'じごかくりつ')
    .replace(/事前確率/g, 'じぜんかくりつ')
    .replace(/周辺尤度/g, 'しゅうへんゆうど')
    .replace(/共分散/g, 'きょうぶんさん')
    .replace(/固有値/g, 'こゆうち')
    .replace(/固有ベクトル/g, 'こゆうベクトル')
    .replace(/特異値分解/g, 'とくいちぶんかい')
    .replace(/特異値/g, 'とくいち')
    .replace(/基底関数/g, 'きていかんすう')
    .replace(/目的関数/g, 'もくてきかんすう')
    .replace(/多峰性/g, 'たほうせい')
    .replace(/大局解/g, 'たいきょくかい')
    .replace(/局所解/g, 'きょくしょかい')
    // 汎化性能・尤度・勾配などG検定重要用語の正確な発音補正（誤読・訓読み防止）
    .replace(/汎化性能/g, 'はんかせいのう')
    .replace(/汎化誤差/g, 'はんかごさ')
    .replace(/汎化能力/g, 'はんかのうりょく')
    .replace(/汎化/g, 'はんか')
    .replace(/汎用人工知能/g, 'はんようじんこうちのう')
    .replace(/汎用性/g, 'はんようせい')
    .replace(/汎用/g, 'はんよう')
    .replace(/最尤推定法/g, 'さいゆうすいていほう')
    .replace(/最尤推定/g, 'さいゆうすいてい')
    .replace(/最尤法/g, 'さいゆうほう')
    .replace(/対数尤度/g, 'たいすうゆうど')
    .replace(/尤度比/g, 'ゆうどひ')
    .replace(/尤度/g, 'ゆうど')
    .replace(/確率的勾配降下法/g, 'かくりつてきこうばいこうかほう')
    .replace(/勾配降下法/g, 'こうばいこうかほう')
    .replace(/最急降下法/g, 'さいきゅうこうかほう')
    .replace(/勾配消失/g, 'こうばいしょうしつ')
    .replace(/勾配爆発/g, 'こうばいばくはつ')
    .replace(/勾配/g, 'こうばい')
    .replace(/鞍点/g, 'あんてん')
    .replace(/誤差逆伝播法/g, 'ごさぎゃくでんぱほう')
    .replace(/誤差逆伝播/g, 'ごさぎゃくでんぱ')
    .replace(/逆伝播/g, 'ぎゃくでんぱ')
    .replace(/順伝播/g, 'じゅんでんぱ')
    .replace(/過学習/g, 'かがくしゅう')
    .replace(/未学習/g, 'みがくしゅう')
    .replace(/正則化/g, 'せいそくか')
    .replace(/交差検証法/g, 'こうさけんしょうほう')
    .replace(/交差検証/g, 'こうさけんしょう')
    .replace(/適合率/g, 'てきごうりつ')
    .replace(/再現率/g, 'さいげんりつ')
    .replace(/正解率/g, 'せいかいりつ')
    .replace(/特異度/g, 'とくいど')
    .replace(/混同行列/g, 'こんどうぎょうれつ')
    .replace(/主成分分析/g, 'しゅせいぶんぶんせき')
    .replace(/次元削減/g, 'じげんさくげん')
    .replace(/決定木/g, 'けっていぎ')
    .replace(/回帰木/g, 'かいきぎ')
    .replace(/畳み込み層/g, 'たたみこみそう')
    .replace(/畳み込み/g, 'たたみこみ')
    .replace(/全結合層/g, 'ぜんけつごうそう')
    .replace(/重み減衰/g, 'おもみげんすい')
    .replace(/知識蒸留/g, 'ちしきじょうりゅう')
    .replace(/不均衡データ/g, 'ふきんこうデータ')
    .replace(/不均衡/g, 'ふきんこう')
    .replace(/大域的最適解/g, 'たいいきてきさいてきかい')
    .replace(/大局的最適解/g, 'たいきょくてきさいてきかい')
    .replace(/局所最適解/g, 'きょくしょさいてきかい')
    .replace(/活性化関数/g, 'かっせいかかんすう')
    .replace(/損失関数/g, 'そんしつかんすう')
    .replace(/目的変数/g, 'もくてきへんすう')
    .replace(/説明変数/g, 'せつめいへんすう')
    .replace(/潜在変数/g, 'せんざいへんすう')
    .replace(/価値関数/g, 'かちかんすう')
    .replace(/状態価値関数/g, 'じょうたいかちかんすう')
    .replace(/行動価値関数/g, 'こうどうかちかんすう')
    .replace(/方策関数/g, 'ほうさくかんすう')
    .replace(/報酬関数/g, 'ほうしゅうかんすう')
    .replace(/多層パーセプトロン/g, 'たそうパーセプトロン')
    .replace(/単層パーセプトロン/g, 'たんそうパーセプトロン')
    .replace(/形態素解析/g, 'けいたいそかいせき')
    .replace(/構文解析/g, 'こうぶんかいせき')
    .replace(/意味解析/g, 'いみかいせき')
    .replace(/線形回帰/g, 'せんけいかいき')
    .replace(/非線形/g, 'ひせんけい')
    // G検定・主要AI用語の読み仮名・表記補正（英語・アルファベットはネイティブ英語エンジンで発音）
    .replace(/(?<![a-zA-Z])G検定/g, 'G検定')
    .replace(/(?<![a-zA-Z])ChatGPT(?![a-zA-Z])/gi, 'ChatGPT')
    .replace(/(?<![a-zA-Z])GPT(?![a-zA-Z])/g, 'GPT')
    .replace(/(?<![a-zA-Z])CNN(?![a-zA-Z])/g, 'CNN')
    .replace(/(?<![a-zA-Z])RNN(?![a-zA-Z])/g, 'RNN')
    .replace(/(?<![a-zA-Z])DNN(?![a-zA-Z])/g, 'DNN')
    .replace(/(?<![a-zA-Z])ANN(?![a-zA-Z])/g, 'ANN')
    .replace(/(?<![a-zA-Z])LLM(?![a-zA-Z])/g, 'LLM')
    .replace(/(?<![a-zA-Z])NLP(?![a-zA-Z])/g, 'NLP')
    .replace(/(?<![a-zA-Z])GPU(?![a-zA-Z])/g, 'GPU')
    .replace(/(?<![a-zA-Z])CPU(?![a-zA-Z])/g, 'CPU')
    .replace(/(?<![a-zA-Z])TPU(?![a-zA-Z])/g, 'TPU')
    .replace(/(?<![a-zA-Z])SVM(?![a-zA-Z])/g, 'SVM')
    .replace(/(?<![a-zA-Z])SGD(?![a-zA-Z])/g, 'SGD')
    .replace(/(?<![a-zA-Z])IoT(?![a-zA-Z])/g, 'IoT')
    .replace(/(?<![a-zA-Z])DX(?![a-zA-Z])/g, 'DX')
    .replace(/(?<![a-zA-Z])DQN(?![a-zA-Z])/g, 'DQN')
    .replace(/(?<![a-zA-Z])VAE(?![a-zA-Z])/g, 'VAE')
    .replace(/(?<![a-zA-Z])GAN(?![a-zA-Z])/g, 'GAN')
    .replace(/(?<![a-zA-Z])AGI(?![a-zA-Z])/g, 'AGI')
    .replace(/(?<![a-zA-Z])BERT(?![a-zA-Z])/g, 'BERT')
    .replace(/(?<![a-zA-Z])RL(?![a-zA-Z])/g, 'RL')
    .replace(/(?<![a-zA-Z])ML(?![a-zA-Z])/g, 'ML')
    .replace(/(?<![a-zA-Z])MDP(?![a-zA-Z])/g, 'MDP')
    .replace(/(?<![a-zA-Z])RAG(?![a-zA-Z])/g, 'RAG')
    .replace(/(?<![a-zA-Z])LoRA(?![a-zA-Z])/g, 'LoRA')
    .replace(/(?<![a-zA-Z])ViT(?![a-zA-Z])/g, 'ViT')
    .replace(/(?<![a-zA-Z])ROC(?![a-zA-Z])/g, 'ROC')
    .replace(/(?<![a-zA-Z])AUC(?![a-zA-Z])/g, 'AUC')
    .replace(/(?<![a-zA-Z])PCA(?![a-zA-Z])/g, 'PCA')
    .replace(/(?<![a-zA-Z])t-SNE(?![a-zA-Z])/gi, 't-SNE')
    .replace(/(?<![a-zA-Z])AdamW(?![a-zA-Z])/gi, 'AdamW')
    .replace(/(?<![a-zA-Z])Adam(?![a-zA-Z])/gi, 'Adam')
    .replace(/(?<![a-zA-Z])PPO(?![a-zA-Z])/g, 'PPO')
    .replace(/(?<![a-zA-Z])RLHF(?![a-zA-Z])/g, 'RLHF')
    .replace(/(?<![a-zA-Z])DPO(?![a-zA-Z])/g, 'DPO')
    .replace(/(?<![a-zA-Z])SHAP(?![a-zA-Z])/gi, 'SHAP')
    .replace(/(?<![a-zA-Z])LIME(?![a-zA-Z])/gi, 'LIME')
    .replace(/(?<![a-zA-Z])YOLO(?![a-zA-Z])/gi, 'YOLO')
    .replace(/(?<![a-zA-Z])SSD(?![a-zA-Z])/g, 'SSD')
    .replace(/(?<![a-zA-Z])ResNet(?![a-zA-Z])/gi, 'ResNet')
    .replace(/(?<![a-zA-Z])AlexNet(?![a-zA-Z])/gi, 'AlexNet')
    .replace(/(?<![a-zA-Z])LeNet(?![a-zA-Z])/gi, 'LeNet')
    .replace(/(?<![a-zA-Z])VGG(?![a-zA-Z])/gi, 'VGG')
    .replace(/(?<![a-zA-Z])ReLU(?![a-zA-Z])/gi, 'ReLU')
    .replace(/(?<![a-zA-Z])GELU(?![a-zA-Z])/gi, 'GELU')
    .replace(/(?<![a-zA-Z])Swish(?![a-zA-Z])/gi, 'Swish')
    .replace(/(?<![a-zA-Z])Sigmoid(?![a-zA-Z])/gi, 'Sigmoid')
    .replace(/(?<![a-zA-Z])Softmax(?![a-zA-Z])/gi, 'Softmax')
    .replace(/(?<![a-zA-Z])Dropout(?![a-zA-Z])/gi, 'Dropout')
    .replace(/(?<![a-zA-Z])IoU(?![a-zA-Z])/gi, 'IoU')
    .replace(/(?<![a-zA-Z])mAP(?![a-zA-Z])/gi, 'mAP')
    .replace(/(?<![a-zA-Z])FCN(?![a-zA-Z])/gi, 'FCN')
    .replace(/(?<![a-zA-Z])U-Net(?![a-zA-Z])/gi, 'U-Net')
    .replace(/(?<![a-zA-Z])Seq2Seq(?![a-zA-Z])/gi, 'Seq2Seq')
    .replace(/(?<![a-zA-Z])AlphaGo(?![a-zA-Z])/gi, 'AlphaGo')
    .replace(/(?<![a-zA-Z])ELIZA(?![a-zA-Z])/gi, 'ELIZA')
    .replace(/(?<![a-zA-Z])MYCIN(?![a-zA-Z])/gi, 'MYCIN')
    .replace(/(?<![a-zA-Z])DENDRAL(?![a-zA-Z])/gi, 'DENDRAL')
    .replace(/k-means/gi, 'k-means')
    .replace(/k-NN/gi, 'k-NN')
    .replace(/GBDT/gi, 'GBDT')
    .replace(/LightGBM/gi, 'LightGBM')
    .replace(/XGBoost/gi, 'XGBoost')
    .replace(/CatBoost/gi, 'CatBoost')
    .replace(/CLIP/gi, 'CLIP')
    .replace(/Whisper/gi, 'Whisper')
    .replace(/SARSA/gi, 'SARSA')
    .replace(/ε-greedy/gi, 'Epsilon Greedy')
    .replace(/Actor-Critic/gi, 'Actor-Critic')
    .replace(/\n+/g, '。 ');

  return clean;
}

// 日英ハイブリッド音声合成用: テキストを日本語と本格英語（アルファベット）チャンクに最適分割
function splitTextByLanguage(text) {
  if (!text) return [];
  const chunks = [];
  // 英字を含むトークン列（スペース区切りの連続する英単語群も1塊として認識）
  const regex = /([a-zA-Z][a-zA-Z0-9\-_]*(?:\s+[a-zA-Z][a-zA-Z0-9\-_]*)*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const jaPart = text.slice(lastIndex, match.index);
      if (jaPart) chunks.push({ text: jaPart, lang: 'ja' });
    }
    chunks.push({ text: match[0], lang: 'en' });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    const remaining = text.slice(lastIndex);
    if (remaining) chunks.push({ text: remaining, lang: 'ja' });
  }
  return chunks;
}

function speakText(text, title = "音声読み上げ中...") {
  if (!state.tts.synth) return;

  // 既存の音声を停止
  stopSpeaking();

  if (!text || text.trim() === "") return;

  // 読み上げテキストのクリーンアップ（記号・専門用語発音補正）
  const cleanText = cleanTextForSpeech(text);
  const chunks = splitTextByLanguage(cleanText);

  if (chunks.length === 0) return;

  let chunkIdx = 0;

  function speakNextChunk() {
    if (chunkIdx >= chunks.length) {
      if (state.tts.queue.length > 0) {
        const next = state.tts.queue.shift();
        speakText(next.text, next.title);
      } else {
        stopSpeaking();
      }
      return;
    }

    const chunk = chunks[chunkIdx];
    chunkIdx++;

    const isEn = (chunk.lang === 'en');
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    
    // 英語部分は英語ネイティブ音声（en-US/en-GB）、日本語部分は日本語音声（ja-JP）を使用
    if (isEn && state.tts.enVoice) {
      utterance.voice = state.tts.enVoice;
      utterance.lang = state.tts.enVoice.lang || 'en-US';
    } else if (!isEn && state.tts.voice) {
      utterance.voice = state.tts.voice;
      utterance.lang = 'ja-JP';
    } else {
      utterance.lang = isEn ? 'en-US' : 'ja-JP';
    }

    utterance.rate = state.tts.rate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      state.tts.isSpeaking = true;
      state.tts.isPaused = false;
      elements.audioBar.classList.remove('hidden');
      elements.audioReadingTitle.textContent = title;
      elements.btnAudioPlayPause.textContent = '⏸';
    };

    utterance.onend = () => {
      speakNextChunk();
    };

    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.error("TTS Error:", e);
      speakNextChunk();
    };

    state.tts.synth.speak(utterance);
  }

  speakNextChunk();
}

function togglePlayPauseSpeech() {
  if (!state.tts.synth) return;

  if (state.tts.synth.speaking) {
    if (state.tts.isPaused) {
      state.tts.synth.resume();
      state.tts.isPaused = false;
      elements.btnAudioPlayPause.textContent = '⏸';
    } else {
      state.tts.synth.pause();
      state.tts.isPaused = true;
      elements.btnAudioPlayPause.textContent = '▶';
    }
  }
}

function stopSpeaking() {
  if (!state.tts.synth) return;
  state.tts.synth.cancel();
  state.tts.isSpeaking = false;
  state.tts.isPaused = false;
  state.tts.queue = [];
  elements.audioBar.classList.add('hidden');
}

// ==========================================
// 用語リンク自動生成 & モーダル表示
// ==========================================
function renderTextWithTermLinks(text) {
  if (!text) return '';
  let escaped = escapeHtml(text);

  // 用語を文字数の長い順にソート（部分一致で短いものが先に置換されるのを防ぐ）
  const sortedTerms = [...state.terms].sort((a, b) => {
    // 括弧内の英語を除いたキーワード長などで比較
    const nameA = a.term.split('(')[0].trim();
    const nameB = b.term.split('(')[0].trim();
    return nameB.length - nameA.length;
  });

  sortedTerms.forEach(termObj => {
    // 主用語名（例: "Transformer", "過学習"）
    const mainTerm = termObj.term.split('(')[0].trim();
    if (mainTerm.length < 2) return;

    // 特殊文字エスケープ
    const escapedTermName = mainTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?<!<[^>]*)(${escapedTermName})(?![^<]*>)`, 'gi');

    escaped = escaped.replace(regex, (match) => {
      return `<a href="javascript:void(0)" class="term-link" data-term-id="${termObj.id}">${match}</a>`;
    });
  });

  return escaped;
}

function openTermModal(termId) {
  const term = state.terms.find(t => t.id === termId);
  if (!term) return;

  state.activeModalTerm = term;
  elements.modalTermTitle.textContent = term.term;
  elements.modalTermStars.textContent = '★'.repeat(term.importance || 3);
  elements.modalTermCategory.textContent = term.category;
  elements.modalTermSummary.textContent = term.summary;
  elements.modalTermDetails.textContent = term.details || term.explanation || '';

  // 体系的リレーション・関連知識の表示
  if (elements.modalRelationNote) {
    elements.modalRelationNote.textContent = term.relationNote || 'この分野の基盤となる重要知識です。';
  }

  if (elements.modalRelatedTerms) {
    elements.modalRelatedTerms.innerHTML = '';
    const relTerms = term.relatedTerms || [];
    if (relTerms.length > 0) {
      relTerms.forEach(relName => {
        const matched = state.terms.find(t => t.term.includes(relName) || relName.includes(t.term.split('(')[0].trim()));
        const pill = document.createElement('span');
        pill.className = 'rel-term-pill';
        pill.textContent = `🏷️ ${relName}`;
        pill.title = 'タップしてこの用語の解説を表示';
        if (matched) {
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            openTermModal(matched.id);
          });
        }
        elements.modalRelatedTerms.appendChild(pill);
      });
    } else {
      elements.modalRelatedTerms.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">関連用語の指定はありません</span>';
    }
  }

  // 出題された実践問題の表示
  if (elements.modalRelatedQuestions) {
    elements.modalRelatedQuestions.innerHTML = '';
    const cleanName = term.term.split('(')[0].trim().toLowerCase();
    const matchedQuestions = state.questions.filter(q => {
      const fullText = (q.question + ' ' + q.choices.join(' ') + ' ' + (q.explanation || '')).toLowerCase();
      return fullText.includes(cleanName) || (q.relatedTerms && q.relatedTerms.some(rt => rt.toLowerCase().includes(cleanName) || cleanName.includes(rt.toLowerCase())));
    }).slice(0, 3);

    if (matchedQuestions.length > 0) {
      matchedQuestions.forEach(q => {
        const qIndex = state.questions.findIndex(item => item.id === q.id);
        const btn = document.createElement('button');
        btn.className = 'rel-question-btn';
        btn.innerHTML = `<span>🎯 第 ${qIndex + 1} 問:</span> <span>${escapeHtml(q.question.slice(0, 32))}...</span>`;
        btn.title = 'タップしてこの問題を音声聞き流しで開く';
        btn.addEventListener('click', () => {
          closeTermModal();
          startAudioFlowForCategory(q.category, 'questions', q.id);
        });
        elements.modalRelatedQuestions.appendChild(btn);
      });
    } else {
      elements.modalRelatedQuestions.innerHTML = '<span style="color:#94a3b8; font-size:0.8rem;">この用語の直接出題問題はありません</span>';
    }
  }

  elements.termModal.classList.remove('hidden');
}

function closeTermModal() {
  elements.termModal.classList.add('hidden');
  state.activeModalTerm = null;
}

// ==========================================
// 初期化 & ハイブリッドデータ通信 (GitHub Pages & ローカルサーバー対応)
// ==========================================
const STORAGE_KEY_MANUAL_QUESTIONS = 'gkentei_custom_questions_v1';

function getStoredManualQuestions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MANUAL_QUESTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("LocalStorage読み込みエラー:", e);
    return [];
  }
}

function saveStoredManualQuestions(questions) {
  try {
    localStorage.setItem(STORAGE_KEY_MANUAL_QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.warn("LocalStorage保存エラー:", e);
  }
}

// 静的JSONリソースの多重探索・キャッシュ無効化・最新拡充データ自動優先取得
async function fetchSmartResource(fileName) {
  const cacheBuster = `v=4.4&t=${Date.now()}`;
  const candidates = [
    `data/${fileName}?${cacheBuster}`,
    `${fileName}?${cacheBuster}`,
    `data/${fileName}`,
    `${fileName}`
  ];
  const results = [];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          results.push(data);
        }
      }
    } catch (e) {
      // 候補を順次フォールバック
    }
  }

  if (results.length > 0) {
    // 取得できた中で最も件数の多い配列を自動採用（古いデータやキャッシュより新しい拡充データを優先）
    results.sort((a, b) => b.length - a.length);
    return results[0];
  }
  throw new Error(`リソースの読み込みに失敗しました: ${fileName}`);
}

async function initApp() {
  initTTS();
  setupTabs();
  setupEventListeners();

  // PWA Service Worker 登録（オフライン対応 & 自動更新検知）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log("PWA Service Worker registered:", reg.scope);
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast("✨ 最新バージョン(v4.4)に自動更新されました！");
          }
        });
      });
    }).catch(err => {
      console.log("PWA Service Worker registration skipped:", err);
    });
  }

  try {
    // 1. 静的JSONファイルからデータを読み込み（GitHub Pagesルート配置/data配置の両対応 & キャッシュ無効化 & 最大件数自動選択）
    const [catRes, qRes, termsRes] = await Promise.all([
      fetchSmartResource('categories.json'),
      fetchSmartResource('questions.json'),
      fetchSmartResource('terms.json')
    ]);

    state.categories = catRes;
    state.terms = termsRes;

    // 2. ブラウザのLocalStorageに保存されている手動登録問題を合体
    const localManual = getStoredManualQuestions();
    // 重複を避けてマージ
    const initialIds = new Set(qRes.map(q => q.id));
    const uniqueManual = localManual.filter(q => !initialIds.has(q.id));
    state.questions = [...uniqueManual, ...qRes];

    // 3. ローカルPythonサーバーが動いているかチェック
    try {
      const statusRes = await fetch('/api/status').then(r => r.json());
      state.serverInfo = statusRes;
      state.isServerMode = true;
    } catch (e) {
      state.isServerMode = false;
    }

    updateHeaderStats();
    populateCategoryDropdowns();
    renderDrillCategories();
    renderTermsList();
    renderAdminTable();
  } catch (err) {
    console.error("初期データの読み込みに失敗しました:", err);
    showToast("データ読み込みに失敗しました。オフラインまたはファイル配置を確認してください。");
  }
}

function updateHeaderStats() {
  elements.headerQCount.textContent = state.questions.length;
  elements.headerTCount.textContent = state.terms.length;
  if (state.isServerMode && state.serverInfo && state.serverInfo.port) {
    elements.headerPort.textContent = `ローカルサーバー :${state.serverInfo.port}`;
  } else {
    elements.headerPort.textContent = `PWA / いつでも学習可能`;
  }
}

function setupTabs() {
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.navTabs.forEach(t => t.classList.remove('active'));
      elements.tabPanes.forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.dataset.tab;
      document.getElementById(targetId).classList.add('active');

      if (targetId !== 'audio-flow-tab' && state.audioFlow && state.audioFlow.isPlaying) {
        stopAudioFlow();
      }

      if (targetId === 'admin-tab') {
        renderAdminTable();
      } else if (targetId === 'terms-tab') {
        renderTermsList();
      } else if (targetId === 'drill-tab') {
        renderDrillCategories();
      } else if (targetId === 'audio-flow-tab') {
        initAudioFlow();
      }
    });
  });
}

function populateCategoryDropdowns() {
  // 用語集フィルタ
  elements.termsCategoryFilter.innerHTML = '<option value="all">すべての分野</option>';
  // 管理フォーム
  elements.formCategory.innerHTML = '';
  // 聞き流しカテゴリ
  populateFlowCategorySelect();

  state.categories.forEach(cat => {
    const opt1 = document.createElement('option');
    opt1.value = cat.name;
    opt1.textContent = cat.name;
    elements.termsCategoryFilter.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = cat.name;
    opt2.textContent = cat.name;
    elements.formCategory.appendChild(opt2);
  });
}

// ==========================================
// 1. 模擬試験ロジック & シラバス層化抽出サンプリング
// ==========================================
// JDLAシラバスに基づく分野別出題比率による層化抽出（偏りを防ぎ全分野をバランス良く出題）
function sampleStratifiedQuestions(allQuestions, targetCount) {
  if (!allQuestions || allQuestions.length === 0) return [];
  if (targetCount >= allQuestions.length) {
    return shuffleArray([...allQuestions]);
  }

  // JDLA G検定シラバス目安出題比率
  const SYLLABUS_RATIOS = {
    '人工知能の定義と歴史': 0.10,
    '機械学習の具体的手法': 0.20,
    'ディープラーニングの概要と要素技術': 0.20,
    '画像認識（CNNとその発展）': 0.15,
    '自然言語処理・音声・生成AI': 0.15,
    '強化学習': 0.10,
    'AIの社会実装・法律・倫理': 0.10
  };

  // 分野ごとにグループ化
  const categoryGroups = {};
  allQuestions.forEach(q => {
    const cat = q.category || 'その他';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(q);
  });

  // 各分野シャッフル
  const shuffledGroups = {};
  for (const cat in categoryGroups) {
    shuffledGroups[cat] = shuffleArray([...categoryGroups[cat]]);
  }

  const categories = Object.keys(categoryGroups);
  const allocations = {};
  let allocatedTotal = 0;

  // 1次割り当て: 比率計算 (targetCount >= カテゴリ数の場合は各カテゴリ最低1問を保証)
  categories.forEach(cat => {
    const ratio = SYLLABUS_RATIOS[cat] || (1 / categories.length);
    let count = Math.floor(targetCount * ratio);
    if (targetCount >= categories.length && count === 0) {
      count = 1;
    }
    count = Math.min(count, shuffledGroups[cat].length);
    allocations[cat] = count;
    allocatedTotal += count;
  });

  // 余り調整（比率の高い順、または問題ストックのあるカテゴリに追加配分）
  while (allocatedTotal < targetCount) {
    let added = false;
    const sortedCats = [...categories].sort((a, b) => {
      const weightA = SYLLABUS_RATIOS[a] || 0;
      const weightB = SYLLABUS_RATIOS[b] || 0;
      return weightB - weightA;
    });

    for (const cat of sortedCats) {
      if (allocations[cat] < shuffledGroups[cat].length) {
        allocations[cat]++;
        allocatedTotal++;
        added = true;
        if (allocatedTotal >= targetCount) break;
      }
    }
    if (!added) break;
  }

  // 最低1問保証等で超過した場合の調整
  while (allocatedTotal > targetCount) {
    const sortedCats = [...categories].sort((a, b) => allocations[b] - allocations[a]);
    if (allocations[sortedCats[0]] > 1) {
      allocations[sortedCats[0]]--;
      allocatedTotal--;
    } else {
      break;
    }
  }

  // 各分野から抽出して結合
  let sampled = [];
  categories.forEach(cat => {
    const pickCount = allocations[cat] || 0;
    sampled.push(...shuffledGroups[cat].slice(0, pickCount));
  });

  // 全体をシャッフルして出題順をランダム化
  return shuffleArray(sampled);
}

function startExam() {
  stopSpeaking();
  const countVal = elements.examCountSelect.value;
  const count = countVal === 'all' ? state.questions.length : parseInt(countVal, 10);
  const shuffled = sampleStratifiedQuestions(state.questions, count);

  if (shuffled.length === 0) {
    alert("出題可能な問題がありません。先に問題を登録してください。");
    return;
  }

  const timerMode = elements.examTimerToggle.value;
  let totalSeconds = 0;
  if (timerMode === 'pace40') {
    totalSeconds = shuffled.length * 40; // 1問あたり40秒
  } else if (timerMode === 'official120') {
    totalSeconds = 120 * 60; // 120分 = 7200秒
  } else {
    totalSeconds = 0; // 無制限
  }

  state.exam = {
    active: true,
    questions: shuffled,
    currentIndex: 0,
    answers: {},
    flags: {},
    timerInterval: null,
    remainingSeconds: totalSeconds,
    totalSeconds: totalSeconds,
    startTime: Date.now(),
    elapsedSeconds: 0,
    paceSeconds: 40,
    paceRemaining: 40,
    paceInterval: null
  };

  elements.examStartView.classList.add('hidden');
  elements.examResultView.classList.add('hidden');
  elements.examPlayView.classList.remove('hidden');
  document.body.classList.add('in-exam');

  if (totalSeconds > 0) {
    elements.examTimerBox.classList.remove('hidden');
    elements.examTimerText.textContent = formatSeconds(totalSeconds);
    startExamTimer();
  } else {
    elements.examTimerBox.classList.add('hidden');
  }

  renderExamPalette();
  renderCurrentExamQuestion();
}

function startExamTimer() {
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
  state.exam.timerInterval = setInterval(() => {
    state.exam.remainingSeconds--;
    elements.examTimerText.textContent = formatSeconds(state.exam.remainingSeconds);

    if (state.exam.remainingSeconds <= 0) {
      clearInterval(state.exam.timerInterval);
      alert("制限時間となりました。試験を終了して採点します。");
      finishExam();
    }
  }, 1000);
}

function resetPaceTimer() {
  if (state.exam.paceInterval) clearInterval(state.exam.paceInterval);
  state.exam.paceRemaining = 40;
  updatePaceDisplay();

  state.exam.paceInterval = setInterval(() => {
    state.exam.paceRemaining--;
    updatePaceDisplay();
  }, 1000);
}

function updatePaceDisplay() {
  if (!elements.paceSecondsText || !elements.paceProgressBar) return;
  const rem = state.exam.paceRemaining;
  const box = elements.perQuestionTimerBox;
  if (!box) return;

  box.classList.remove('pace-warning', 'pace-danger');

  if (rem >= 0) {
    elements.paceSecondsText.textContent = `${rem}秒`;
    const pct = Math.max(0, (rem / 40) * 100);
    elements.paceProgressBar.style.width = `${pct}%`;

    if (rem <= 15 && rem > 5) {
      box.classList.add('pace-warning');
    } else if (rem <= 5) {
      box.classList.add('pace-danger');
    }
  } else {
    // 40秒超過
    const overtime = Math.abs(rem);
    elements.paceSecondsText.textContent = `超過 +${overtime}秒`;
    elements.paceProgressBar.style.width = `100%`;
    box.classList.add('pace-danger');
  }
}

function renderExamPalette() {
  elements.examPaletteGrid.innerHTML = '';
  const total = state.exam.questions.length;
  const answeredCount = Object.keys(state.exam.answers).length;

  if (elements.paletteCountLabel) {
    elements.paletteCountLabel.textContent = `${total}問`;
  }
  if (elements.paletteAnsweredCount) {
    elements.paletteAnsweredCount.textContent = `${answeredCount}/${total}回答`;
  }

  state.exam.questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.className = 'palette-btn';
    btn.textContent = idx + 1;

    if (idx === state.exam.currentIndex) btn.classList.add('current');
    if (state.exam.answers[idx] !== undefined) btn.classList.add('answered');
    if (state.exam.flags[idx]) btn.classList.add('flagged');

    btn.addEventListener('click', () => {
      state.exam.currentIndex = idx;
      renderCurrentExamQuestion();
      renderExamPalette();
      if (window.innerWidth <= 768) {
        const qCard = document.querySelector('.question-card');
        if (qCard) {
          qCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });

    elements.examPaletteGrid.appendChild(btn);
  });
}

function renderCurrentExamQuestion(shouldResetPace = true) {
  const { currentIndex, questions, answers, flags } = state.exam;
  const q = questions[currentIndex];

  if (shouldResetPace && state.exam.totalSeconds > 0) {
    resetPaceTimer();
  }

  elements.examQProgress.textContent = `第 ${currentIndex + 1} 問 / ${questions.length} 問`;
  elements.examCurrentCategory.textContent = q.category || '全般';
  elements.examQuestionText.textContent = q.question;

  // フラグボタン状態
  if (flags[currentIndex]) {
    elements.btnFlagToggle.classList.add('btn-warning');
    elements.btnFlagToggle.innerHTML = '🚩 見直し中';
  } else {
    elements.btnFlagToggle.classList.remove('btn-warning');
    elements.btnFlagToggle.innerHTML = '<span>🚩</span> 見直しチェック';
  }

  // 選択肢レンダリング
  elements.examChoicesContainer.innerHTML = '';
  const letters = ['①', '②', '③', '④', '⑤', '⑥'];
  q.choices.forEach((choiceText, idx) => {
    const item = document.createElement('div');
    item.className = 'choice-item';
    if (answers[currentIndex] === idx) {
      item.classList.add('selected');
    }

    item.innerHTML = `
      <div class="choice-badge">${letters[idx] || (idx + 1)}</div>
      <div class="choice-text">${escapeHtml(choiceText)}</div>
    `;

    item.addEventListener('click', () => {
      state.exam.answers[currentIndex] = idx;
      renderCurrentExamQuestion(false); // 選択肢選択時はタイマーリセットしない
      renderExamPalette();
    });

    elements.examChoicesContainer.appendChild(item);
  });

  // 前後ボタン状態
  elements.btnExamPrev.disabled = currentIndex === 0;
  elements.btnExamNext.textContent = (currentIndex === questions.length - 1) ? '最後の問題です' : '次の問題 ▶';
}

function speakCurrentExamQuestion() {
  const { currentIndex, questions } = state.exam;
  const q = questions[currentIndex];
  if (!q) return;

  const examView = document.getElementById('exam-play-view');
  if (examView) {
    examView.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  let textToRead = `第 ${currentIndex + 1} 問。分野、${q.category}。問題文。${q.question}。`;
  q.choices.forEach((c, i) => {
    textToRead += `選択肢 ${i + 1}、${c}。`;
  });

  speakText(textToRead, `第 ${currentIndex + 1} 問の読み上げ`);
}

function finishExam() {
  stopSpeaking();
  if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
  if (state.exam.paceInterval) clearInterval(state.exam.paceInterval);
  state.exam.elapsedSeconds = Math.round((Date.now() - state.exam.startTime) / 1000);

  const total = state.exam.questions.length;
  let correct = 0;

  state.exam.questions.forEach((q, idx) => {
    if (state.exam.answers[idx] === q.answer) {
      correct++;
    }
  });

  const percent = Math.round((correct / total) * 100);
  const isPass = percent >= 70;

  elements.resultScorePercent.textContent = `${percent}%`;
  elements.resultScoreFraction.textContent = `${correct} / ${total}`;
  elements.resultCorrectCount.textContent = correct;
  elements.resultWrongCount.textContent = total - correct;
  elements.resultTimeTaken.textContent = `${Math.floor(state.exam.elapsedSeconds / 60)}分${state.exam.elapsedSeconds % 60}秒`;

  if (isPass) {
    elements.resultVerdict.textContent = "🎉 合格ライン達成！";
    elements.resultVerdict.style.color = "#10b981";
    elements.resultFeedback.textContent = "素晴らしい成果です！G検定の合格水準（70%以上）に達しています。この調子で弱点をなくしましょう。";
  } else {
    elements.resultVerdict.textContent = "⚠️ もう一歩！復習しましょう";
    elements.resultVerdict.style.color = "#f59e0b";
    elements.resultFeedback.textContent = "合格目安は70%以上です。間違えた問題の解説を熟読し、知識を定着させましょう。";
  }

  // 分野別 得点率・出題配分分析
  const categoryStats = {};
  state.exam.questions.forEach((q, idx) => {
    const cat = q.category || 'その他';
    if (!categoryStats[cat]) {
      categoryStats[cat] = { total: 0, correct: 0 };
    }
    categoryStats[cat].total++;
    if (state.exam.answers[idx] === q.answer) {
      categoryStats[cat].correct++;
    }
  });
  renderCategoryBreakdown(categoryStats, total);

  renderReviewList('all');

  elements.examPlayView.classList.add('hidden');
  elements.examResultView.classList.remove('hidden');
  document.body.classList.remove('in-exam');
}

function renderCategoryBreakdown(categoryStats, examTotal) {
  if (!elements.categoryBreakdownList) return;
  elements.categoryBreakdownList.innerHTML = '';

  const catNames = Object.keys(categoryStats);
  if (catNames.length === 0) return;

  catNames.forEach(catName => {
    const stat = categoryStats[catName];
    const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    const sharePercent = examTotal > 0 ? Math.round((stat.total / examTotal) * 100) : 0;

    let statusClass = 'pass';
    let statusText = '合格水準';
    if (accuracy < 60) {
      statusClass = 'danger';
      statusText = '要重点復習';
    } else if (accuracy < 70) {
      statusClass = 'warning';
      statusText = 'あと少し';
    }

    const row = document.createElement('div');
    row.className = 'cat-breakdown-row';
    row.innerHTML = `
      <div class="cat-breakdown-info">
        <div class="cat-name-label">
          <span>${escapeHtml(catName)}</span>
          <span style="font-weight:400; color:#64748b; font-size:0.78rem;">(${stat.correct}/${stat.total}問・出題比率${sharePercent}%)</span>
        </div>
        <div class="cat-score-text">
          <span>${accuracy}%</span>
          <span class="cat-status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
      <div class="cat-progress-track">
        <div class="cat-progress-bar ${statusClass}" style="width: ${accuracy}%;"></div>
      </div>
    `;
    elements.categoryBreakdownList.appendChild(row);
  });
}

function renderReviewList(filter = 'all') {
  elements.examReviewContainer.innerHTML = '';
  const letters = ['①', '②', '③', '④'];

  state.exam.questions.forEach((q, idx) => {
    const userAns = state.exam.answers[idx];
    const isCorrect = userAns === q.answer;

    if (filter === 'mistakes' && isCorrect) return;

    const div = document.createElement('div');
    div.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;

    const userAnsText = userAns !== undefined ? `${letters[userAns]} ${q.choices[userAns]}` : '（無回答）';
    const correctAnsText = `${letters[q.answer]} ${q.choices[q.answer]}`;

    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <span class="review-badge-status ${isCorrect ? 'badge-correct' : 'badge-wrong'}">
          第 ${idx + 1} 問：${isCorrect ? '○ 正解' : '× 不正解'}
        </span>
        <div style="display:flex; gap:8px; align-items:center;">
          <span class="category-badge">${escapeHtml(q.category)}</span>
          <button class="btn btn-outline btn-sm btn-flow-single-review" data-idx="${idx}" title="この問題を選択肢・シンキング・解説付きの音声フローで特訓">🎧 聞き流し特訓</button>
          <button class="btn btn-outline btn-sm btn-speak-single-review" data-idx="${idx}">🔊 音声解説</button>
        </div>
      </div>
      <h4 style="font-size:1.05rem; margin-bottom:10px;">${escapeHtml(q.question)}</h4>
      <div style="font-size:0.9rem; margin-bottom:6px;">
        <strong>あなたの回答:</strong> <span style="color:${isCorrect ? '#10b981' : '#ef4444'}; font-weight:600;">${escapeHtml(userAnsText)}</span>
      </div>
      <div style="font-size:0.9rem; margin-bottom:10px;">
        <strong>正解:</strong> <span style="color:#10b981; font-weight:700;">${escapeHtml(correctAnsText)}</span>
      </div>
      <div class="review-explanation">${renderTextWithTermLinks(q.explanation)}</div>
      ${(q.relationNote || (q.relatedTerms && q.relatedTerms.length > 0)) ? `
        <div class="review-relation-box" style="margin-top:10px; padding:10px 12px; background:linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.06)); border:1px dashed var(--accent-color); border-radius:8px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--accent-color); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            <span>🔗 知識の系譜・試験リレーション</span>
          </div>
          ${q.relationNote ? `<div style="font-size:0.83rem; color:var(--text-main); margin-bottom:6px; line-height:1.5;">${renderTextWithTermLinks(q.relationNote)}</div>` : ''}
          ${q.relatedTerms && q.relatedTerms.length > 0 ? `
            <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
              <span style="font-size:0.75rem; color:var(--text-muted);">関連用語:</span>
              ${q.relatedTerms.map(rt => `<span class="rel-term-pill term-link" data-term-id="${escapeHtml(rt)}">🏷️ ${escapeHtml(rt)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
    `;

    elements.examReviewContainer.appendChild(div);
  });

  // 個別フロー音声ボタンのイベント付与
  document.querySelectorAll('.btn-flow-single-review').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const q = state.exam.questions[idx];
      stopSpeaking();
      startAudioFlowForCategory(q.category, 'questions', q.id);
    });
  });

  // 個別解説音声ボタンのイベント付与
  document.querySelectorAll('.btn-speak-single-review').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.idx, 10);
      const q = state.exam.questions[idx];
      speakText(`第 ${idx + 1} 問の解説。${q.explanation}`, `第 ${idx + 1} 問の解説を再生中`);
    });
  });

  // 用語リンクのイベント付与
  attachTermLinkEvents();
}

function speakAllMistakesExplanations() {
  const mistakes = state.exam.questions.filter((q, idx) => state.exam.answers[idx] !== q.answer);
  if (mistakes.length === 0) {
    alert("全問正解です！間違えた問題はありません。");
    return;
  }

  stopSpeaking();
  state.tts.queue = mistakes.map((q, idx) => {
    return {
      title: `誤答復習 (${idx + 1}/${mistakes.length}): ${q.category}`,
      text: `問題。${q.question}。解説。${q.explanation}`
    };
  });

  if (state.tts.queue.length > 0) {
    const first = state.tts.queue.shift();
    speakText(first.text, first.title);
  }
}

// ==========================================
// 2. 分野別ドリルロジック
// ==========================================
function renderDrillCategories() {
  elements.drillCategoryGrid.innerHTML = '';
  state.categories.forEach(cat => {
    const count = state.questions.filter(q => q.category === cat.name).length;

    const card = document.createElement('div');
    card.className = 'category-card';
    card.innerHTML = `
      <h3>${escapeHtml(cat.name)}</h3>
      <p>${escapeHtml(cat.description)}</p>
      <div class="category-footer">
        <span>収録: ${count} 問</span>
      </div>
      <div class="drill-card-actions">
        <button class="btn btn-primary btn-drill-start">特訓を開始 →</button>
        <button class="btn btn-outline btn-drill-flow">🎧 聞き流し</button>
      </div>
    `;

    const btnStart = card.querySelector('.btn-drill-start');
    const btnFlow = card.querySelector('.btn-drill-flow');

    btnStart.addEventListener('click', (e) => {
      e.stopPropagation();
      startCategoryDrill(cat.name);
    });

    btnFlow.addEventListener('click', (e) => {
      e.stopPropagation();
      startAudioFlowForCategory(cat.name, 'questions');
    });

    card.addEventListener('click', () => {
      startCategoryDrill(cat.name);
    });

    elements.drillCategoryGrid.appendChild(card);
  });
}

function startCategoryDrill(categoryName) {
  stopSpeaking();
  const filtered = state.questions.filter(q => q.category === categoryName);
  if (filtered.length === 0) {
    alert(`「${categoryName}」分野の問題がまだありません。管理画面から問題を追加してください。`);
    return;
  }

  state.drill = {
    category: categoryName,
    questions: shuffleArray(filtered),
    currentIndex: 0,
    hasAnswered: false
  };

  elements.drillCategoryGrid.parentElement.classList.add('hidden');
  elements.drillActiveView.classList.remove('hidden');
  renderCurrentDrillQuestion();
}

function renderCurrentDrillQuestion() {
  const { currentIndex, questions } = state.drill;
  const q = questions[currentIndex];
  state.drill.hasAnswered = false;

  elements.drillProgressText.textContent = `問題 ${currentIndex + 1} / ${questions.length}`;
  elements.drillCategoryName.textContent = q.category;
  elements.drillQuestionText.textContent = q.question;
  elements.drillExplanationBox.classList.add('hidden');

  const letters = ['①', '②', '③', '④'];
  elements.drillChoicesContainer.innerHTML = '';
  q.choices.forEach((choiceText, idx) => {
    const item = document.createElement('div');
    item.className = 'choice-item';
    item.innerHTML = `
      <div class="choice-badge">${letters[idx] || (idx + 1)}</div>
      <div class="choice-text">${escapeHtml(choiceText)}</div>
    `;

    item.addEventListener('click', () => {
      if (state.drill.hasAnswered) return;
      handleDrillAnswer(idx);
    });

    elements.drillChoicesContainer.appendChild(item);
  });
}

function speakCurrentDrillQuestion() {
  const { currentIndex, questions } = state.drill;
  const q = questions[currentIndex];
  if (!q) return;

  const drillCard = document.getElementById('drill-card') || elements.drillChoicesContainer;
  if (drillCard) {
    drillCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  let textToRead = `分野、${q.category}。問題文。${q.question}。`;
  q.choices.forEach((c, i) => {
    textToRead += `選択肢 ${i + 1}、${c}。`;
  });

  speakText(textToRead, `ドリル問題 ${currentIndex + 1} の読み上げ`);
}

function handleDrillAnswer(selectedIndex) {
  state.drill.hasAnswered = true;
  const { currentIndex, questions } = state.drill;
  const q = questions[currentIndex];
  const isCorrect = selectedIndex === q.answer;

  const choices = elements.drillChoicesContainer.children;
  for (let i = 0; i < choices.length; i++) {
    if (i === q.answer) {
      choices[i].style.borderColor = '#10b981';
      choices[i].style.backgroundColor = '#ecfdf5';
    } else if (i === selectedIndex && !isCorrect) {
      choices[i].style.borderColor = '#ef4444';
      choices[i].style.backgroundColor = '#fef2f2';
    }
  }

  elements.drillResultBanner.className = `explanation-status ${isCorrect ? 'correct' : 'wrong'}`;
  elements.drillResultBanner.textContent = isCorrect ? '🎉 正解！' : '× 不正解...';
  elements.drillExplanationText.innerHTML = renderTextWithTermLinks(q.explanation);
  elements.drillExplanationBox.classList.remove('hidden');

  const relContainer = document.getElementById('drill-relation-container');
  if (relContainer) {
    if (q.relationNote || (q.relatedTerms && q.relatedTerms.length > 0)) {
      relContainer.classList.remove('hidden');
      relContainer.innerHTML = `
        <div style="font-size:0.8rem; font-weight:700; color:var(--accent-color); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <span>🔗 知識の系譜・試験リレーション</span>
        </div>
        ${q.relationNote ? `<div style="font-size:0.85rem; color:var(--text-main); margin-bottom:6px; line-height:1.5;">${renderTextWithTermLinks(q.relationNote)}</div>` : ''}
        ${q.relatedTerms && q.relatedTerms.length > 0 ? `
          <div style="display:flex; flex-wrap:wrap; gap:6px; align-items:center;">
            <span style="font-size:0.75rem; color:var(--text-muted);">関連用語:</span>
            ${q.relatedTerms.map(rt => `<span class="rel-term-pill term-link" data-term-id="${escapeHtml(rt)}">🏷️ ${escapeHtml(rt)}</span>`).join('')}
          </div>
        ` : ''}
      `;
    } else {
      relContainer.classList.add('hidden');
      relContainer.innerHTML = '';
    }
  }

  attachTermLinkEvents();

  if (currentIndex === questions.length - 1) {
    elements.btnDrillNext.textContent = '分野選択に戻る';
  } else {
    elements.btnDrillNext.textContent = '次の問題へ進む ▶';
  }
}

function speakCurrentDrillExplanation() {
  const { currentIndex, questions } = state.drill;
  const q = questions[currentIndex];
  if (!q) return;
  speakText(`解説。${q.explanation}`, `ドリル解説の読み上げ`);
}

// ==========================================
// 3. 用語集ロジック
// ==========================================
function renderTermsList() {
  const query = elements.termsSearchInput.value.toLowerCase().trim();
  const selectedCat = elements.termsCategoryFilter.value;

  const filtered = state.terms.filter(t => {
    const matchCat = (selectedCat === 'all' || t.category === selectedCat);
    const matchQuery = !query || 
      t.term.toLowerCase().includes(query) || 
      t.summary.toLowerCase().includes(query) || 
      (t.details && t.details.toLowerCase().includes(query));
    return matchCat && matchQuery;
  });

  elements.termsContainer.innerHTML = '';
  if (filtered.length === 0) {
    elements.termsContainer.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1; text-align:center; padding:2rem;">該当する用語が見つかりませんでした。</p>';
    return;
  }

  filtered.forEach(t => {
    const stars = '★'.repeat(t.importance || 3);
    const card = document.createElement('div');
    card.className = 'term-card';
    card.innerHTML = `
      <div class="term-header">
        <span class="term-title">${escapeHtml(t.term)}</span>
        <span class="term-stars" title="重要度: ${stars}">${stars}</span>
      </div>
      <span class="badge-tag" style="margin-bottom:8px;">${escapeHtml(t.category)}</span>
      <div class="term-summary">${escapeHtml(t.summary)}</div>
      ${t.details ? `<div class="term-details">${renderTextWithTermLinks(t.details)}</div>` : ''}
      ${(t.relationNote || (t.relatedTerms && t.relatedTerms.length > 0)) ? `
        <div style="margin-top:10px; padding:8px 10px; background:rgba(99,102,241,0.06); border-radius:6px; font-size:0.8rem;">
          ${t.relationNote ? `<div style="margin-bottom:6px; color:var(--text-main); line-height:1.4;">${renderTextWithTermLinks(t.relationNote)}</div>` : ''}
          ${t.relatedTerms && t.relatedTerms.length > 0 ? `
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              ${t.relatedTerms.map(rt => `<span class="rel-term-pill term-link" data-term-id="${escapeHtml(rt)}" style="font-size:0.75rem;">🏷️ ${escapeHtml(rt)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      <div class="term-card-footer">
        <button class="btn btn-outline btn-sm btn-speak-term" data-term-id="${t.id}">🔊 音声で聞く</button>
      </div>
    `;
    elements.termsContainer.appendChild(card);
  });

  attachTermLinkEvents();

  document.querySelectorAll('.btn-speak-term').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tId = e.currentTarget.dataset.termId;
      const term = state.terms.find(item => item.id === tId);
      if (term) {
        speakText(`${term.term}。重要度 ${term.importance}。${term.summary}。${term.details || ''}`, `${term.term} の解説`);
      }
    });
  });
}

function attachTermLinkEvents() {
  document.querySelectorAll('.term-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const termId = e.currentTarget.dataset.termId;
      openTermModal(termId);
    });
  });
}

// ==========================================
// 4. 手動問題登録 & 一覧テーブル
// ==========================================
async function handleAddQuestionSubmit(e) {
  e.preventDefault();

  const selectedAnsRadio = document.querySelector('input[name="form-answer"]:checked');
  if (!selectedAnsRadio) {
    alert("正解の選択肢を選択してください。");
    return;
  }

  const payload = {
    category: elements.formCategory.value,
    source: elements.formSource.value,
    question: elements.formQuestion.value,
    choices: elements.choiceInputs.map(input => input.value.trim()),
    answer: parseInt(selectedAnsRadio.value, 10),
    explanation: elements.formExplanation.value
  };

  try {
    if (state.isServerMode) {
      const res = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '登録に失敗しました');
      }

      showToast("🎉 問題が登録され、ローカルJSONに即座に反映されました！");
      const freshQuestions = await fetch('/api/questions').then(r => r.json());
      state.questions = freshQuestions;
    } else {
      // GitHub Pages / スマホ（静的）環境: LocalStorage に保存
      const nowStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const newQuestion = {
        id: `q_m_${nowStr}`,
        ...payload,
        createdAt: new Date().toISOString().slice(0, 10)
      };

      const stored = getStoredManualQuestions();
      stored.unshift(newQuestion);
      saveStoredManualQuestions(stored);

      state.questions = [newQuestion, ...state.questions];
      showToast("🎉 問題が登録され、スマホ端末（LocalStorage）に保存されました！");
    }

    elements.formQuestion.value = '';
    elements.choiceInputs.forEach(inp => inp.value = '');
    elements.formExplanation.value = '';

    updateHeaderStats();
    renderAdminTable();
    renderDrillCategories();
  } catch (err) {
    alert(`エラー: ${err.message}`);
  }
}

async function deleteQuestion(id) {
  if (!confirm(`問題（ID: ${id}）を削除してもよろしいですか？\nこの操作は元に戻せません。`)) {
    return;
  }

  try {
    if (state.isServerMode) {
      const res = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('削除に失敗しました');
      state.questions = await fetch('/api/questions').then(r => r.json());
    } else {
      // LocalStorageから削除
      const stored = getStoredManualQuestions();
      const filtered = stored.filter(q => q.id !== id);
      saveStoredManualQuestions(filtered);
      state.questions = state.questions.filter(q => q.id !== id);
    }

    showToast("問題を削除しました");
    updateHeaderStats();
    renderAdminTable();
    renderDrillCategories();
  } catch (err) {
    alert(`エラー: ${err.message}`);
  }
}

function renderAdminTable() {
  const query = elements.adminSearchInput.value.toLowerCase().trim();
  const filtered = state.questions.filter(q => {
    return !query || q.question.toLowerCase().includes(query) || q.category.toLowerCase().includes(query);
  });

  elements.adminTableCount.textContent = filtered.length;
  elements.adminQuestionsTbody.innerHTML = '';

  const letters = ['①', '②', '③', '④'];

  filtered.forEach(q => {
    const tr = document.createElement('tr');
    const isManual = q.source && q.source.includes('手動');

    tr.innerHTML = `
      <td><code>${escapeHtml(q.id)}</code></td>
      <td><span class="category-badge" style="margin:0;">${escapeHtml(q.category)}</span></td>
      <td title="${escapeHtml(q.question)}">${escapeHtml(q.question.length > 45 ? q.question.slice(0, 45) + '...' : q.question)}</td>
      <td><strong>${letters[q.answer] || (q.answer + 1)}</strong></td>
      <td><span class="badge-source ${isManual ? 'badge-source-manual' : 'badge-source-initial'}">${escapeHtml(q.source || '初期')}</span></td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="window.deleteQuestion('${q.id}')">削除</button>
      </td>
    `;
    elements.adminQuestionsTbody.appendChild(tr);
  });
}

window.deleteQuestion = deleteQuestion;

// ==========================================
// 6. 各セクション・重要用語 聞き流しモード（Audio Flow）
// ==========================================

// --- スリープ防止 (Screen Wake Lock) & タイムアウト防止キープアライブ ---
let wakeLockSentinel = null;
let silentKeepAliveAudio = null;
let speechHeartbeatTimer = null;

async function requestScreenWakeLock() {
  if (!state.audioFlow.preventSleep) return;
  if ('wakeLock' in navigator) {
    try {
      if (!wakeLockSentinel) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
        wakeLockSentinel.addEventListener('release', () => {
          wakeLockSentinel = null;
          updateWakeLockUI(false);
        });
        updateWakeLockUI(true);
      }
    } catch (err) {
      console.warn('Screen WakeLock unavailable or rejected:', err);
      updateWakeLockUI(false);
    }
  }
}

function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
  updateWakeLockUI(false);
}

function updateWakeLockUI(active) {
  if (elements.flowWakeLockPill) {
    if (active) {
      elements.flowWakeLockPill.classList.remove('hidden');
    } else {
      elements.flowWakeLockPill.classList.add('hidden');
    }
  }
}

function startAudioKeepAlive(itemTitle = "G検定 聞き流し学習") {
  // MediaSession API（ロック画面・イヤホン操作対応）
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: itemTitle,
        artist: 'G検定マスター',
        album: '各章 聞き流し学習'
      });
      navigator.mediaSession.setActionHandler('play', () => togglePlayPauseAudioFlow());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPauseAudioFlow());
      navigator.mediaSession.setActionHandler('nexttrack', () => playNextAudioFlow(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevAudioFlow());
    } catch (e) {
      console.warn('MediaSession setup warning:', e);
    }
  }
}

function stopAudioKeepAlive() {
  // 必要に応じたクリーンアップ
}

// 画面再表示時にWakeLockを再取得
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.audioFlow && state.audioFlow.isPlaying && !state.audioFlow.isPaused) {
    requestScreenWakeLock();
  }
});

function populateFlowCategorySelect() {
  if (!elements.flowCategorySelect) return;
  const currentVal = elements.flowCategorySelect.value || 'all';
  elements.flowCategorySelect.innerHTML = '<option value="all">🎯 すべての分野をまとめて再生</option>';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = `${cat.name}`;
    elements.flowCategorySelect.appendChild(opt);
  });
  elements.flowCategorySelect.value = currentVal;
}

function initAudioFlow() {
  populateFlowCategorySelect();
  if (!state.audioFlow.items || state.audioFlow.items.length === 0) {
    loadAudioFlowItems();
  } else {
    updateAudioFlowCard();
    renderAudioFlowPlaylist();
  }
}

function setAudioFlowMode(mode) {
  if (state.audioFlow.mode === mode && state.audioFlow.items.length > 0) return;
  stopAudioFlow();
  state.audioFlow.mode = mode;

  elements.flowModeBtnQuestions.classList.toggle('active', mode === 'questions');
  if (elements.flowModeBtnRelation) {
    elements.flowModeBtnRelation.classList.toggle('active', mode === 'relation');
  }
  elements.flowModeBtnTerms.classList.toggle('active', mode === 'terms');

  if (elements.flowThinkingToggle && elements.flowThinkingToggle.parentElement) {
    elements.flowThinkingToggle.parentElement.style.display = (mode === 'terms') ? 'none' : 'inline-flex';
  }

  loadAudioFlowItems();
}

// リレーション特訓用: 用語と実践問題のペアリング生成
function buildRelationFlowItems(selectedCategory) {
  const targetTerms = (selectedCategory === 'all')
    ? [...state.terms]
    : state.terms.filter(t => t.category === selectedCategory);

  // 重要度順（★★★ -> ★★ -> ★）
  targetTerms.sort((a, b) => (b.importance || 1) - (a.importance || 1));

  const items = [];
  const usedQIds = new Set();

  targetTerms.forEach(term => {
    const cleanTerm = term.term.split('(')[0].trim().toLowerCase();

    // 最適な実践問題を探索
    let matchedQ = state.questions.find(q => {
      if (usedQIds.has(q.id)) return false;
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
      const fullText = (q.question + ' ' + q.choices.join(' ') + ' ' + (q.explanation || '')).toLowerCase();
      return fullText.includes(cleanTerm) || (q.relatedTerms && q.relatedTerms.some(rt => rt.toLowerCase().includes(cleanTerm) || cleanTerm.includes(rt.toLowerCase())));
    });

    if (!matchedQ) {
      matchedQ = state.questions.find(q => {
        if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
        const fullText = (q.question + ' ' + q.choices.join(' ') + ' ' + (q.explanation || '')).toLowerCase();
        return fullText.includes(cleanTerm);
      });
    }

    if (!matchedQ && state.questions.length > 0) {
      matchedQ = (selectedCategory === 'all')
        ? state.questions[items.length % state.questions.length]
        : state.questions.find(q => q.category === selectedCategory) || state.questions[0];
    }

    if (matchedQ) {
      usedQIds.add(matchedQ.id);
      items.push({
        type: 'relation_pair',
        id: `rel_${term.id}_${matchedQ.id}`,
        term: term,
        question: matchedQ,
        category: term.category,
        relatedTerms: [...new Set([term.term.split('(')[0].trim(), ...(matchedQ.relatedTerms || [])])],
        relationNote: matchedQ.relationNote || term.relationNote || ''
      });
    }
  });

  return items;
}

function loadAudioFlowItems() {
  const cat = elements.flowCategorySelect ? elements.flowCategorySelect.value : 'all';
  state.audioFlow.category = cat;

  if (state.audioFlow.mode === 'questions') {
    if (cat === 'all') {
      state.audioFlow.items = [...state.questions];
    } else {
      state.audioFlow.items = state.questions.filter(q => q.category === cat);
    }
  } else if (state.audioFlow.mode === 'terms') {
    if (cat === 'all') {
      state.audioFlow.items = [...state.terms];
    } else {
      state.audioFlow.items = state.terms.filter(t => t.category === cat);
    }
  } else if (state.audioFlow.mode === 'relation') {
    state.audioFlow.items = buildRelationFlowItems(cat);
  }

  state.audioFlow.currentIndex = 0;
  updateAudioFlowCard();
  renderAudioFlowPlaylist();
}

function updateAudioFlowCard() {
  const items = state.audioFlow.items;
  const idx = state.audioFlow.currentIndex;

  if (!items || items.length === 0) {
    elements.flowCounterText.textContent = '0 / 0 項目';
    elements.flowCurrentCategoryPill.textContent = '該当なし';
    elements.flowProgressBarFill.style.width = '0%';
    elements.flowItemNum.textContent = 'なし';
    elements.flowStepPhase.textContent = '項目がありません';
    elements.flowItemTitle.textContent = '該当する問題・用語がありません。別の分野を選択してください。';
    if (elements.flowChoicesList) {
      elements.flowChoicesList.innerHTML = '';
      elements.flowChoicesList.classList.add('hidden');
    }
    elements.flowItemAnswerBox.classList.add('hidden');
    elements.flowItemExplanationBox.classList.add('hidden');
    if (elements.flowItemRelationBox) elements.flowItemRelationBox.classList.add('hidden');
    return;
  }

  const current = items[idx];
  elements.flowCounterText.textContent = `${idx + 1} / ${items.length} 項目`;
  elements.flowCurrentCategoryPill.textContent = current.category || '全般';
  const progressPercent = Math.round(((idx + 1) / items.length) * 100);
  elements.flowProgressBarFill.style.width = `${progressPercent}%`;

  if (state.audioFlow.mode === 'relation') {
    // ------------------------------------------
    // 🔗 リレーション特訓モード
    // ------------------------------------------
    const isTermPhase = (state.audioFlow.phase === 'term' || state.audioFlow.phase === 'idle');
    const isAnswerPhase = (state.audioFlow.phase === 'explanation');

    if (isTermPhase) {
      const stars = '★'.repeat(current.term.importance || 3);
      elements.flowItemNum.textContent = `【リレーション特訓 #${idx + 1}】重要用語 (${stars})`;
      elements.flowItemTitle.textContent = current.term.term;
      if (elements.flowChoicesList) {
        elements.flowChoicesList.innerHTML = '';
        elements.flowChoicesList.classList.add('hidden');
      }
      elements.flowItemAnswerBox.querySelector('.flow-ans-label').textContent = '要約:';
      elements.flowItemAnswerText.textContent = current.term.summary || '';
      elements.flowItemExplanationText.innerHTML = renderTextWithTermLinks(current.term.details || current.term.explanation || '');
      elements.flowItemAnswerBox.classList.remove('hidden');
      elements.flowItemExplanationBox.classList.remove('hidden');
    } else {
      elements.flowItemNum.textContent = `【リレーション特訓 #${idx + 1}】実践問題 (${current.term.term.split('(')[0].trim()})`;
      elements.flowItemTitle.textContent = current.question.question;

      const ansIdx = current.question.answer !== undefined ? current.question.answer : 0;
      const ansText = current.question.choices && current.question.choices[ansIdx] ? current.question.choices[ansIdx] : '';
      elements.flowItemAnswerBox.querySelector('.flow-ans-label').textContent = '正解:';
      elements.flowItemAnswerText.textContent = `選択肢 ${ansIdx + 1} : ${ansText}`;
      elements.flowItemExplanationText.innerHTML = renderTextWithTermLinks(current.question.explanation || '');

      if (elements.flowChoicesList) {
        elements.flowChoicesList.innerHTML = '';
        elements.flowChoicesList.classList.remove('hidden');
        if (current.question.choices && Array.isArray(current.question.choices)) {
          current.question.choices.forEach((choice, cIdx) => {
            const choiceEl = document.createElement('div');
            const isCorrect = isAnswerPhase && (cIdx === ansIdx);
            choiceEl.className = `flow-choice-item ${isCorrect ? 'correct' : ''}`;
            choiceEl.innerHTML = `
              <span class="flow-choice-badge">${cIdx + 1}</span>
              <span class="flow-choice-text">${escapeHtml(choice)}</span>
            `;
            elements.flowChoicesList.appendChild(choiceEl);
          });
        }
      }

      if (isAnswerPhase) {
        elements.flowItemAnswerBox.classList.remove('hidden');
        elements.flowItemExplanationBox.classList.remove('hidden');
      } else {
        elements.flowItemAnswerBox.classList.add('hidden');
        elements.flowItemExplanationBox.classList.add('hidden');
      }
    }

  } else if (state.audioFlow.mode === 'questions') {
    // ------------------------------------------
    // 📚 実践問題モード
    // ------------------------------------------
    elements.flowItemNum.textContent = `第 ${idx + 1} 問`;
    elements.flowItemTitle.textContent = current.question;
    const ansIdx = current.answer !== undefined ? current.answer : 0;
    const ansText = current.choices && current.choices[ansIdx] ? current.choices[ansIdx] : '';
    elements.flowItemAnswerBox.querySelector('.flow-ans-label').textContent = '正解:';
    elements.flowItemAnswerText.textContent = `選択肢 ${ansIdx + 1} : ${ansText}`;
    elements.flowItemExplanationText.innerHTML = renderTextWithTermLinks(current.explanation || '');

    const isAnswerPhase = (state.audioFlow.phase === 'explanation');

    if (elements.flowChoicesList) {
      elements.flowChoicesList.innerHTML = '';
      elements.flowChoicesList.classList.remove('hidden');

      if (current.choices && Array.isArray(current.choices)) {
        current.choices.forEach((choice, cIdx) => {
          const choiceEl = document.createElement('div');
          const isCorrect = isAnswerPhase && (cIdx === ansIdx);
          choiceEl.className = `flow-choice-item ${isCorrect ? 'correct' : ''}`;
          choiceEl.innerHTML = `
            <span class="flow-choice-badge">${cIdx + 1}</span>
            <span class="flow-choice-text">${escapeHtml(choice)}</span>
          `;
          elements.flowChoicesList.appendChild(choiceEl);
        });
      }
    }

    if (isAnswerPhase) {
      elements.flowItemAnswerBox.classList.remove('hidden');
      elements.flowItemExplanationBox.classList.remove('hidden');
    } else {
      elements.flowItemAnswerBox.classList.add('hidden');
      elements.flowItemExplanationBox.classList.add('hidden');
    }

  } else {
    // ------------------------------------------
    // 📖 重要用語集モード
    // ------------------------------------------
    if (elements.flowChoicesList) {
      elements.flowChoicesList.innerHTML = '';
      elements.flowChoicesList.classList.add('hidden');
    }
    const stars = '★'.repeat(current.importance || 1);
    elements.flowItemNum.textContent = `重要用語 (${stars})`;
    elements.flowItemTitle.textContent = current.term;
    elements.flowItemAnswerBox.querySelector('.flow-ans-label').textContent = '要約:';
    elements.flowItemAnswerText.textContent = current.summary || '';
    elements.flowItemExplanationText.innerHTML = renderTextWithTermLinks(current.details || current.explanation || '');
    elements.flowItemAnswerBox.classList.remove('hidden');
    elements.flowItemExplanationBox.classList.remove('hidden');
  }

  // ------------------------------------------
  // 🔗 共通: 体系的リレーションボックスの描画
  // ------------------------------------------
  if (elements.flowItemRelationBox) {
    const relNote = current.relationNote || (current.term && current.term.relationNote) || '';
    const relTerms = current.relatedTerms || (current.term && current.term.relatedTerms) || [];

    if (relNote || relTerms.length > 0) {
      elements.flowItemRelationBox.classList.remove('hidden');

      if (elements.flowRelNote) {
        elements.flowRelNote.textContent = relNote;
      }

      if (elements.flowRelTermsContainer) {
        elements.flowRelTermsContainer.innerHTML = '';
        relTerms.forEach(relName => {
          const matched = state.terms.find(t => t.term.includes(relName) || relName.includes(t.term.split('(')[0].trim()));
          const pill = document.createElement('span');
          pill.className = 'rel-term-pill';
          pill.textContent = `🏷️ ${relName}`;
          pill.title = 'タップして解説を表示';
          if (matched) {
            pill.addEventListener('click', (e) => {
              e.stopPropagation();
              openTermModal(matched.id);
            });
          }
          elements.flowRelTermsContainer.appendChild(pill);
        });
      }

      // 用語モード時: 出題された実践問題へのジャンプボタン
      if (elements.flowRelQuestionsContainer) {
        elements.flowRelQuestionsContainer.innerHTML = '';
        if (state.audioFlow.mode === 'terms') {
          const cleanName = current.term.split('(')[0].trim().toLowerCase();
          const matchedQs = state.questions.filter(q => {
            const fullText = (q.question + ' ' + q.choices.join(' ') + ' ' + (q.explanation || '')).toLowerCase();
            return fullText.includes(cleanName) || (q.relatedTerms && q.relatedTerms.some(rt => rt.toLowerCase().includes(cleanName) || cleanName.includes(rt.toLowerCase())));
          }).slice(0, 2);

          if (matchedQs.length > 0) {
            elements.flowRelQuestionsContainer.classList.remove('hidden');
            matchedQs.forEach(q => {
              const qIndex = state.questions.findIndex(item => item.id === q.id);
              const btn = document.createElement('button');
              btn.className = 'rel-question-btn';
              btn.innerHTML = `<span>🎯 出題実践問題: 第 ${qIndex + 1} 問</span>`;
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                startAudioFlowForCategory(q.category, 'questions', q.id);
              });
              elements.flowRelQuestionsContainer.appendChild(btn);
            });
          } else {
            elements.flowRelQuestionsContainer.classList.add('hidden');
          }
        } else {
          elements.flowRelQuestionsContainer.classList.add('hidden');
        }
      }
    } else {
      elements.flowItemRelationBox.classList.add('hidden');
    }
  }

  // プレイリストのアクティブハイライト更新
  const plItems = elements.flowPlaylist.querySelectorAll('.flow-playlist-item');
  plItems.forEach((el, i) => {
    if (i === idx) {
      el.classList.add('active');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      el.classList.remove('active');
    }
  });
}

function renderAudioFlowPlaylist() {
  elements.flowPlaylist.innerHTML = '';
  const items = state.audioFlow.items;
  elements.flowListCount.textContent = items.length;

  items.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = `flow-playlist-item ${index === state.audioFlow.currentIndex ? 'active' : ''}`;

    let titleText = '';
    let badgeText = '';

    if (state.audioFlow.mode === 'relation') {
      titleText = `🏷️ ${item.term.term.split('(')[0].trim()} ➔ 🎯 実践問題: ${item.question.question}`;
      badgeText = `🔗 リレーション (★${item.term.importance || 3})`;
    } else if (state.audioFlow.mode === 'questions') {
      titleText = item.question;
      badgeText = item.category ? item.category.slice(0, 8) + '...' : '';
    } else {
      titleText = item.term;
      badgeText = `★${item.importance || 1}`;
    }

    div.innerHTML = `
      <span class="flow-pl-index">#${index + 1}</span>
      <span class="flow-pl-title" title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</span>
      <span class="flow-pl-badge">${escapeHtml(badgeText)}</span>
    `;

    div.addEventListener('click', () => {
      jumpToAudioFlowItem(index);
    });

    elements.flowPlaylist.appendChild(div);
  });
}

function jumpToAudioFlowItem(index) {
  if (state.audioFlow.timerId) {
    clearTimeout(state.audioFlow.timerId);
    state.audioFlow.timerId = null;
  }
  state.audioFlow.currentIndex = index;
  state.audioFlow.phase = state.audioFlow.isPlaying
    ? (state.audioFlow.mode === 'questions' ? 'question' : 'term')
    : 'idle';
  updateAudioFlowCard();

  if (state.audioFlow.isPlaying) {
    playAudioFlowCurrentItem();
  }
}

function togglePlayPauseAudioFlow() {
  if (!state.audioFlow.items || state.audioFlow.items.length === 0) {
    showToast("⚠️ 再生対象がありません");
    return;
  }

  if (!state.audioFlow.isPlaying) {
    state.audioFlow.isPlaying = true;
    state.audioFlow.isPaused = false;
    requestScreenWakeLock();
    startAudioKeepAlive();
    playAudioFlowCurrentItem();
  } else if (state.audioFlow.isPaused) {
    state.audioFlow.isPaused = false;
    requestScreenWakeLock();
    startAudioKeepAlive();
    elements.btnFlowPlayPause.textContent = '⏸ 一時停止';
    elements.flowStatusBadge.textContent = '再生中 🔊';
    elements.flowStatusBadge.className = 'flow-status-badge playing';
    if (state.tts.synth && state.tts.synth.paused) {
      state.tts.synth.resume();
    } else {
      playAudioFlowCurrentItem();
    }
  } else {
    state.audioFlow.isPaused = true;
    releaseScreenWakeLock();
    stopAudioKeepAlive();
    if (state.audioFlow.timerId) {
      clearTimeout(state.audioFlow.timerId);
      state.audioFlow.timerId = null;
    }
    if (state.tts.synth) {
      state.tts.synth.pause();
    }
    elements.btnFlowPlayPause.textContent = '▶ 再開する';
    elements.flowStatusBadge.textContent = '一時停止 ⏸';
    elements.flowStatusBadge.className = 'flow-status-badge paused';
  }
}

let currentFlowUtterance = null;

// 読み上げ中の該当箇所ハイライト＆自動スクロール追従
function highlightFlowElement(targetType, choiceIndex = null) {
  clearFlowHighlights();

  let elToHighlight = null;

  if (targetType === 'question' || targetType === 'term-title') {
    if (elements.flowItemTitle) {
      elements.flowItemTitle.classList.add('flow-reading-active');
      elToHighlight = elements.flowItemTitle;
    }
  } else if (targetType === 'choice' && choiceIndex !== null) {
    if (elements.flowChoicesList) {
      const choiceItems = elements.flowChoicesList.querySelectorAll('.flow-choice-item');
      if (choiceItems[choiceIndex]) {
        choiceItems[choiceIndex].classList.add('flow-reading-active');
        elToHighlight = choiceItems[choiceIndex];
      }
    }
  } else if (targetType === 'answer' || targetType === 'term-summary') {
    if (elements.flowItemAnswerBox) {
      elements.flowItemAnswerBox.classList.remove('hidden');
      elements.flowItemAnswerBox.classList.add('flow-reading-active');
      elToHighlight = elements.flowItemAnswerBox;
    }
  } else if (targetType === 'explanation' || targetType === 'term-explanation') {
    if (elements.flowItemExplanationBox) {
      elements.flowItemExplanationBox.classList.remove('hidden');
      elements.flowItemExplanationBox.classList.add('flow-reading-active');
      elToHighlight = elements.flowItemExplanationBox;
    }
  } else if (targetType === 'relation') {
    if (elements.flowItemRelationBox) {
      elements.flowItemRelationBox.classList.remove('hidden');
      elements.flowItemRelationBox.classList.add('flow-reading-active');
      elToHighlight = elements.flowItemRelationBox;
    }
  }

  // 自動スクロール追従（ヘッダーと被らず、視界中央〜上部にスムーズに収める）
  if (elToHighlight) {
    try {
      elToHighlight.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      // さらにスマートフォン等で固定ヘッダーに隠れていないかチェックして微調整
      const rect = elToHighlight.getBoundingClientRect();
      const headerOffset = 90; // 固定ヘッダー・タブの高さマージン
      if (rect.top < headerOffset) {
        window.scrollBy({ top: rect.top - headerOffset - 12, behavior: 'smooth' });
      } else if (rect.bottom > window.innerHeight - 30) {
        window.scrollBy({ top: rect.bottom - window.innerHeight + 40, behavior: 'smooth' });
      }
    } catch (e) {
      elToHighlight.scrollIntoView();
    }
  }
}

function clearFlowHighlights() {
  if (elements.flowItemTitle) elements.flowItemTitle.classList.remove('flow-reading-active');
  if (elements.flowItemAnswerBox) elements.flowItemAnswerBox.classList.remove('flow-reading-active');
  if (elements.flowItemExplanationBox) elements.flowItemExplanationBox.classList.remove('flow-reading-active');
  if (elements.flowItemRelationBox) elements.flowItemRelationBox.classList.remove('flow-reading-active');
  if (elements.flowChoicesList) {
    const choiceItems = elements.flowChoicesList.querySelectorAll('.flow-choice-item');
    choiceItems.forEach(item => item.classList.remove('flow-reading-active'));
  }
}

function stopAudioFlow() {
  releaseScreenWakeLock();
  stopAudioKeepAlive();

  if (state.audioFlow.timerId) {
    clearTimeout(state.audioFlow.timerId);
    state.audioFlow.timerId = null;
  }

  if (currentFlowUtterance) {
    currentFlowUtterance.onend = null;
    currentFlowUtterance.onerror = null;
    currentFlowUtterance = null;
  }

  if (state.tts.synth) {
    state.tts.synth.cancel();
  }

  clearFlowHighlights();
  state.audioFlow.isPlaying = false;
  state.audioFlow.isPaused = false;
  state.audioFlow.phase = 'idle';

  elements.flowStatusBadge.textContent = '⏹ 停止中';
  elements.flowStatusBadge.className = 'flow-status-badge';
  elements.btnFlowPlayPause.textContent = '▶ 聞き流しを開始';
  elements.flowStepPhase.textContent = '「聞き流しを開始」ボタンを押すと音声学習がスタートします';
  updateAudioFlowCard();
}

function playNextAudioFlow(isAuto = false) {
  if (state.audioFlow.timerId) {
    clearTimeout(state.audioFlow.timerId);
    state.audioFlow.timerId = null;
  }

  if (currentFlowUtterance) {
    currentFlowUtterance.onend = null;
    currentFlowUtterance.onerror = null;
    currentFlowUtterance = null;
  }

  if (state.tts.synth) {
    state.tts.synth.cancel();
  }

  const items = state.audioFlow.items;
  if (state.audioFlow.currentIndex < items.length - 1) {
    state.audioFlow.currentIndex++;
    state.audioFlow.phase = state.audioFlow.mode === 'questions' ? 'question' : 'term';
    updateAudioFlowCard();
    if (state.audioFlow.isPlaying) {
      playAudioFlowCurrentItem();
    }
  } else {
    if (state.audioFlow.repeat) {
      state.audioFlow.currentIndex = 0;
      state.audioFlow.phase = state.audioFlow.mode === 'questions' ? 'question' : 'term';
      updateAudioFlowCard();
      showToast("🔁 最初からループ再生します");
      if (state.audioFlow.isPlaying) {
        playAudioFlowCurrentItem();
      }
    } else {
      stopAudioFlow();
      showToast("🎉 すべての項目の聞き流しが完了しました！");
    }
  }
}

function playPrevAudioFlow() {
  if (state.audioFlow.timerId) {
    clearTimeout(state.audioFlow.timerId);
    state.audioFlow.timerId = null;
  }

  if (currentFlowUtterance) {
    currentFlowUtterance.onend = null;
    currentFlowUtterance.onerror = null;
    currentFlowUtterance = null;
  }

  if (state.tts.synth) {
    state.tts.synth.cancel();
  }

  if (state.audioFlow.currentIndex > 0) {
    state.audioFlow.currentIndex--;
  } else {
    state.audioFlow.currentIndex = state.audioFlow.items.length - 1;
  }
  state.audioFlow.phase = state.audioFlow.mode === 'questions' ? 'question' : 'term';
  updateAudioFlowCard();
  if (state.audioFlow.isPlaying) {
    playAudioFlowCurrentItem();
  }
}

function speakTextFlow(text, targetIndex, onEnd) {
  if (!state.tts.synth) {
    if (onEnd && state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === targetIndex) {
      onEnd();
    }
    return;
  }

  // 以前のタイマーを停止
  if (state.audioFlow.timerId) {
    clearTimeout(state.audioFlow.timerId);
    state.audioFlow.timerId = null;
  }

  // 既存の発話イベントハンドラを解除してからキャンセル（キャンセルによる誤発火を完全に遮断）
  if (currentFlowUtterance) {
    currentFlowUtterance.onend = null;
    currentFlowUtterance.onerror = null;
    currentFlowUtterance = null;
  }
  state.tts.synth.cancel();

  const cleanText = cleanTextForSpeech(text);
  if (!cleanText || cleanText.trim() === '') {
    if (onEnd && state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === targetIndex) {
      onEnd();
    }
    return;
  }

  const chunks = splitTextByLanguage(cleanText);
  if (chunks.length === 0) {
    if (onEnd && state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === targetIndex) {
      onEnd();
    }
    return;
  }

  let chunkIdx = 0;

  function speakNextFlowChunk() {
    if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== targetIndex) {
      currentFlowUtterance = null;
      return;
    }

    if (chunkIdx >= chunks.length) {
      currentFlowUtterance = null;
      if (onEnd && state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === targetIndex) {
        onEnd();
      }
      return;
    }

    const chunk = chunks[chunkIdx];
    chunkIdx++;

    const isEn = (chunk.lang === 'en');
    const utterance = new SpeechSynthesisUtterance(chunk.text);
    currentFlowUtterance = utterance;

    // 英語部分は英語ネイティブ音声（en-US/en-GB）、日本語部分は日本語音声（ja-JP）を使用
    if (isEn && state.tts.enVoice) {
      utterance.voice = state.tts.enVoice;
      utterance.lang = state.tts.enVoice.lang || 'en-US';
    } else if (!isEn && state.tts.voice) {
      utterance.voice = state.tts.voice;
      utterance.lang = 'ja-JP';
    } else {
      utterance.lang = isEn ? 'en-US' : 'ja-JP';
    }

    utterance.rate = state.audioFlow.speed || 1.0;
    utterance.pitch = 1.0;

    let hasEnded = false;

    utterance.onend = () => {
      if (hasEnded) return;
      hasEnded = true;
      speakNextFlowChunk();
    };

    utterance.onerror = (e) => {
      if (hasEnded) return;
      hasEnded = true;
      currentFlowUtterance = null;

      // スキップや一時停止等による正常な中断・キャンセルの場合は絶対に次へスキップしない
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return;
      }

      console.warn("AudioFlow TTS Error:", e.error);
      // エラー時も次のチャンクへ復帰
      if (state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === targetIndex) {
        speakNextFlowChunk();
      }
    };

    state.tts.synth.speak(utterance);
  }

  speakNextFlowChunk();
}

function playAudioFlowCurrentItem() {
  const items = state.audioFlow.items;
  const idx = state.audioFlow.currentIndex;
  if (!items || items.length === 0 || idx >= items.length) return;

  const current = items[idx];

  // まず状態フェーズを設定
  if (state.audioFlow.mode === 'questions') {
    state.audioFlow.phase = 'question';
  } else if (state.audioFlow.mode === 'terms') {
    state.audioFlow.phase = 'term';
  } else {
    // relation モードは用語フェーズから開始
    state.audioFlow.phase = 'term';
  }

  updateAudioFlowCard();
  clearFlowHighlights();

  // スリープ防止 & キープアライブ起動
  requestScreenWakeLock();
  let currentTitle = 'G検定 聞き流し学習';
  if (state.audioFlow.mode === 'questions') {
    currentTitle = `第${idx + 1}問: ${current.question.slice(0, 25)}...`;
  } else if (state.audioFlow.mode === 'terms') {
    currentTitle = `用語: ${current.term}`;
  } else if (state.audioFlow.mode === 'relation') {
    currentTitle = `🔗特訓: ${current.term.term.split('(')[0].trim()}`;
  }
  startAudioKeepAlive(currentTitle);

  elements.btnFlowPlayPause.textContent = '⏸ 一時停止';
  elements.flowStatusBadge.textContent = '再生中 🔊';
  elements.flowStatusBadge.className = 'flow-status-badge playing';

  if (state.audioFlow.mode === 'relation') {
    // ==========================================
    // 🔗 リレーション特訓モード
    // ==========================================
    elements.flowStepPhase.textContent = '📖 【リレーション特訓 1/3】重要用語のエッセンス...';
    highlightFlowElement('term-title');

    const stars = '星 ' + (current.term.importance || 3);
    const termSpeech = `重要用語、${current.term.term}。重要度、${stars}。要約、${current.term.summary}。詳細解説、${current.term.details || current.term.explanation || ''}。`;

    speakTextFlow(termSpeech, idx, () => {
      if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

      // 続いて実践問題フェーズへ切り替え
      state.audioFlow.phase = 'question';
      updateAudioFlowCard();
      elements.flowStepPhase.textContent = '🎯 【リレーション特訓 2/3】この用語が出題された実践問題...';
      highlightFlowElement('question');

      const qSpeech = `続いて、この用語が出題された実践問題です。問題文。${current.question.question}。`;

      speakTextFlow(qSpeech, idx, () => {
        const choices = current.question.choices || [];
        if (choices.length > 0) {
          let choiceIdx = 0;

          function readNextChoiceRel() {
            if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;
            if (choiceIdx < choices.length) {
              highlightFlowElement('choice', choiceIdx);
              elements.flowStepPhase.textContent = `🔊 選択肢 ${choiceIdx + 1} を読み上げ中...`;
              const prefix = choiceIdx === 0 ? '選択肢。' : '';
              const cSpeech = `${prefix}${choiceIdx + 1} 番、${choices[choiceIdx]}。`;
              choiceIdx++;
              speakTextFlow(cSpeech, idx, () => {
                readNextChoiceRel();
              });
            } else {
              clearFlowHighlights();
              startThinkingPhase(current, idx);
            }
          }

          readNextChoiceRel();
        } else {
          clearFlowHighlights();
          startThinkingPhase(current, idx);
        }
      });
    });

  } else if (state.audioFlow.mode === 'questions') {
    // ==========================================
    // 📚 実践問題モード
    // ==========================================
    elements.flowStepPhase.textContent = '🔊 問題文を読み上げ中...';
    highlightFlowElement('question');
    const qSpeech = `第 ${idx + 1} 問。分野、${current.category}。問題文。${current.question}。`;

    speakTextFlow(qSpeech, idx, () => {
      const choices = current.choices || [];
      if (choices.length > 0) {
        let choiceIdx = 0;

        function readNextChoice() {
          if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) {
            return;
          }
          if (choiceIdx < choices.length) {
            highlightFlowElement('choice', choiceIdx);
            elements.flowStepPhase.textContent = `🔊 選択肢 ${choiceIdx + 1} を読み上げ中...`;
            const prefix = choiceIdx === 0 ? '選択肢。' : '';
            const cSpeech = `${prefix}${choiceIdx + 1} 番、${choices[choiceIdx]}。`;
            choiceIdx++;
            speakTextFlow(cSpeech, idx, () => {
              readNextChoice();
            });
          } else {
            clearFlowHighlights();
            startThinkingPhase(current, idx);
          }
        }

        readNextChoice();
      } else {
        clearFlowHighlights();
        startThinkingPhase(current, idx);
      }
    });

  } else {
    // ==========================================
    // 📖 重要用語集モード
    // ==========================================
    elements.flowStepPhase.textContent = '📖 用語名を読み上げ中...';
    highlightFlowElement('term-title');
    const termSpeech = `用語、${current.term}。`;

    speakTextFlow(termSpeech, idx, () => {
      if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

      // 2. 要約をハイライト＆自動スクロール＆読み上げ
      elements.flowStepPhase.textContent = '📖 要約を読み上げ中...';
      highlightFlowElement('term-summary');
      const summarySpeech = `要約。${current.summary || ''}。`;

      speakTextFlow(summarySpeech, idx, () => {
        if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

        // 3. 詳細解説をハイライト＆自動スクロール＆読み上げ（detailsプロパティを正確に読み上げ）
        elements.flowStepPhase.textContent = '📖 詳細解説を読み上げ中...';
        highlightFlowElement('term-explanation');
        const expSpeech = `詳細解説。${current.details || current.explanation || ''}。`;

        speakTextFlow(expSpeech, idx, () => {
          if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

          // 4. 体系的リレーションの読み上げ
          const relNote = current.relationNote || '';
          if (relNote) {
            elements.flowStepPhase.textContent = '🔗 体系的リレーションを読み上げ中...';
            highlightFlowElement('relation');
            const relSpeech = `${relNote}。`;

            speakTextFlow(relSpeech, idx, () => {
              clearFlowHighlights();
              state.audioFlow.timerId = setTimeout(() => {
                playNextAudioFlow(true);
              }, 1800);
            });
          } else {
            clearFlowHighlights();
            state.audioFlow.timerId = setTimeout(() => {
              playNextAudioFlow(true);
            }, 1500);
          }
        });
      });
    });
  }
}

function startThinkingPhase(current, idx) {
  if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

  if (state.audioFlow.thinkingTime) {
    state.audioFlow.phase = 'thinking';
    updateAudioFlowCard();
    clearFlowHighlights();
    
    let countdown = 3;
    elements.flowStepPhase.textContent = `⏱️ シンキングタイム（残り ${countdown} 秒）...`;
    elements.flowStatusBadge.textContent = '思考タイム ⏱️';
    elements.flowStatusBadge.className = 'flow-status-badge thinking';

    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0 && state.audioFlow.isPlaying && !state.audioFlow.isPaused && state.audioFlow.currentIndex === idx) {
        elements.flowStepPhase.textContent = `⏱️ シンキングタイム（残り ${countdown} 秒）...`;
      } else {
        clearInterval(countdownInterval);
      }
    }, 1000);

    state.audioFlow.timerId = setTimeout(() => {
      clearInterval(countdownInterval);
      speakAnswerAndExplanation(current, idx);
    }, 3000);
  } else {
    speakAnswerAndExplanation(current, idx);
  }
}

function speakAnswerAndExplanation(current, idx) {
  if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) {
    return;
  }

  state.audioFlow.phase = 'explanation';
  elements.flowStatusBadge.textContent = '正解・解説 🔊';
  elements.flowStatusBadge.className = 'flow-status-badge playing';
  updateAudioFlowCard();

  const isRelMode = (state.audioFlow.mode === 'relation');
  const targetQ = isRelMode ? current.question : current;

  const ansIdx = targetQ.answer !== undefined ? targetQ.answer : 0;
  const ansText = targetQ.choices && targetQ.choices[ansIdx] ? targetQ.choices[ansIdx] : '';

  // 1. 正解のハイライト（正解ボックス ＆ 正解選択肢）＆自動スクロール
  highlightFlowElement('answer');
  elements.flowStepPhase.textContent = '💡 正解を発表中...';
  const ansSpeech = `正解は、${ansIdx + 1}番、${ansText}です。`;

  speakTextFlow(ansSpeech, idx, () => {
    if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

    // 2. 詳細解説のハイライト＆自動スクロール＆読み上げ
    elements.flowStepPhase.textContent = '💡 詳細解説を読み上げ中...';
    highlightFlowElement('explanation');
    const expSpeech = `解説。${targetQ.explanation || ''}。`;

    speakTextFlow(expSpeech, idx, () => {
      if (!state.audioFlow.isPlaying || state.audioFlow.isPaused || state.audioFlow.currentIndex !== idx) return;

      // 3. 体系的リレーションのハイライト＆自動スクロール＆読み上げ
      const relNote = current.relationNote || targetQ.relationNote || '';
      if (relNote) {
        elements.flowStepPhase.textContent = isRelMode
          ? '🔗 【リレーション特訓 3/3】体系的リレーションを読み上げ中...'
          : '🔗 体系的リレーションを読み上げ中...';
        highlightFlowElement('relation');
        const transitionNotice = isRelMode ? '次のリレーション特訓へ進みます。' : '';
        const relSpeech = `${relNote}。${transitionNotice}`;

        speakTextFlow(relSpeech, idx, () => {
          clearFlowHighlights();
          state.audioFlow.timerId = setTimeout(() => {
            playNextAudioFlow(true);
          }, 2000);
        });
      } else {
        clearFlowHighlights();
        state.audioFlow.timerId = setTimeout(() => {
          playNextAudioFlow(true);
        }, 2000);
      }
    });
  });
}

function startAudioFlowForCategory(categoryName, mode = 'questions', targetIndexOrId = 0) {
  const tabBtn = document.querySelector('.nav-tab[data-tab="audio-flow-tab"]');
  if (tabBtn) tabBtn.click();

  setAudioFlowMode(mode);

  if (elements.flowCategorySelect) {
    elements.flowCategorySelect.value = categoryName || 'all';
  }
  loadAudioFlowItems();

  let targetIdx = 0;
  if (typeof targetIndexOrId === 'string' || typeof targetIndexOrId === 'number') {
    const foundIdx = state.audioFlow.items.findIndex(item => 
      item.id === targetIndexOrId || 
      (item.question && item.question.id === targetIndexOrId) ||
      (item.term && item.term.id === targetIndexOrId)
    );
    if (foundIdx !== -1) {
      targetIdx = foundIdx;
    } else if (typeof targetIndexOrId === 'number' && targetIndexOrId >= 0 && targetIndexOrId < state.audioFlow.items.length) {
      targetIdx = targetIndexOrId;
    }
  }

  state.audioFlow.currentIndex = targetIdx;
  updateAudioFlowCard();

  state.audioFlow.isPlaying = true;
  state.audioFlow.isPaused = false;
  playAudioFlowCurrentItem();
  showToast(`🎧 「${categoryName || '全体'}」の聞き流し学習を開始しました`);
}

function startAudioFlowWithQuestions(customQuestions, customTitle = '特訓') {
  if (!customQuestions || customQuestions.length === 0) return;

  const tabBtn = document.querySelector('.nav-tab[data-tab="audio-flow-tab"]');
  if (tabBtn) tabBtn.click();

  setAudioFlowMode('questions');

  state.audioFlow.items = [...customQuestions];
  state.audioFlow.currentIndex = 0;
  state.audioFlow.category = 'custom';

  if (elements.flowCurrentCategoryPill) {
    elements.flowCurrentCategoryPill.textContent = customTitle;
  }
  updateAudioFlowCard();
  renderAudioFlowPlaylist();

  state.audioFlow.isPlaying = true;
  state.audioFlow.isPaused = false;
  playAudioFlowCurrentItem();
  showToast(`🎧 「${customTitle}」の聞き流し学習を開始しました`);
}

window.startAudioFlowForCategory = startAudioFlowForCategory;
window.startAudioFlowWithQuestions = startAudioFlowWithQuestions;

// ==========================================
// イベントリスナー設定
// ==========================================
function setupEventListeners() {
  // 聞き流しモード イベント
  elements.flowModeBtnQuestions.addEventListener('click', () => setAudioFlowMode('questions'));
  if (elements.flowModeBtnRelation) {
    elements.flowModeBtnRelation.addEventListener('click', () => setAudioFlowMode('relation'));
  }
  elements.flowModeBtnTerms.addEventListener('click', () => setAudioFlowMode('terms'));

  elements.flowCategorySelect.addEventListener('change', () => {
    stopAudioFlow();
    loadAudioFlowItems();
  });

  elements.flowThinkingToggle.addEventListener('change', (e) => {
    state.audioFlow.thinkingTime = e.target.checked;
  });

  elements.flowRepeatToggle.addEventListener('change', (e) => {
    state.audioFlow.repeat = e.target.checked;
  });

  if (elements.flowWakeLockToggle) {
    elements.flowWakeLockToggle.addEventListener('change', (e) => {
      state.audioFlow.preventSleep = e.target.checked;
      if (e.target.checked) {
        if (state.audioFlow.isPlaying && !state.audioFlow.isPaused) {
          requestScreenWakeLock();
        }
        showToast("💡 スリープ防止をONにしました（常時点灯）");
      } else {
        releaseScreenWakeLock();
        showToast("スリープ防止をOFFにしました");
      }
    });
  }

  elements.flowSpeedSelect.addEventListener('change', (e) => {
    state.audioFlow.speed = parseFloat(e.target.value);
    if (state.audioFlow.isPlaying && !state.audioFlow.isPaused) {
      playAudioFlowCurrentItem();
    }
  });

  elements.btnFlowPlayPause.addEventListener('click', togglePlayPauseAudioFlow);
  elements.btnFlowNext.addEventListener('click', () => playNextAudioFlow(false));
  elements.btnFlowPrev.addEventListener('click', playPrevAudioFlow);
  elements.btnFlowStop.addEventListener('click', stopAudioFlow);

  if (elements.btnStartTermsFlow) {
    elements.btnStartTermsFlow.addEventListener('click', () => {
      const cat = elements.termsCategoryFilter ? elements.termsCategoryFilter.value : 'all';
      startAudioFlowForCategory(cat, 'terms');
    });
  }

  // 音声コントロールバー
  elements.btnAudioPlayPause.addEventListener('click', togglePlayPauseSpeech);
  elements.btnAudioStop.addEventListener('click', stopSpeaking);
  elements.audioSpeedSelect.addEventListener('change', (e) => {
    state.tts.rate = parseFloat(e.target.value);
  });

  // 用語モーダル
  elements.modalBtnClose.addEventListener('click', closeTermModal);
  elements.modalBtnOk.addEventListener('click', closeTermModal);
  elements.termModal.addEventListener('click', (e) => {
    if (e.target === elements.termModal) closeTermModal();
  });
  elements.modalBtnSpeak.addEventListener('click', () => {
    if (state.activeModalTerm) {
      speakText(`${state.activeModalTerm.term}。${state.activeModalTerm.summary}。${state.activeModalTerm.details || ''}`, `${state.activeModalTerm.term} の読み上げ`);
    }
  });

  // 模試
  elements.btnStartExam.addEventListener('click', startExam);
  elements.btnExamRestart.addEventListener('click', () => {
    stopSpeaking();
    elements.examResultView.classList.add('hidden');
    elements.examStartView.classList.remove('hidden');
  });

  if (elements.btnTogglePalette && elements.paletteCollapsibleContent) {
    elements.btnTogglePalette.addEventListener('click', () => {
      const isOpen = elements.paletteCollapsibleContent.classList.toggle('open');
      if (elements.paletteChevron) {
        elements.paletteChevron.textContent = isOpen ? '▲' : '▼';
      }
    });
  }

  elements.btnExamPrev.addEventListener('click', () => {
    if (state.exam.currentIndex > 0) {
      stopSpeaking();
      state.exam.currentIndex--;
      renderCurrentExamQuestion();
      renderExamPalette();
      if (window.innerWidth <= 768) {
        const qCard = document.querySelector('.question-card');
        if (qCard) qCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  elements.btnExamNext.addEventListener('click', () => {
    if (state.exam.currentIndex < state.exam.questions.length - 1) {
      stopSpeaking();
      state.exam.currentIndex++;
      renderCurrentExamQuestion();
      renderExamPalette();
      if (window.innerWidth <= 768) {
        const qCard = document.querySelector('.question-card');
        if (qCard) qCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });

  elements.btnSpeakExamQ.addEventListener('click', speakCurrentExamQuestion);

  elements.btnFlagToggle.addEventListener('click', () => {
    const idx = state.exam.currentIndex;
    state.exam.flags[idx] = !state.exam.flags[idx];
    renderCurrentExamQuestion(false);
    renderExamPalette();
  });

  elements.btnFinishExam.addEventListener('click', () => {
    const answeredCount = Object.keys(state.exam.answers).length;
    const total = state.exam.questions.length;
    if (answeredCount < total) {
      if (!confirm(`未解答の問題が ${total - answeredCount} 問あります。\n本当に試験を終了して採点しますか？`)) {
        return;
      }
    }
    finishExam();
  });

  if (elements.btnAbortExam) {
    elements.btnAbortExam.addEventListener('click', () => {
      if (confirm('模擬試験を中断して最初の画面に戻りますか？')) {
        stopSpeaking();
        if (state.exam.timerInterval) clearInterval(state.exam.timerInterval);
        if (state.exam.paceInterval) clearInterval(state.exam.paceInterval);
        document.body.classList.remove('in-exam');
        elements.examPlayView.classList.add('hidden');
        elements.examResultView.classList.add('hidden');
        elements.examStartView.classList.remove('hidden');
      }
    });
  }

  elements.btnFilterMistakes.addEventListener('click', () => renderReviewList('mistakes'));
  elements.btnShowAllReviews.addEventListener('click', () => renderReviewList('all'));
  elements.btnSpeakAllExplanations.addEventListener('click', speakAllMistakesExplanations);

  const btnFlowFromMistakes = document.getElementById('btn-flow-from-mistakes');
  if (btnFlowFromMistakes) {
    btnFlowFromMistakes.addEventListener('click', () => {
      const mistakes = state.exam.questions.filter((q, idx) => state.exam.answers[idx] !== q.answer);
      if (mistakes.length === 0) {
        alert("🎉 全問正解です！間違えた問題はありません。");
        return;
      }
      stopSpeaking();
      startAudioFlowWithQuestions(mistakes, `模試誤答復習 (${mistakes.length}問)`);
    });
  }

  // ドリル
  elements.btnDrillBack.addEventListener('click', () => {
    stopSpeaking();
    elements.drillActiveView.classList.add('hidden');
    elements.drillCategoryGrid.parentElement.classList.remove('hidden');
  });

  elements.btnSpeakDrillQ.addEventListener('click', speakCurrentDrillQuestion);
  elements.btnSpeakDrillExp.addEventListener('click', speakCurrentDrillExplanation);

  const btnDrillToFlow = document.getElementById('btn-drill-to-flow');
  if (btnDrillToFlow) {
    btnDrillToFlow.addEventListener('click', () => {
      if (!state.drill || !state.drill.questions) return;
      const q = state.drill.questions[state.drill.currentIndex];
      if (q) {
        stopSpeaking();
        startAudioFlowForCategory(q.category, 'questions', q.id);
      }
    });
  }

  elements.btnDrillNext.addEventListener('click', () => {
    stopSpeaking();
    if (state.drill.currentIndex < state.drill.questions.length - 1) {
      state.drill.currentIndex++;
      renderCurrentDrillQuestion();
    } else {
      elements.btnDrillBack.click();
    }
  });

  // 用語集検索・フィルタ
  elements.termsSearchInput.addEventListener('input', renderTermsList);
  elements.termsCategoryFilter.addEventListener('change', renderTermsList);

  // 管理画面
  elements.addQuestionForm.addEventListener('submit', handleAddQuestionSubmit);
  elements.adminSearchInput.addEventListener('input', renderAdminTable);

  // JSONエクスポート
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.questions, null, 2));
      const downloadAnchor = document.createElement('a');
      const nowStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `g_kentei_questions_${nowStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("📥 全問題データをダウンロード保存しました！");
    });
  }

  // JSONインポート
  const btnImportTrigger = document.getElementById('btn-import-trigger');
  const fileImportInput = document.getElementById('admin-file-import');
  if (btnImportTrigger && fileImportInput) {
    btnImportTrigger.addEventListener('click', () => fileImportInput.click());
    fileImportInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (!Array.isArray(imported)) throw new Error("配列形式のJSONではありません");

          const currentIds = new Set(state.questions.map(q => q.id));
          const newItems = imported.filter(q => q && q.question && !currentIds.has(q.id));

          if (newItems.length === 0) {
            alert("新しい問題は見つかりませんでした（すべて登録済みか、形式が不適切です）。");
            return;
          }

          const stored = getStoredManualQuestions();
          const combined = [...newItems, ...stored];
          saveStoredManualQuestions(combined);

          state.questions = [...newItems, ...state.questions];
          updateHeaderStats();
          renderAdminTable();
          renderDrillCategories();
          showToast(`📤 ${newItems.length} 件の新しい問題を取り込みました！`);
        } catch (err) {
          alert(`インポートに失敗しました: ${err.message}`);
        }
      };
      reader.readAsText(file);
      fileImportInput.value = '';
    });
  }
}

// 実行開始
document.addEventListener('DOMContentLoaded', initApp);
