const { createApp, ref, computed, onMounted, onUnmounted, watch, nextTick } = Vue;

const DB_NAME = 'GKenteiQuestionDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'questions';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllFromDB() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveAllToDB(items) {
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
}

// HTMLエスケープヘルパー
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 音声テキスト分割ユーティリティ（カラオケ式ハイライト＆TTSタイムアウト防止）
function splitSpeechText(text) {
  if (!text) return [];
  const rawParts = String(text).split(/([。！？\n]+)/);
  const sentences = [];
  let current = '';

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];
    if (!part) continue;
    if (/[。！？\n]+/.test(part)) {
      current += part;
      if (current.trim()) {
        sentences.push(current.trim());
      }
      current = '';
    } else {
      current += part;
    }
  }
  if (current.trim()) {
    sentences.push(current.trim());
  }

  // 1文が長い場合（55文字超）は読点でも分割して視認性と追従性を向上
  const finalChunks = [];
  sentences.forEach((s) => {
    if (s.length > 55) {
      const subParts = s.split(/([、，]+)/);
      let subCurrent = '';
      for (let j = 0; j < subParts.length; j++) {
        const sp = subParts[j];
        if (!sp) continue;
        if (/[、，]+/.test(sp)) {
          subCurrent += sp;
          if (subCurrent.length > 28) {
            finalChunks.push(subCurrent.trim());
            subCurrent = '';
          }
        } else {
          subCurrent += sp;
        }
      }
      if (subCurrent.trim()) finalChunks.push(subCurrent.trim());
    } else {
      finalChunks.push(s);
    }
  });

  return finalChunks.length > 0 ? finalChunks : [String(text)];
}

// G検定専門用語の音声発音補正（画面表示は元の漢字・英字を維持）
function sanitizeForSpeech(text) {
  if (!text) return '';
  return String(text)
    .replace(/ＡＩ/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])AI(?![a-zA-Z])/g, 'エーアイ')
    .replace(/(?<![a-zA-Z])F値(?![a-zA-Z])/g, 'エフち')
    .replace(/(?<![a-zA-Z])p値(?![a-zA-Z])/g, 'ピーち')
    .replace(/(?<![a-zA-Z])Q値(?![a-zA-Z])/g, 'キューち')
    .replace(/(?<![a-zA-Z])Q学習(?![a-zA-Z])/g, 'キューがくしゅう')
    .replace(/k近傍法/gi, 'ケーきんぼうほう')
    .replace(/k-means/gi, 'ケーミーンズ')
    .replace(/L1正則化/g, 'エルワンせいそくか')
    .replace(/L2正則化/g, 'エルツーせいそくか')
    .replace(/30条の4/g, 'さんじゅうじょうのよん')
    .replace(/IoU/g, 'アイオーユー')
    .replace(/RLHF/g, 'アールエルエイチエフ')
    .replace(/LoRA/g, 'ローラ')
    .replace(/[🟢🚨💡🎯⏱️⚡🧠🏆📚🔢🎧👀⭐✓✕]/g, '');
}

createApp({
  setup() {
    // ==========================================
    // 基本設定・UIユーティリティ
    // ==========================================
    const fontSizeClass = ref(localStorage.getItem('gkentei_fontsize') || 'font-size-standard');
    const themeClass = ref(localStorage.getItem('gkentei_theme') || 'theme-dark');
    const isWakeLockActive = ref(false);
    let wakeLockSentinel = null;

    // 🚀 全モード共通チート・カンニングモード
    const isGlobalCheatMode = ref(localStorage.getItem('gkentei_global_cheat') === 'true');

    const toggleGlobalCheatMode = () => {
      isGlobalCheatMode.value = !isGlobalCheatMode.value;
      localStorage.setItem('gkentei_global_cheat', String(isGlobalCheatMode.value));
    };

    const setFontSize = (size) => {
      fontSizeClass.value = size;
      localStorage.setItem('gkentei_fontsize', size);
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
    // 🎧 全モード共通！グローバル音声聞き流し＆文章追従エンジン
    // ==========================================
    const isGlobalAudioActive = ref(false);
    const isGlobalAudioPlaying = ref(false);
    const globalAudioSpeed = ref(1.0);
    const globalAudioTitle = ref('全自動聞き流し学習');
    const globalAudioPlaylist = ref([]);
    const globalAudioIndex = ref(0);
    const globalAudioState = ref('idle'); // 'idle' | 'question' | 'options' | 'thinking' | 'explanation' | 'trap'
    const readOptionsInAudio = ref(localStorage.getItem('gkentei_read_opts') !== 'false');
    const thinkingCountdown = ref(3);
    const audioSourceMode = ref(''); // 'stage' | 'exam' | 'drill' | 'flashcards' | 'cheatsheet' | 'audio'

    // 🗣️ 文章追従（カラオケ式ハイライト）状態
    const readingItemId = ref(null);
    const readingSection = ref(''); // 'question' | 'option-0'..'option-3' | 'explanation' | 'trap' | 'card-front' | 'card-back' | 'card-point'
    const readingChunkIndex = ref(-1);
    const readingLiveSubtitle = ref('');

    let globalAudioTimer = null;
    let thinkingInterval = null;
    let watchdogTimer = null;
    let activeUtterance = null;
    let audioSessionCounter = 0;

    const currentGlobalAudioItem = computed(() => {
      if (globalAudioPlaylist.value.length === 0) return {};
      return globalAudioPlaylist.value[globalAudioIndex.value] || {};
    });

    const toggleReadOptions = () => {
      readOptionsInAudio.value = !readOptionsInAudio.value;
      localStorage.setItem('gkentei_read_opts', String(readOptionsInAudio.value));
    };

    // 自動スクロール追従（現在読み上げ中の文節を画面中央へスムーズに収める）
    const scrollToActiveChunk = () => {
      nextTick(() => {
        const activeEl = document.querySelector('[data-active-chunk="true"]') || document.querySelector('.reading-section-active') || document.querySelector('.reading-trap-active');
        if (!activeEl) return;
        try {
          const rect = activeEl.getBoundingClientRect();
          const vh = window.innerHeight || document.documentElement.clientHeight;
          const isInComfortZone = rect.top >= 90 && rect.bottom <= vh - 120;
          if (!isInComfortZone) {
            activeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        } catch (e) {}
      });
    };

    // カラオケ式ハイライトHTML生成ヘルパー（全モード共通）
    const getTrackedHtml = (text, itemId, sectionName) => {
      if (!text) return '';
      const chunks = splitSpeechText(text);
      const isTarget = readingItemId.value !== null && readingItemId.value === itemId && readingSection.value === sectionName;

      return chunks.map((chunk, idx) => {
        const escaped = escapeHtml(chunk).replace(/\n/g, '<br>');
        if (isTarget) {
          if (idx === readingChunkIndex.value) {
            return `<span class="speech-chunk active" data-active-chunk="true">${escaped}</span>`;
          } else if (idx < readingChunkIndex.value) {
            return `<span class="speech-chunk spoken">${escaped}</span>`;
          }
        }
        return `<span class="speech-chunk">${escaped}</span>`;
      }).join(' ');
    };

    const isSectionReading = (itemId, sectionName) => {
      return readingItemId.value !== null && readingItemId.value === itemId && readingSection.value === sectionName;
    };

    const isAudioRevealing = (itemId) => {
      if (readingItemId.value === null || readingItemId.value !== itemId) return false;
      return (
        globalAudioState.value === 'explanation' ||
        globalAudioState.value === 'trap' ||
        readingSection.value === 'explanation' ||
        readingSection.value === 'trap'
      );
    };

    const clearReadingTracking = () => {
      readingItemId.value = null;
      readingSection.value = '';
      readingChunkIndex.value = -1;
      readingLiveSubtitle.value = '';
    };

    const cancelAllAudioTimers = () => {
      audioSessionCounter++;
      clearTimeout(globalAudioTimer);
      clearInterval(thinkingInterval);
      clearTimeout(watchdogTimer);
      if (activeUtterance) {
        activeUtterance.onend = null;
        activeUtterance.onerror = null;
        activeUtterance = null;
      }
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };

    // 1文チャンクを安全に発話（GC保護・ウォッチドッグ完備）
    const speakAtomicChunk = (rawChunk, prefixSpeech, session, onDone) => {
      if (session !== audioSessionCounter) return;
      if (!('speechSynthesis' in window)) {
        globalAudioTimer = setTimeout(() => {
          if (session === audioSessionCounter && onDone) onDone();
        }, 1200);
        return;
      }

      try {
        window.speechSynthesis.cancel();
      } catch (e) {}

      globalAudioTimer = setTimeout(() => {
        if (session !== audioSessionCounter) return;

        const fullSpeech = sanitizeForSpeech((prefixSpeech ? prefixSpeech + '。' : '') + rawChunk);
        const ut = new SpeechSynthesisUtterance(fullSpeech);
        activeUtterance = ut;
        ut.lang = 'ja-JP';
        ut.rate = globalAudioSpeed.value;

        let finished = false;
        const complete = () => {
          if (finished) return;
          finished = true;
          clearTimeout(watchdogTimer);
          activeUtterance = null;
          if (session === audioSessionCounter && onDone) {
            onDone();
          }
        };

        ut.onend = complete;
        ut.onerror = () => complete();

        const safeMs = Math.max(3800, Math.round((fullSpeech.length * 290) / globalAudioSpeed.value));
        watchdogTimer = setTimeout(complete, safeMs);

        try {
          window.speechSynthesis.speak(ut);
        } catch (err) {
          complete();
        }
      }, 45);
    };

    // 対象セクションの文章をチャンクごとにハイライト追従しながら読み上げ
    const speakSectionWithTracking = (text, itemId, sectionName, firstChunkPrefix, session, onComplete) => {
      if (session !== audioSessionCounter) return;
      const chunks = splitSpeechText(text);
      if (chunks.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      readingItemId.value = itemId;
      readingSection.value = sectionName;
      let idx = 0;

      const nextChunk = () => {
        if (session !== audioSessionCounter) return;
        if (idx >= chunks.length) {
          if (onComplete) onComplete();
          return;
        }

        readingChunkIndex.value = idx;
        readingLiveSubtitle.value = chunks[idx];
        scrollToActiveChunk();

        const prefix = idx === 0 ? firstChunkPrefix : '';
        const chunkText = chunks[idx];
        idx++;

        speakAtomicChunk(chunkText, prefix, session, () => {
          nextChunk();
        });
      };

      nextChunk();
    };

    // 現在のトラックに合わせて各モードの画面表示インデックスを自動同期
    const syncScreenWithAudioTrack = () => {
      const idx = globalAudioIndex.value;
      const item = currentGlobalAudioItem.value;
      if (!item) return;

      if (audioSourceMode.value === 'stage' && isStagePlaying.value) {
        if (idx >= 0 && idx < stageQuestions.value.length) {
          stagePlayQuestionIndex.value = idx;
          stageSelectedOption.value = null;
          stageAnswered.value = false;
        }
      } else if (audioSourceMode.value === 'exam' && isExamStarted.value && !isExamFinished.value) {
        if (idx >= 0 && idx < examQuestions.value.length) {
          currentExamIndex.value = idx;
        }
      } else if (audioSourceMode.value === 'drill') {
        if (idx >= 0 && idx < activeDrillQuestions.value.length) {
          currentDrillIndex.value = idx;
          drillSelectedOption.value = null;
          drillAnswered.value = false;
        }
      } else if (audioSourceMode.value === 'flashcards') {
        if (idx >= 0 && idx < flashcards.value.length) {
          currentCardIndex.value = idx;
          isCardFlipped.value = false;
        }
      }
    };

    const runGlobalAudioSequence = () => {
      if (!isGlobalAudioPlaying.value) return;
      const item = currentGlobalAudioItem.value;
      if (!item || (!item.question && !item.title)) {
        stopGlobalAudio();
        return;
      }

      cancelAllAudioTimers();
      const session = audioSessionCounter;
      syncScreenWithAudioTrack();

      const itemId = item.id !== undefined ? item.id : `idx-${globalAudioIndex.value}`;

      // フラッシュカード形式の場合
      if (item.answer && item.title && !item.options) {
        globalAudioState.value = 'question';
        isCardFlipped.value = false;

        speakSectionWithTracking(
          item.question,
          itemId,
          'card-front',
          `カード${globalAudioIndex.value + 1}。テーマ、${item.title}`,
          session,
          () => {
            if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;
            // 3秒シンキングタイム
            globalAudioState.value = 'thinking';
            clearReadingTracking();
            thinkingCountdown.value = 3;

            thinkingInterval = setInterval(() => {
              if (thinkingCountdown.value > 1) thinkingCountdown.value--;
            }, 1000);

            globalAudioTimer = setTimeout(() => {
              clearInterval(thinkingInterval);
              if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;

              globalAudioState.value = 'explanation';
              isCardFlipped.value = true;

              speakSectionWithTracking(
                item.answer,
                itemId,
                'card-back',
                '正解・判定基準',
                session,
                () => {
                  if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;
                  speakSectionWithTracking(
                    item.point || '',
                    itemId,
                    'card-point',
                    '重要ポイント',
                    session,
                    () => {
                      if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;
                      clearReadingTracking();
                      globalAudioTimer = setTimeout(() => {
                        if (session === audioSessionCounter && isGlobalAudioPlaying.value) {
                          nextGlobalAudio();
                        }
                      }, 1800);
                    }
                  );
                }
              );
            }, 3000);
          }
        );
        return;
      }

      // 4択問題形式の場合：
      // Step 1: 問題文の読み上げ＆カラオケ追従
      globalAudioState.value = 'question';
      speakSectionWithTracking(
        item.question,
        itemId,
        'question',
        `第${globalAudioIndex.value + 1}問`,
        session,
        () => {
          if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;

          // Step 2: 選択肢1〜4の読み上げ＆カラオケ追従（ONの場合）
          const readChoicesStep = (afterChoicesCallback) => {
            const opts = item.options || [];
            if (!readOptionsInAudio.value || opts.length === 0) {
              afterChoicesCallback();
              return;
            }
            globalAudioState.value = 'options';
            let optIdx = 0;

            const nextChoice = () => {
              if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;
              if (optIdx >= opts.length) {
                afterChoicesCallback();
                return;
              }
              const currentOptIdx = optIdx;
              const optText = opts[currentOptIdx];
              optIdx++;

              speakSectionWithTracking(
                optText,
                itemId,
                `option-${currentOptIdx}`,
                `${currentOptIdx === 0 ? '選択肢。' : ''}${currentOptIdx + 1}番`,
                session,
                () => {
                  nextChoice();
                }
              );
            };

            nextChoice();
          };

          readChoicesStep(() => {
            if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;

            // Step 3: 思考タイム（3秒カウントダウン）
            globalAudioState.value = 'thinking';
            clearReadingTracking();
            thinkingCountdown.value = 3;
            readingLiveSubtitle.value = '⏳ 頭の中で正解を思い浮かべてください...';

            thinkingInterval = setInterval(() => {
              if (thinkingCountdown.value > 1) thinkingCountdown.value--;
            }, 1000);

            globalAudioTimer = setTimeout(() => {
              clearInterval(thinkingInterval);
              if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;

              // Step 4: 正解発表 ＆ 正解の論理（解説）の読み上げ＆カラオケ追従
              globalAudioState.value = 'explanation';
              const correctOpt = (item.options && item.options[item.correctIndex]) || '';
              const ansPrefix = `正解は、選択肢${item.correctIndex + 1}番、${correctOpt}。正解の論理`;

              speakSectionWithTracking(
                item.explanation || '',
                itemId,
                'explanation',
                ansPrefix,
                session,
                () => {
                  if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;

                  // Step 5: ここが引っ掛け罠！の読み上げ＆カラオケ追従
                  globalAudioState.value = 'trap';
                  speakSectionWithTracking(
                    item.trapNote || '',
                    itemId,
                    'trap',
                    'ここが出題者の引っ掛け罠',
                    session,
                    () => {
                      if (session !== audioSessionCounter || !isGlobalAudioPlaying.value) return;
                      clearReadingTracking();
                      readingLiveSubtitle.value = '⏭️ 次の問題へ進みます...';
                      globalAudioTimer = setTimeout(() => {
                        if (session === audioSessionCounter && isGlobalAudioPlaying.value) {
                          nextGlobalAudio();
                        }
                      }, 1800);
                    }
                  );
                }
              );
            }, 3000);
          });
        }
      );
    };

    const startAudioListening = (playlist, title = '連続聞き流し学習', sourceMode = 'audio', startIdx = 0) => {
      if (!playlist || playlist.length === 0) {
        alert('再生対象の問題がありません。');
        return;
      }
      cancelAllAudioTimers();
      clearReadingTracking();

      globalAudioPlaylist.value = playlist;
      globalAudioTitle.value = title;
      audioSourceMode.value = sourceMode;
      globalAudioIndex.value = startIdx >= 0 && startIdx < playlist.length ? startIdx : 0;
      isGlobalAudioActive.value = true;
      isGlobalAudioPlaying.value = true;
      runGlobalAudioSequence();
    };

    const toggleGlobalAudioPlay = () => {
      if (isGlobalAudioPlaying.value) {
        isGlobalAudioPlaying.value = false;
        cancelAllAudioTimers();
        clearReadingTracking();
      } else {
        isGlobalAudioPlaying.value = true;
        runGlobalAudioSequence();
      }
    };

    const stopGlobalAudio = () => {
      isGlobalAudioActive.value = false;
      isGlobalAudioPlaying.value = false;
      globalAudioState.value = 'idle';
      cancelAllAudioTimers();
      clearReadingTracking();
    };

    const nextGlobalAudio = () => {
      cancelAllAudioTimers();
      clearReadingTracking();
      if (globalAudioPlaylist.value.length === 0) return;
      globalAudioIndex.value = (globalAudioIndex.value + 1) % globalAudioPlaylist.value.length;
      if (isGlobalAudioPlaying.value) {
        runGlobalAudioSequence();
      } else {
        syncScreenWithAudioTrack();
      }
    };

    const prevGlobalAudio = () => {
      cancelAllAudioTimers();
      clearReadingTracking();
      if (globalAudioPlaylist.value.length === 0) return;
      globalAudioIndex.value = (globalAudioIndex.value - 1 + globalAudioPlaylist.value.length) % globalAudioPlaylist.value.length;
      if (isGlobalAudioPlaying.value) {
        runGlobalAudioSequence();
      } else {
        syncScreenWithAudioTrack();
      }
    };

    const setGlobalAudioSpeed = (spd) => {
      globalAudioSpeed.value = spd;
      if (isGlobalAudioPlaying.value) {
        runGlobalAudioSequence();
      }
    };

    // 単発読み上げヘルパー（単発でもカラオケ式ハイライト追従を実行！）
    const speakSingleQuestion = (q) => {
      if (!q) return;
      isGlobalAudioPlaying.value = false;
      cancelAllAudioTimers();
      const session = audioSessionCounter;
      const itemId = q.id !== undefined ? q.id : 'single';

      globalAudioState.value = 'question';
      speakSectionWithTracking(q.question, itemId, 'question', '設問', session, () => {
        if (readOptionsInAudio.value && q.options && q.options.length > 0) {
          let optIdx = 0;
          const readNextOpt = () => {
            if (session !== audioSessionCounter) return;
            if (optIdx >= q.options.length) {
              clearReadingTracking();
              globalAudioState.value = 'idle';
              return;
            }
            const cur = optIdx++;
            speakSectionWithTracking(
              q.options[cur],
              itemId,
              `option-${cur}`,
              `${cur === 0 ? '選択肢。' : ''}${cur + 1}番`,
              session,
              readNextOpt
            );
          };
          readNextOpt();
        } else {
          clearReadingTracking();
          globalAudioState.value = 'idle';
        }
      });
    };

    const speakSingleExplanation = (q) => {
      if (!q) return;
      isGlobalAudioPlaying.value = false;
      cancelAllAudioTimers();
      const session = audioSessionCounter;
      const itemId = q.id !== undefined ? q.id : 'single';
      const correctOpt = (q.options && q.options[q.correctIndex]) || '';

      globalAudioState.value = 'explanation';
      speakSectionWithTracking(
        q.explanation || '',
        itemId,
        'explanation',
        `正解は選択肢${q.correctIndex + 1}番、${correctOpt}。正解の論理`,
        session,
        () => {
          if (session !== audioSessionCounter) return;
          globalAudioState.value = 'trap';
          speakSectionWithTracking(
            q.trapNote || '',
            itemId,
            'trap',
            'ここが引っ掛け罠',
            session,
            () => {
              clearReadingTracking();
              globalAudioState.value = 'idle';
            }
          );
        }
      );
    };

    const speakText = (text, itemId = null, sectionName = 'card-back') => {
      isGlobalAudioPlaying.value = false;
      cancelAllAudioTimers();
      const session = audioSessionCounter;
      if (itemId !== null) {
        speakSectionWithTracking(text, itemId, sectionName, '', session, () => {
          clearReadingTracking();
        });
      } else {
        speakAtomicChunk(text, '', session, () => {});
      }
    };

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

    const currentStageQuestion = computed(() => {
      if (stageQuestions.value.length === 0) return {};
      return stageQuestions.value[stagePlayQuestionIndex.value] || {};
    });

    const getStagePool = (idx) => {
      const st = stagesList.value[idx];
      const pool = allQuestions.value.filter(q => q.chapterId === st.chapterId);
      let selected = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
      if (stageRelationReview.value && stageMistakePool.value.length > 0 && selected.length >= 2) {
        const reviewQ = stageMistakePool.value[Math.floor(Math.random() * stageMistakePool.value.length)];
        if (reviewQ && !selected.some(q => q.id === reviewQ.id)) {
          selected[0] = reviewQ;
        }
      }
      return selected;
    };

    const openStage = (idx) => {
      const st = stagesList.value[idx];
      if (!st.unlocked) return;

      currentPlayingStageIdx.value = idx;
      stageQuestions.value = getStagePool(idx);
      stagePlayQuestionIndex.value = 0;
      stageSelectedOption.value = null;
      stageAnswered.value = false;
      stageCurrentScore.value = 0;
      isStageFinished.value = false;
      isStagePlaying.value = true;
    };

    const listenStageQuestions = (idx) => {
      if (!isStagePlaying.value || currentPlayingStageIdx.value !== idx || stageQuestions.value.length === 0) {
        openStage(idx);
      }
      startAudioListening(
        stageQuestions.value,
        `STAGE ${idx + 1}: ${stagesList.value[idx].title}`,
        'stage',
        stagePlayQuestionIndex.value
      );
    };

    const listenAllUnlockedStages = () => {
      let fullList = [];
      stagesList.value.filter(s => s.unlocked).forEach(st => {
        const pool = allQuestions.value.filter(q => q.chapterId === st.chapterId).slice(0, 10);
        fullList = fullList.concat(pool);
      });
      startAudioListening(fullList, '解放済みステージ 全問聞き流し', 'audio', 0);
    };

    const handleStageOptionClick = (idx) => {
      if (stageAnswered.value) return;
      stageSelectedOption.value = idx;
      stageAnswered.value = true;
      if (idx === currentStageQuestion.value.correctIndex) {
        stageCurrentScore.value++;
      } else {
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
      stopGlobalAudio();
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
      const q = currentStageQuestion.value;
      const isCorrect = idx === q.correctIndex;
      const isChosen = stageSelectedOption.value === idx;
      const isReadingThisOpt = isSectionReading(q.id, `option-${idx}`);
      const isRevealedByAudio = isAudioRevealing(q.id);

      let cls = '';
      if (isReadingThisOpt) {
        cls = 'reading-section-active ';
      }

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !stageAnswered.value && isCorrect) {
        return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/70 font-semibold cursor-pointer';
      }

      if (!stageAnswered.value) {
        return cls + 'bg-slate-950 border-slate-800 hover:border-sky-500 text-slate-200 cursor-pointer';
      }

      if (isCorrect) return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
      if (isChosen && !isCorrect) return cls + 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
      return cls + 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
    };

    const getStageBadgeClass = (idx) => {
      const q = currentStageQuestion.value;
      const isCorrect = idx === q.correctIndex;
      const isChosen = stageSelectedOption.value === idx;
      const isRevealedByAudio = isAudioRevealing(q.id);

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !stageAnswered.value && isCorrect) {
        return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
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

    const listenAllFlashcards = () => {
      startAudioListening(flashcards.value, '重要数値・判定基準 フラッシュ暗記', 'flashcards', currentCardIndex.value);
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

    const listenDrillQuestions = () => {
      startAudioListening(activeDrillQuestions.value, '分野別特訓 連続聞き流し', 'drill', currentDrillIndex.value);
    };

    const getDrillOptionClass = (idx) => {
      const q = currentDrillQuestion.value;
      const isCorrect = idx === q.correctIndex;
      const isChosen = drillSelectedOption.value === idx;
      const isReadingThisOpt = isSectionReading(q.id, `option-${idx}`);
      const isRevealedByAudio = isAudioRevealing(q.id);

      let cls = isReadingThisOpt ? 'reading-section-active ' : '';

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !drillAnswered.value && isCorrect) {
        return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/70 font-semibold cursor-pointer';
      }

      if (!drillAnswered.value) return cls + 'bg-slate-950 border-slate-800 hover:border-sky-500 text-slate-200 cursor-pointer';
      if (isCorrect) return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
      if (isChosen && !isCorrect) return cls + 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
      return cls + 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
    };

    const getDrillBadgeClass = (idx) => {
      const q = currentDrillQuestion.value;
      const isCorrect = idx === q.correctIndex;
      const isChosen = drillSelectedOption.value === idx;
      const isRevealedByAudio = isAudioRevealing(q.id);

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !drillAnswered.value && isCorrect) {
        return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
      }

      if (!drillAnswered.value) return 'border-slate-800 bg-slate-900 text-slate-400';
      if (isCorrect) return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
      if (isChosen) return 'border-rose-500 bg-rose-500 text-white font-bold';
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

    const listenExamQuestions = () => {
      if (examQuestions.value.length === 0) {
        startSpecificExam(selectedExamMode.value);
      }
      startAudioListening(examQuestions.value, `${getExamModeTitle()} 聞き流し`, 'exam', currentExamIndex.value);
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
      const q = currentExamQuestion.value;
      const isAnswered = examUserAnswers.value[currentExamIndex.value] !== null;
      const isChosen = examUserAnswers.value[currentExamIndex.value] === idx;
      const isCorrect = idx === q.correctIndex;
      const isReadingThisOpt = isSectionReading(q.id, `option-${idx}`);
      const isRevealedByAudio = isAudioRevealing(q.id);

      let cls = isReadingThisOpt ? 'reading-section-active ' : '';

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !isAnswered && isCorrect) {
        return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/70 font-semibold cursor-pointer';
      }

      if (selectedExamMode.value === 'intensive20' && isAnswered) {
        if (isCorrect) return cls + 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-medium ring-1 ring-emerald-500/50';
        if (isChosen && !isCorrect) return cls + 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
        return cls + 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
      }

      if (isChosen) return cls + 'bg-indigo-950/50 border-indigo-500 text-indigo-100 font-medium ring-1 ring-indigo-500/50';
      return cls + 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 cursor-pointer';
    };

    const getExamBadgeClass = (idx) => {
      const q = currentExamQuestion.value;
      const isAnswered = examUserAnswers.value[currentExamIndex.value] !== null;
      const isChosen = examUserAnswers.value[currentExamIndex.value] === idx;
      const isCorrect = idx === q.correctIndex;
      const isRevealedByAudio = isAudioRevealing(q.id);

      if ((isGlobalCheatMode.value || isRevealedByAudio) && !isAnswered && isCorrect) {
        return 'border-emerald-500 bg-emerald-500 text-slate-950 font-bold';
      }

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

    const listenWrongExamQuestions = () => {
      const list = examWrongQuestions.value.map(w => w.q);
      startAudioListening(list, '模試 誤答・引っ掛け問題 集中聞き流し', 'audio', 0);
    };

    // ==========================================
    // 🚨 罠チートシート
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

    const listenCheatSheetQuestions = () => {
      startAudioListening(filteredCheatSheetQuestions.value.slice(0, 50), '罠チートシート 連続聞き流し', 'cheatsheet', 0);
    };

    // ==========================================
    // ダッシュボード・ヘルパー
    // ==========================================
    const getChapterTotal = (chId) => {
      return allQuestions.value.filter(q => q.chapterId === chId).length;
    };

    const getChapterProgressPercent = (chId) => {
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
        if (saved && saved.length >= 2000) {
          allQuestions.value = saved;
          return;
        }
      } catch (err) {
        console.warn('IndexedDB read failed:', err);
      }

      if (window.QUESTIONS_BANK && Array.isArray(window.QUESTIONS_BANK)) {
        allQuestions.value = window.QUESTIONS_BANK;
        await saveAllToDB(window.QUESTIONS_BANK);
      }
    };

    const resetToFactoryPool = async () => {
      if (!confirm('初期の全問題プール（2,310問）にリセットしますか？')) return;
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
      downloadAnchor.setAttribute("download", `g_kentei_questions_all_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    };

    onMounted(async () => {
      await loadQuestions();
    });

    onUnmounted(() => {
      clearInterval(examTimerInterval);
      stopGlobalAudio();
    });

    return {
      // 共通・UI
      fontSizeClass,
      setFontSize,
      themeClass,
      toggleTheme,
      isWakeLockActive,
      toggleWakeLock,
      isGlobalCheatMode,
      toggleGlobalCheatMode,
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
      // グローバル音声聞き流し＆文章追従エンジン
      isGlobalAudioActive,
      isGlobalAudioPlaying,
      globalAudioSpeed,
      globalAudioTitle,
      globalAudioPlaylist,
      globalAudioIndex,
      globalAudioState,
      readOptionsInAudio,
      toggleReadOptions,
      thinkingCountdown,
      readingItemId,
      readingSection,
      readingChunkIndex,
      readingLiveSubtitle,
      getTrackedHtml,
      isSectionReading,
      isAudioRevealing,
      currentGlobalAudioItem,
      startAudioListening,
      toggleGlobalAudioPlay,
      stopGlobalAudio,
      nextGlobalAudio,
      prevGlobalAudio,
      setGlobalAudioSpeed,
      speakSingleQuestion,
      speakSingleExplanation,
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
      openStage,
      listenStageQuestions,
      listenAllUnlockedStages,
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
      listenAllFlashcards,
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
      listenDrillQuestions,
      getDrillOptionClass,
      getDrillBadgeClass,
      // 実戦テスト
      selectedExamMode,
      getExamModeTitle,
      startSpecificExam,
      listenExamQuestions,
      listenWrongExamQuestions,
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
      listenCheatSheetQuestions,
      // 管理
      exportJSON,
      resetToFactoryPool
    };
  }
}).mount('#app');
