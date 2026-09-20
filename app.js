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
    rate: 1.0,
    isSpeaking: false,
    isPaused: false,
    queue: [],
    currentIndex: 0
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

  function pickJapaneseVoice() {
    const voices = state.tts.synth.getVoices();
    const jaVoice = voices.find(v => v.lang.includes('ja') || v.lang.includes('JP'));
    if (jaVoice) {
      state.tts.voice = jaVoice;
    }
  }

  pickJapaneseVoice();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = pickJapaneseVoice;
  }
}

function speakText(text, title = "音声読み上げ中...") {
  if (!state.tts.synth) return;

  // 既存の音声を停止
  stopSpeaking();

  if (!text || text.trim() === "") return;

  // 読み上げテキストのクリーンアップ（記号などの調整）
  const cleanText = text
    .replace(/【|】|■|○|×|★/g, ' ')
    .replace(/第\s*(\d+)\s*問/g, 'だい $1 もん')
    .replace(/\n+/g, '。 ');

  const utterance = new SpeechSynthesisUtterance(cleanText);
  if (state.tts.voice) utterance.voice = state.tts.voice;
  utterance.lang = 'ja-JP';
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
    // キューがある場合は次を再生
    if (state.tts.queue.length > 0) {
      const next = state.tts.queue.shift();
      speakText(next.text, next.title);
    } else {
      stopSpeaking();
    }
  };

  utterance.onerror = (e) => {
    console.error("TTS Error:", e);
    stopSpeaking();
  };

  state.tts.synth.speak(utterance);
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
  elements.modalTermDetails.textContent = term.details || '';

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

async function initApp() {
  initTTS();
  setupTabs();
  setupEventListeners();

  // PWA Service Worker 登録（オフライン対応）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log("PWA Service Worker registered:", reg.scope);
    }).catch(err => {
      console.log("PWA Service Worker registration skipped:", err);
    });
  }

  try {
    // 1. 静的JSONファイルからデータを読み込み（GitHub Pages・オフライン環境で100%動作）
    const [catRes, qRes, termsRes] = await Promise.all([
      fetch('data/categories.json').then(r => r.json()),
      fetch('data/questions.json').then(r => r.json()),
      fetch('data/terms.json').then(r => r.json())
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

      if (targetId === 'admin-tab') {
        renderAdminTable();
      } else if (targetId === 'terms-tab') {
        renderTermsList();
      } else if (targetId === 'drill-tab') {
        renderDrillCategories();
      }
    });
  });
}

function populateCategoryDropdowns() {
  // 用語集フィルタ
  elements.termsCategoryFilter.innerHTML = '<option value="all">すべての分野</option>';
  // 管理フォーム
  elements.formCategory.innerHTML = '';

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
// 1. 模擬試験ロジック
// ==========================================
function startExam() {
  stopSpeaking();
  const countVal = elements.examCountSelect.value;
  const count = countVal === 'all' ? state.questions.length : parseInt(countVal, 10);
  const shuffled = shuffleArray(state.questions).slice(0, Math.min(count, state.questions.length));

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

  renderReviewList('all');

  elements.examPlayView.classList.add('hidden');
  elements.examResultView.classList.remove('hidden');
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
    `;

    elements.examReviewContainer.appendChild(div);
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
        <span>特訓を開始する →</span>
      </div>
    `;

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
      ${t.details ? `<div class="term-details">${escapeHtml(t.details)}</div>` : ''}
      <div class="term-card-footer">
        <button class="btn btn-outline btn-sm btn-speak-term" data-term-id="${t.id}">🔊 音声で聞く</button>
      </div>
    `;
    elements.termsContainer.appendChild(card);
  });

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
// イベントリスナー設定
// ==========================================
function setupEventListeners() {
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

  elements.btnFilterMistakes.addEventListener('click', () => renderReviewList('mistakes'));
  elements.btnShowAllReviews.addEventListener('click', () => renderReviewList('all'));
  elements.btnSpeakAllExplanations.addEventListener('click', speakAllMistakesExplanations);

  // ドリル
  elements.btnDrillBack.addEventListener('click', () => {
    stopSpeaking();
    elements.drillActiveView.classList.add('hidden');
    elements.drillCategoryGrid.parentElement.classList.remove('hidden');
  });

  elements.btnSpeakDrillQ.addEventListener('click', speakCurrentDrillQuestion);
  elements.btnSpeakDrillExp.addEventListener('click', speakCurrentDrillExplanation);

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
