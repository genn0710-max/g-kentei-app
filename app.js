const VueObj = (typeof Vue !== 'undefined') ? Vue : (typeof window !== 'undefined' ? window.Vue : null);
const { createApp, ref, computed, onMounted, onUnmounted, watch } = VueObj;

const DB_NAME = 'GKenteiQuestionDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'questions';

function safeGetItem(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : fallback;
  } catch(e) {
    return fallback;
  }
}

function safeSetItem(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch(e) {}
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch(err) {
      reject(err);
    }
  });
}

async function getAllFromDB() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch(e) {
    return [];
  }
}

async function saveAllToDB(items) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch(e) {
    console.warn('IndexedDB write skipped:', e);
  }
}

// G検定・主要AI用語の正確な発音辞書補正
function cleanTextForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  let clean = text
    .replace(/【|】|■|○|×|★|▼|▲|●|◆|◇|◎/g, ' ')
    .replace(/第\s*(\d+)\s*問/g, 'だい $1 もん')
    .replace(/①/g, '1番、').replace(/②/g, '2番、').replace(/③/g, '3番、').replace(/④/g, '4番、')
    .replace(/ＸＡＩ/gi, 'エックスエーアイ')
    .replace(/(?<![a-zA-Z])XAI(?![a-zA-Z])/gi, 'エックスエーアイ')
    .replace(/ＡＩ/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])AI(?![a-zA-Z])/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])Ai(?![a-zA-Z])/g, 'エーアイ')
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
    .replace(/線形回帰/g, 'せんけいかいき')
    .replace(/非線形/g, 'ひせんけい')
    .replace(/\n+/g, '。 ');
  return clean;
}

// 日英ハイブリッド音声合成用：テキストを日本語と英語（アルファベット）チャンクに最適分割
function splitTextByLanguage(text) {
  if (!text) return [];
  const chunks = [];
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

createApp({
  setup() {
    // ==========================================
    // 基本設定・UIユーティリティ
    // ==========================================
    const fontSizeClass = ref(safeGetItem('gkentei_fontsize', 'font-size-standard'));
    const themeClass = ref(safeGetItem('gkentei_theme', 'theme-dark'));
    const isWakeLockActive = ref(false);
    let wakeLockSentinel = null;

    // bodyのクラスをテーマ・フォントサイズとリアルタイム同期
    watch([themeClass, fontSizeClass], ([newTheme, newFont]) => {
      if (typeof document !== 'undefined') {
        document.body.className = `${newTheme} ${newFont} bg-slate-950 text-slate-100 min-h-screen font-sans antialiased flex flex-col selection:bg-sky-500 selection:text-white transition-colors`;
      }
    }, { immediate: true });

    const setFontSize = (size) => {
      fontSizeClass.value = size;
      safeSetItem('gkentei_fontsize', size);
    };

    const toggleTheme = () => {
      themeClass.value = themeClass.value === 'theme-dark' ? 'theme-light' : 'theme-dark';
      localStorage.setItem('gkentei_theme', themeClass.value);
    };

    const toggleWakeLock = async () => {
      if ('wakeLock' in navigator) {
        if (!isWakeLockActive.value) {
          try {
            wakeLockSentinel = await navigator.wakeLock.request('screen');
            isWakeLockActive.value = true;
            wakeLockSentinel.addEventListener('release', () => {
              isWakeLockActive.value = false;
            });
          } catch (err) {
            console.warn('WakeLock request failed:', err);
          }
        } else {
          if (wakeLockSentinel) {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
          }
          isWakeLockActive.value = false;
        }
      } else {
        alert('お使いのブラウザは画面常時点灯（Wake Lock）APIに対応していません。');
      }
    };

    // 試験カウントダウン計算 (2026-11-06)
    const countdownDays = computed(() => {
      const examDate = new Date('2026-11-06T09:00:00+09:00');
      const now = new Date();
      const diffTime = examDate.getTime() - now.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return days > 0 ? days : 0;
    });

    // ナビゲーションタブ
    const navTabs = [
      { id: 'dashboard', name: 'ダッシュボード', icon: '📊' },
      { id: 'stages', name: '段階ステップ(180問)', icon: '🎯' },
      { id: 'exam', name: '実戦模試', icon: '⏱️' },
      { id: 'drill', name: '分野別特訓', icon: '📚' },
      { id: 'flashcards', name: '重要数値暗記', icon: '🔢' },
      { id: 'audio', name: '音声聞き流し', icon: '🎧' },
      { id: 'cheatsheet', name: '罠チートシート', icon: '🚨' },
      { id: 'manage', name: '問題管理', icon: '➕' }
    ];

    const activeTab = ref('dashboard');
    const switchTab = (tabId) => {
      activeTab.value = tabId;
      stopAudio();
    };

    const chapters = [
      { id: 'ch1', name: '第1章 人工知能とは・歴史' },
      { id: 'ch2', name: '第2章 人工知能をめぐる動向・課題' },
      { id: 'ch3', name: '第3章 機械学習の具体的手法' },
      { id: 'ch4', name: '第4章 ディープラーニングの基本と要素技術' },
      { id: 'ch5', name: '第5章 画像認識・CNNの発展' },
      { id: 'ch6', name: '第6章 自然言語処理・時系列・Transformer' },
      { id: 'ch7', name: '第7章 生成AI・LLM・マルチモーダル' },
      { id: 'ch8', name: '第8章 AI倫理・法規制・社会実装' }
    ];

    const allQuestions = ref([]);
    const totalQuestionsCount = computed(() => allQuestions.value.length);
    const bookmarkedQuestionsCount = computed(() => allQuestions.value.filter(q => q.isBookmarked).length);

    // ==========================================
    // 🎯 段階ステップアップ特訓（全18ステージ）
    // ==========================================
    const stageRelationReview = ref(true);
    const stagesProgress = ref(JSON.parse(localStorage.getItem('gkentei_stages_prog_v1') || '{}'));
    const stageMistakePool = ref(JSON.parse(localStorage.getItem('gkentei_stage_mistakes_v1') || '[]'));

    const stagesList = computed(() => {
      const list = [];
      const stageDefs = [
        { title: 'AIの歴史①（ダートマス会議・チューリングテスト）', ch: 'ch1', desc: '第1次AIブームの誕生とチューリングテストの基礎定義' },
        { title: 'AIの歴史②（探索・推論・トイプロブレム）', ch: 'ch1', desc: '探索木・ハノイの塔・おもちゃの問題の限界' },
        { title: 'AIの歴史③（エキスパートシステム・第2次ブーム）', ch: 'ch1', desc: 'MYCIN、DENDRAL、知識獲得のボトルネック' },
        { title: '知能をめぐる課題①（フレーム問題）', ch: 'ch2', desc: 'マッカーシーとデネットの思考実験、無限の関連事象' },
        { title: '知能をめぐる課題②（記号接地問題・中国語の部屋）', ch: 'ch2', desc: 'ハルナッドのシンボルグラウンディングとサールの批判' },
        { title: '機械学習の基本①（教師あり・なし・強化学習）', ch: 'ch3', desc: '学習パラダイムの分類と代表的タスク' },
        { title: '機械学習の基本②（SVM・マージン・カーネル法）', ch: 'ch3', desc: '最大マージン超平面とカーネルトリックの計算' },
        { title: '機械学習の基本③（決定木・ランダムフォレスト）', ch: 'ch3', desc: '情報利得、ジニ係数、アンサンブル学習（バギング）' },
        { title: '機械学習の基本④（ブースティング・GBDT）', ch: 'ch3', desc: '残差学習、XGBoost、LightGBM、バイアス低減' },
        { title: '正則化と過学習（L1 vs L2正則化）', ch: 'ch3', desc: 'Lassoのスパース化 vs Ridgeの重み滑らか縮小' },
        { title: 'ディープラーニング要素技術①（活性化関数）', ch: 'ch4', desc: 'Sigmoid導関数最大0.25、ReLU、Leaky ReLU' },
        { title: 'ディープラーニング要素技術②（最適化手法）', ch: 'ch4', desc: 'Momentum、AdaGrad、RMSprop、Adam' },
        { title: 'ディープラーニング要素技術③（ドロップアウト・BN）', ch: 'ch4', desc: '推論時と学習時の挙動違い、移動平均' },
        { title: '画像認識・CNN①（畳み込み・プーリング）', ch: 'ch5', desc: '重み共有、受容野、プーリング層の重みゼロ' },
        { title: '画像認識・CNN②（ResNet・物体検出）', ch: 'ch5', desc: 'スキップ結合、IoU、NMS、YOLO vs Faster R-CNN' },
        { title: '自然言語処理・Transformer（Self-Attention）', ch: 'ch6', desc: 'Q, K, V行列、Positional Encoding、並列学習' },
        { title: '生成AI・LLM（RAG・LoRA・RLHF）', ch: 'ch7', desc: '事実知識注入vsスタイル適応、低ランク分解、アライメント' },
        { title: 'AI倫理・法規制（著作権30条の4・EU AI Act）', ch: 'ch8', desc: '享受を目的としない利用、AI事業者G/L、リスク4分類' }
      ];

      for (let i = 0; i < 18; i++) {
        const def = stageDefs[i];
        const prog = stagesProgress.value[i] || { bestScore: null, stars: 0 };
        // 最初のステージは常に解放、以降は前ステージで8問以上クリアでアンロック
        const prevProg = stagesProgress.value[i - 1];
        const isUnlocked = i === 0 || (prevProg && prevProg.bestScore >= 8);
        const isCleared = prog.bestScore >= 8;

        list.push({
          id: i,
          title: def.title,
          chapterId: def.ch,
          desc: def.desc,
          unlocked: isUnlocked,
          cleared: isCleared,
          bestScore: prog.bestScore,
          stars: prog.stars
        });
      }
      return list;
    });

    const clearedStagesCount = computed(() => stagesList.value.filter(s => s.cleared).length);
    const totalStarsEarned = computed(() => stagesList.value.reduce((acc, s) => acc + (s.stars || 0), 0));

    // ステージ演習実行状態
    const isStagePlaying = ref(false);
    const currentPlayingStageIdx = ref(0);
    const stageQuestions = ref([]);
    const stagePlayQuestionIndex = ref(0);
    const stageSelectedOption = ref(null);
    const stageAnswered = ref(false);
    const stageCurrentScore = ref(0);
    const isStageFinished = ref(false);
    const isCheatModeOn = ref(false);

    const currentStageQuestion = computed(() => {
      if (stageQuestions.value.length === 0) return {};
      return stageQuestions.value[stagePlayQuestionIndex.value] || {};
    });

    const openStage = (idx) => {
      const st = stagesList.value[idx];
      if (!st.unlocked) return;

      currentPlayingStageIdx.value = idx;
      // 章から10問を抽出
      const pool = allQuestions.value.filter(q => q.chapterId === st.chapterId);
      let selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);

      // リレーション復習：前ステージの間違いがあれば1〜2問差し替え
      if (stageRelationReview.value && stageMistakePool.value.length > 0 && selected.length >= 2) {
        const reviewQ = stageMistakePool.value[Math.floor(Math.random() * stageMistakePool.value.length)];
        if (reviewQ && !selected.some(q => q.id === reviewQ.id)) {
          selected[0] = reviewQ;
        }
      }

      stageQuestions.value = selected;
      stagePlayQuestionIndex.value = 0;
      stageSelectedOption.value = null;
      stageAnswered.value = false;
      stageCurrentScore.value = 0;
      isStageFinished.value = false;
      isStagePlaying.value = true;
    };

    const toggleCheatMode = () => {
      isCheatModeOn.value = !isCheatModeOn.value;
    };

    const handleStageOptionClick = (idx) => {
      if (stageAnswered.value) return;
      stageSelectedOption.value = idx;
      stageAnswered.value = true;
      if (idx === currentStageQuestion.value.correctIndex) {
        stageCurrentScore.value++;
      } else {
        // ミスプールに追加
        if (!stageMistakePool.value.some(q => q.id === currentStageQuestion.value.id)) {
          stageMistakePool.value.push(currentStageQuestion.value);
          localStorage.setItem('gkentei_stage_mistakes_v1', JSON.stringify(stageMistakePool.value));
        }
      }
    };

    const nextStageQuestion = () => {
      if (stagePlayQuestionIndex.value < stageQuestions.value.length - 1) {
        stagePlayQuestionIndex.value++;
        stageSelectedOption.value = null;
        stageAnswered.value = false;
      } else {
        finishStage();
      }
    };

    const calculateStars = (score) => {
      if (score === 10) return 3;
      if (score >= 8) return 2;
      return 1;
    };

    const finishStage = () => {
      isStageFinished.value = true;
      const score = stageCurrentScore.value;
      const stars = calculateStars(score);
      const curr = stagesProgress.value[currentPlayingStageIdx.value] || { bestScore: 0, stars: 0 };

      if (score >= (curr.bestScore || 0)) {
        stagesProgress.value[currentPlayingStageIdx.value] = {
          bestScore: score,
          stars: Math.max(stars, curr.stars || 0)
        };
        localStorage.setItem('gkentei_stages_prog_v1', JSON.stringify(stagesProgress.value));
      }
    };

    const retryCurrentStage = () => {
      openStage(currentPlayingStageIdx.value);
    };

    const proceedNextStage = () => {
      if (currentPlayingStageIdx.value < 17) {
        openStage(currentPlayingStageIdx.value + 1);
      } else {
        closeStageModal();
      }
    };

    const closeStageModal = () => {
      isStagePlaying.value = false;
      isStageFinished.value = false;
      window.speechSynthesis.cancel();
    };

    const resetStagesProgress = () => {
      if (!confirm('段階ステップのクリア進捗をリセットしますか？')) return;
      stagesProgress.value = {};
      stageMistakePool.value = [];
      localStorage.removeItem('gkentei_stages_prog_v1');
      localStorage.removeItem('gkentei_stage_mistakes_v1');
      alert('進捗をリセットしました！');
    };

    const getStageOptionClass = (idx) => {
      const isCorrect = idx === currentStageQuestion.value.correctIndex;
      const isChosen = stageSelectedOption.value === idx;

      // カンニングモードON時は最初から正解が緑のリングで薄く透視表示
      if (isCheatModeOn.value && !stageAnswered.value && isCorrect) {
        return 'bg-emerald-950/30 border-emerald-500/80 text-emerald-200 ring-1 ring-emerald-500/60 font-semibold cursor-pointer';
      }

      if (!stageAnswered.value) {
        return 'bg-slate-950 border-slate-800 hover:border-sky-500 text-slate-200 cursor-pointer';
      }

      if (isCorrect) return 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
      if (isChosen && !isCorrect) return 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
      return 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
    };

    const getStageBadgeClass = (idx) => {
      const isCorrect = idx === currentStageQuestion.value.correctIndex;
      const isChosen = stageSelectedOption.value === idx;

      if (isCheatModeOn.value && !stageAnswered.value && isCorrect) {
        return 'border-emerald-500 bg-emerald-500/30 text-emerald-300 font-bold';
      }

      if (!stageAnswered.value) return 'border-slate-800 bg-slate-900 text-slate-400';
      if (isCorrect) return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
      if (isChosen) return 'border-rose-500 bg-rose-500 text-white font-bold';
      return 'border-slate-900 bg-slate-950 text-slate-700';
    };

    // ==========================================
    // 🔢 重要数値・判定基準（フラッシュカード）
    // ==========================================
    const flashcards = ref(window.FLASHCARDS_DATA || []);
    const currentCardIndex = ref(0);
    const isCardFlipped = ref(false);
    const masteredCardsMap = ref(JSON.parse(localStorage.getItem('gkentei_mastered_cards_v1') || '{}'));

    const currentFlashcard = computed(() => {
      if (flashcards.value.length === 0) return {};
      return flashcards.value[currentCardIndex.value] || {};
    });

    const masteredCardsCount = computed(() => {
      return Object.keys(masteredCardsMap.value).filter(k => masteredCardsMap.value[k]).length;
    });

    const flipFlashcard = () => {
      isCardFlipped.value = !isCardFlipped.value;
    };

    const nextCard = () => {
      isCardFlipped.value = false;
      currentCardIndex.value = (currentCardIndex.value + 1) % flashcards.value.length;
    };

    const prevCard = () => {
      isCardFlipped.value = false;
      currentCardIndex.value = (currentCardIndex.value - 1 + flashcards.value.length) % flashcards.value.length;
    };

    const toggleCardMastered = () => {
      const cardId = currentFlashcard.value.id;
      masteredCardsMap.value[cardId] = !masteredCardsMap.value[cardId];
      localStorage.setItem('gkentei_mastered_cards_v1', JSON.stringify(masteredCardsMap.value));
    };

    // ==========================================
    // 🎧 全自動！音声聞き流し学習プレイヤー
    // ==========================================
    const audioContentMode = ref('stages'); // 'stages' | 'flashcards'
    const audioSpeed = ref(1.0);
    const isAudioPlaying = ref(false);
    const currentAudioTrackIndex = ref(0);
    const audioPlayState = ref('idle'); // 'idle' | 'question' | 'pause' | 'answer'
    let audioTimer = null;

    const currentAudioPlaylist = computed(() => {
      if (audioContentMode.value === 'flashcards') {
        return flashcards.value;
      }
      return allQuestions.value.slice(0, 180); // ステージの180問
    });

    const currentAudioTrack = computed(() => {
      if (currentAudioPlaylist.value.length === 0) return {};
      return currentAudioPlaylist.value[currentAudioTrackIndex.value] || {};
    });

    let ttsVoices = [];
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        ttsVoices = window.speechSynthesis.getVoices() || [];
      }
    };
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }

    const speakText = (text, callback) => {
      if (!('speechSynthesis' in window)) {
        if (callback) callback();
        return;
      }
      window.speechSynthesis.cancel();
      const clean = cleanTextForSpeech(text);
      const chunks = splitTextByLanguage(clean);
      if (chunks.length === 0) {
        if (callback) callback();
        return;
      }

      if (ttsVoices.length === 0 && 'speechSynthesis' in window) {
        ttsVoices = window.speechSynthesis.getVoices() || [];
      }
      const jaVoice = ttsVoices.find(v => v.lang.startsWith('ja')) || null;
      const enVoice = ttsVoices.find(v => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Siri') || true)) || null;

      let idx = 0;
      const speakNext = () => {
        if (idx >= chunks.length) {
          if (callback) callback();
          return;
        }
        const chunk = chunks[idx++];
        const isEn = (chunk.lang === 'en');
        const ut = new SpeechSynthesisUtterance(chunk.text);
        if (isEn && enVoice) {
          ut.voice = enVoice;
          ut.lang = enVoice.lang || 'en-US';
          ut.rate = Math.max(0.85, audioSpeed.value * 0.95);
        } else {
          if (jaVoice) ut.voice = jaVoice;
          ut.lang = 'ja-JP';
          ut.rate = audioSpeed.value;
        }
        ut.onend = () => speakNext();
        ut.onerror = () => speakNext();
        window.speechSynthesis.speak(ut);
      };
      speakNext();
    };

    const playCurrentAudioSequence = () => {
      if (!isAudioPlaying.value) return;
      const track = currentAudioTrack.value;
      if (!track) return;

      audioPlayState.value = 'question';
      let qText = track.question;
      if (audioContentMode.value === 'flashcards') {
        qText = `テーマ、${track.title}。${track.question}`;
      } else {
        const optList = (track.options || []).map((o, i) => `${i + 1}番、${o}`).join('。');
        qText = `設問、${track.question}。${optList}`;
      }

      speakText(qText, () => {
        if (!isAudioPlaying.value) return;
        audioPlayState.value = 'pause';
        
        // 3秒思考タイム
        audioTimer = setTimeout(() => {
          if (!isAudioPlaying.value) return;
          audioPlayState.value = 'answer';
          
          let aText = '';
          if (audioContentMode.value === 'flashcards') {
            aText = `正解は、${track.answer}。重要ポイント：${track.point}`;
          } else {
            const correctOpt = track.options[track.correctIndex];
            aText = `正解は、選択肢${track.correctIndex + 1}番、${correctOpt}。解説：${track.explanation}。引っ掛けポイント：${track.trapNote}`;
          }

          speakText(aText, () => {
            if (!isAudioPlaying.value) return;
            // 2秒後に次のトラックへ自動進行
            audioTimer = setTimeout(() => {
              if (!isAudioPlaying.value) return;
              nextAudioTrack();
            }, 2000);
          });
        }, 3000);
      });
    };

    const toggleAudioPlay = () => {
      if (isAudioPlaying.value) {
        stopAudio();
      } else {
        isAudioPlaying.value = true;
        playCurrentAudioSequence();
      }
    };

    const stopAudio = () => {
      isAudioPlaying.value = false;
      audioPlayState.value = 'idle';
      if (audioTimer) clearTimeout(audioTimer);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };

    const nextAudioTrack = () => {
      clearTimeout(audioTimer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      currentAudioTrackIndex.value = (currentAudioTrackIndex.value + 1) % currentAudioPlaylist.value.length;
      if (isAudioPlaying.value) {
        playCurrentAudioSequence();
      }
    };

    const prevAudioTrack = () => {
      clearTimeout(audioTimer);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      currentAudioTrackIndex.value = (currentAudioTrackIndex.value - 1 + currentAudioPlaylist.value.length) % currentAudioPlaylist.value.length;
      if (isAudioPlaying.value) {
        playCurrentAudioSequence();
      }
    };

    const onAudioContentModeChange = () => {
      stopAudio();
      currentAudioTrackIndex.value = 0;
    };

    // ==========================================
    // 📚 分野別特訓ドリル
    // ==========================================
    const drillChapter = ref('ALL');
    const drillOnlyWrong = ref(false);
    const drillOnlyBookmarked = ref(false);
    const currentDrillIndex = ref(0);
    const drillSelectedOption = ref(null);
    const drillAnswered = ref(false);

    const activeDrillQuestions = computed(() => {
      let list = allQuestions.value;
      if (drillChapter.value !== 'ALL') {
        list = list.filter(q => q.chapterId === drillChapter.value);
      }
      if (drillOnlyBookmarked.value) {
        list = list.filter(q => q.isBookmarked);
      }
      if (drillOnlyWrong.value) {
        const mistakeIds = new Set(stageMistakePool.value.map(q => q.id));
        list = list.filter(q => mistakeIds.has(q.id));
      }
      return list;
    });

    const currentDrillQuestion = computed(() => {
      if (activeDrillQuestions.value.length === 0) return {};
      return activeDrillQuestions.value[currentDrillIndex.value] || {};
    });

    const handleDrillOptionClick = (idx) => {
      if (drillAnswered.value) return;
      drillSelectedOption.value = idx;
      drillAnswered.value = true;
    };

    const nextDrillQuestion = () => {
      currentDrillIndex.value = (currentDrillIndex.value + 1) % activeDrillQuestions.value.length;
      drillSelectedOption.value = null;
      drillAnswered.value = false;
    };

    const getDrillOptionClass = (idx) => {
      if (!drillAnswered.value) return 'bg-slate-950 border-slate-800 hover:border-sky-500 text-slate-200 cursor-pointer';
      const isCorrect = idx === currentDrillQuestion.value.correctIndex;
      const isChosen = drillSelectedOption.value === idx;
      if (isCorrect) return 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
      if (isChosen && !isCorrect) return 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
      return 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
    };

    const getDrillBadgeClass = (idx) => {
      if (!drillAnswered.value) return 'border-slate-800 bg-slate-900 text-slate-400';
      if (idx === currentDrillQuestion.value.correctIndex) return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
      if (drillSelectedOption.value === idx) return 'border-rose-500 bg-rose-500 text-white font-bold';
      return 'border-slate-900 bg-slate-950 text-slate-700';
    };

    // ==========================================
    // ⏱️ 実戦模試（10分 / 20分 / 100分）
    // ==========================================
    const selectedExamMode = ref('intensive20');
    const isExamStarted = ref(false);
    const isExamFinished = ref(false);
    const examQuestions = ref([]);
    const currentExamIndex = ref(0);
    const examUserAnswers = ref({});
    const examMarks = ref({});
    const examTimeRemaining = ref(1200);
    let examTimerInterval = null;

    const currentExamQuestion = computed(() => {
      if (examQuestions.value.length === 0) return {};
      return examQuestions.value[currentExamIndex.value] || {};
    });

    const answeredExamCount = computed(() => {
      return Object.keys(examUserAnswers.value).filter(k => examUserAnswers.value[k] !== null).length;
    });

    const getExamModeTitle = () => {
      if (selectedExamMode.value === 'speed10') return '⚡ タイムリー10分版（15問）';
      if (selectedExamMode.value === 'intensive20') return '🧠 濃縮20分版 [即時解説付き]（25問）';
      return '🏆 本番フル模試（150問 / 100分）';
    };

    const startSpecificExam = (mode) => {
      selectedExamMode.value = mode;

      let targetCount = 150;
      let durationSeconds = 6000;
      let ratioMap = { ch1: 10, ch2: 12, ch3: 38, ch4: 45, ch5: 13, ch6: 12, ch7: 10, ch8: 10 };

      if (mode === 'speed10') {
        targetCount = 15;
        durationSeconds = 600;
        ratioMap = { ch1: 1, ch2: 1, ch3: 4, ch4: 4, ch5: 2, ch6: 1, ch7: 1, ch8: 1 };
      } else if (mode === 'intensive20') {
        targetCount = 25;
        durationSeconds = 1200;
        ratioMap = { ch1: 2, ch2: 2, ch3: 6, ch4: 7, ch5: 3, ch6: 2, ch7: 2, ch8: 1 };
      }

      let selected = [];
      for (const [chId, count] of Object.entries(ratioMap)) {
        const pool = allQuestions.value.filter(q => q.chapterId === chId);
        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        selected = selected.concat(shuffled.slice(0, count));
      }

      if (selected.length < targetCount) {
        const remainingPool = allQuestions.value.filter(q => !selected.includes(q));
        const extra = [...remainingPool].sort(() => 0.5 - Math.random()).slice(0, targetCount - selected.length);
        selected = selected.concat(extra);
      }

      examQuestions.value = selected.slice(0, targetCount).sort(() => 0.5 - Math.random());
      currentExamIndex.value = 0;
      examUserAnswers.value = {};
      examMarks.value = {};
      for (let i = 0; i < examQuestions.value.length; i++) {
        examUserAnswers.value[i] = null;
        examMarks.value[i] = false;
      }

      examTimeRemaining.value = durationSeconds;
      isExamStarted.value = true;
      isExamFinished.value = false;

      clearInterval(examTimerInterval);
      examTimerInterval = setInterval(() => {
        if (examTimeRemaining.value <= 1) {
          finishExam();
        } else {
          examTimeRemaining.value -= 1;
        }
      }, 1000);
    };

    const formatExamTime = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const selectExamAnswer = (optionIdx) => {
      examUserAnswers.value[currentExamIndex.value] = optionIdx;
    };

    const toggleExamMark = (idx) => {
      examMarks.value[idx] = !examMarks.value[idx];
    };

    const nextExamQuestion = () => {
      if (currentExamIndex.value < examQuestions.value.length - 1) {
        currentExamIndex.value++;
      }
    };

    const prevExamQuestion = () => {
      if (currentExamIndex.value > 0) {
        currentExamIndex.value--;
      }
    };

    const getExamOptionClass = (idx) => {
      const isAnswered = examUserAnswers.value[currentExamIndex.value] !== null;
      const isChosen = examUserAnswers.value[currentExamIndex.value] === idx;
      const isCorrect = idx === currentExamQuestion.value.correctIndex;

      if (selectedExamMode.value === 'intensive20' && isAnswered) {
        if (isCorrect) return 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
        if (isChosen && !isCorrect) return 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
        return 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
      }

      if (isChosen) return 'bg-indigo-950/50 border-indigo-500 text-indigo-100 font-medium ring-1 ring-indigo-500/50';
      return 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer';
    };

    const getExamBadgeClass = (idx) => {
      const isAnswered = examUserAnswers.value[currentExamIndex.value] !== null;
      const isChosen = examUserAnswers.value[currentExamIndex.value] === idx;
      const isCorrect = idx === currentExamQuestion.value.correctIndex;

      if (selectedExamMode.value === 'intensive20' && isAnswered) {
        if (isCorrect) return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
        if (isChosen) return 'border-rose-500 bg-rose-500 text-white font-bold';
        return 'border-slate-900 bg-slate-950 text-slate-700';
      }

      if (isChosen) return 'bg-indigo-500 text-white border-indigo-400';
      return 'bg-slate-900 border-slate-700 text-slate-400';
    };

    const getExamGridClass = (idx) => {
      const isCurrent = currentExamIndex.value === idx;
      const isAnswered = examUserAnswers.value[idx] !== null;
      const isMarked = examMarks.value[idx];

      let base = 'bg-slate-950 border-slate-800 text-slate-400';
      if (isAnswered) base = 'bg-emerald-950/70 border-emerald-500 text-emerald-300';
      if (isMarked) base += ' ring-1 ring-amber-400';
      if (isCurrent) base += ' border-sky-400 ring-2 ring-sky-400 text-white';
      return base;
    };

    const finishExam = () => {
      if (!confirm('テストを終了して採点しますか？')) return;
      clearInterval(examTimerInterval);
      isExamStarted.value = false;
      isExamFinished.value = true;
    };

    const resetExamState = () => {
      isExamStarted.value = false;
      isExamFinished.value = false;
      examQuestions.value = [];
    };

    const examScore = computed(() => {
      let correct = 0;
      examQuestions.value.forEach((q, idx) => {
        if (examUserAnswers.value[idx] === q.correctIndex) correct++;
      });
      return correct;
    });

    const examScoreRate = computed(() => {
      if (examQuestions.value.length === 0) return 0;
      return (examScore.value / examQuestions.value.length) * 100;
    });

    const examCategoryStats = computed(() => {
      const stats = {};
      examQuestions.value.forEach((q, idx) => {
        const cat = q.chapterName || q.category || 'その他';
        if (!stats[cat]) stats[cat] = { total: 0, correct: 0, rate: 0 };
        stats[cat].total++;
        if (examUserAnswers.value[idx] === q.correctIndex) stats[cat].correct++;
      });
      for (const cat in stats) {
        stats[cat].rate = (stats[cat].correct / stats[cat].total) * 100;
      }
      return stats;
    });

    const examWrongQuestions = computed(() => {
      const wrongs = [];
      examQuestions.value.forEach((q, idx) => {
        if (examUserAnswers.value[idx] !== q.correctIndex) {
          wrongs.push({ q, userAnswer: examUserAnswers.value[idx] });
        }
      });
      return wrongs;
    });

    // ==========================================
    // 🚨 2,000問対応 引っ掛けチートシート
    // ==========================================
    const cheatSearchQuery = ref('');
    const selectedCheatChapter = ref('ALL');
    const cheatPage = ref(1);
    const cheatPageSize = 20;

    const filteredCheatSheetQuestions = computed(() => {
      const q = cheatSearchQuery.value.trim().toLowerCase();
      return allQuestions.value.filter(item => {
        const matchesCh = selectedCheatChapter.value === 'ALL' || item.chapterId === selectedCheatChapter.value;
        const matchesText = !q ||
          item.question.toLowerCase().includes(q) ||
          (item.trapNote && item.trapNote.toLowerCase().includes(q)) ||
          (item.explanation && item.explanation.toLowerCase().includes(q));
        return matchesCh && matchesText;
      });
    });

    const totalPages = computed(() => Math.ceil(filteredCheatSheetQuestions.value.length / cheatPageSize) || 1);
    const paginatedCheatQuestions = computed(() => {
      const start = (cheatPage.value - 1) * cheatPageSize;
      return filteredCheatSheetQuestions.value.slice(start, start + cheatPageSize);
    });

    watch([cheatSearchQuery, selectedCheatChapter], () => {
      cheatPage.value = 1;
    });

    // ==========================================
    // ダッシュボード・ヘルパー
    // ==========================================
    const getChapterTotal = (chId) => {
      return allQuestions.value.filter(q => q.chapterId === chId).length;
    };

    const getChapterProgressPercent = (chId) => {
      // 登録問題数に応じた簡易ウェイト
      const total = getChapterTotal(chId);
      return Math.min(100, Math.round((total / 400) * 100));
    };

    const toggleBookmark = async (q) => {
      if (!q) return;
      q.isBookmarked = !q.isBookmarked;
      await saveAllToDB(allQuestions.value);
    };

    // ==========================================
    // データ初期化・ロード (IndexedDB)
    // ==========================================
    const loadQuestions = async () => {
      try {
        const saved = await getAllFromDB();
        if (saved && saved.length >= 100) {
          allQuestions.value = saved;
          return;
        }
      } catch (err) {
        console.warn('IndexedDB read failed:', err);
      }

      // window.QUESTIONS_BANK の定義完了を待機（スクリプト読み込み完了待ち）
      if (!window.QUESTIONS_BANK || !Array.isArray(window.QUESTIONS_BANK)) {
        for (let i = 0; i < 20; i++) {
          if (window.QUESTIONS_BANK && Array.isArray(window.QUESTIONS_BANK)) break;
          await new Promise(r => setTimeout(r, 100));
        }
      }

      if (window.QUESTIONS_BANK && Array.isArray(window.QUESTIONS_BANK)) {
        allQuestions.value = window.QUESTIONS_BANK;
        try {
          await saveAllToDB(window.QUESTIONS_BANK);
        } catch(e) {
          console.warn('IndexedDB save skipped:', e);
        }
      }
    };

    const resetToFactoryPool = async () => {
      if (!confirm('初期の2,050問問題プールにリセットしますか？')) return;
      if (window.QUESTIONS_BANK) {
        allQuestions.value = window.QUESTIONS_BANK;
        await saveAllToDB(window.QUESTIONS_BANK);
        alert('リセットが完了しました！');
      }
    };

    const exportJSON = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allQuestions.value, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `g_kentei_questions_2000_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    onMounted(async () => {
      const loadingEl = document.getElementById('app-loading');
      if (loadingEl) loadingEl.remove();
      await loadQuestions();
    });

    onUnmounted(() => {
      clearInterval(examTimerInterval);
      stopAudio();
    });

    return {
      // 共通・UI
      fontSizeClass,
      setFontSize,
      themeClass,
      toggleTheme,
      isWakeLockActive,
      toggleWakeLock,
      countdownDays,
      navTabs,
      activeTab,
      switchTab,
      chapters,
      allQuestions,
      totalQuestionsCount,
      bookmarkedQuestionsCount,
      getChapterTotal,
      getChapterProgressPercent,
      toggleBookmark,
      speakText,
      // 段階ステップ
      stagesList,
      stageRelationReview,
      clearedStagesCount,
      totalStarsEarned,
      isStagePlaying,
      currentPlayingStageIdx,
      stageQuestions,
      stagePlayQuestionIndex,
      currentStageQuestion,
      stageSelectedOption,
      stageAnswered,
      stageCurrentScore,
      isStageFinished,
      isCheatModeOn,
      openStage,
      toggleCheatMode,
      handleStageOptionClick,
      nextStageQuestion,
      calculateStars,
      retryCurrentStage,
      proceedNextStage,
      closeStageModal,
      resetStagesProgress,
      getStageOptionClass,
      getStageBadgeClass,
      // フラッシュカード
      flashcards,
      currentCardIndex,
      currentFlashcard,
      isCardFlipped,
      masteredCardsMap,
      masteredCardsCount,
      flipFlashcard,
      nextCard,
      prevCard,
      toggleCardMastered,
      // 音声聞き流し
      audioContentMode,
      audioSpeed,
      isAudioPlaying,
      currentAudioTrackIndex,
      audioPlayState,
      currentAudioPlaylist,
      currentAudioTrack,
      toggleAudioPlay,
      nextAudioTrack,
      prevAudioTrack,
      onAudioContentModeChange,
      // 分野別特訓
      drillChapter,
      drillOnlyWrong,
      drillOnlyBookmarked,
      currentDrillIndex,
      currentDrillQuestion,
      activeDrillQuestions,
      drillSelectedOption,
      drillAnswered,
      handleDrillOptionClick,
      nextDrillQuestion,
      getDrillOptionClass,
      getDrillBadgeClass,
      // 実戦テスト
      selectedExamMode,
      getExamModeTitle,
      startSpecificExam,
      isExamStarted,
      isExamFinished,
      examQuestions,
      currentExamIndex,
      currentExamQuestion,
      examUserAnswers,
      examMarks,
      examTimeRemaining,
      formatExamTime,
      selectExamAnswer,
      toggleExamMark,
      nextExamQuestion,
      prevExamQuestion,
      getExamOptionClass,
      getExamBadgeClass,
      getExamGridClass,
      finishExam,
      resetExamState,
      answeredExamCount,
      examScore,
      examScoreRate,
      examCategoryStats,
      examWrongQuestions,
      // チートシート
      cheatSearchQuery,
      selectedCheatChapter,
      filteredCheatSheetQuestions,
      paginatedCheatQuestions,
      cheatPage,
      totalPages,
      // 管理
      exportJSON,
      resetToFactoryPool
    };
  }
}).mount('#app');
