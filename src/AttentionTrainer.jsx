import { useState, useEffect, useCallback, useRef } from "react";
import "./AttentionTrainer.css";

const GAMES = ["schulte", "nback", "stroop"];

const GAME_LABELS = {
  schulte: "舒尔特方格",
  nback: "N-Back",
  stroop: "Stroop测试",
};

const GAME_DESC = {
  schulte: "按1→25顺序快速点击，训练视觉注意力广度",
  nback: "判断当前字母是否与N步前相同，训练工作记忆",
  stroop: "说出文字的颜色而非内容，训练抗干扰能力",
};

const GAME_META = {
  schulte: {
    index: "01",
    duration: "3–5 分钟",
    target: "视觉扫描",
    mark: "▦",
    tag: "视觉广度",
  },
  nback: {
    index: "02",
    duration: "4–6 分钟",
    target: "工作记忆",
    mark: "↺",
    tag: "记忆容量",
  },
  stroop: {
    index: "03",
    duration: "2–4 分钟",
    target: "抗干扰",
    mark: "色",
    tag: "反应抑制",
  },
};

// Web Audio API Sound Synthesizer (Zero external dependencies)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playTone(freq, type = "sine", duration = 0.08, gainVal = 0.12) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        this.ctx.currentTime + duration,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio errors ignored gracefully
    }
  }

  click(pitch = 520) {
    this.playTone(pitch, "triangle", 0.05, 0.08);
  }

  schulteStep(step) {
    // Dynamic ascending pitch as you approach 25
    const freq = 320 + (step / 25) * 580;
    this.playTone(freq, "sine", 0.07, 0.14);
  }

  correct() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.14);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.14);
      });
    } catch {}
  }

  wrong() {
    this.playTone(180, "sawtooth", 0.15, 0.12);
  }

  complete() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.12, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.32);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.09 + 0.32);
      });
    } catch {}
  }
}

const sounds = new SoundEngine();

export function scoreNBackResponses(sequence, n, responses) {
  let correct = 0;
  let total = 0;

  for (let i = n; i < sequence.length; i++) {
    const isMatch = sequence[i] === sequence[i - n];
    const userResponse = responses[i];
    total++;
    if (userResponse === isMatch) correct++;
  }

  return {
    correct,
    total,
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
}

function SessionHeader({ onBack, index, kicker, title, toolbar }) {
  return (
    <header className="session-header">
      <button
        className="back-button"
        onClick={() => {
          sounds.click(400);
          onBack();
        }}
        aria-label="返回专注控制台"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <div className="session-header__title-group">
        <div className="session-kicker">
          Module {index} / {kicker}
        </div>
        <h2 className="session-title">{title}</h2>
      </div>
      <div className="session-toolbar">{toolbar}</div>
    </header>
  );
}

function HistoryPanel({
  history,
  label = "最近训练",
  getHeight,
  formatValue,
  isHighlighted,
}) {
  if (!history || history.length === 0) return null;

  const recent = history.slice(-8);

  return (
    <section className="history-panel" aria-label={label}>
      <div className="history-header">
        <div className="history-label">
          <span className="history-label__icon">▤</span>
          {label} / 最近 {recent.length} 次记录
        </div>
        <div className="history-total">总计 {history.length} 轮</div>
      </div>
      <div className="history-chart">
        {recent.map((entry, index) => {
          const highlighted = isHighlighted ? isHighlighted(entry) : false;
          const height = getHeight(entry);
          return (
            <div
              className={`history-bar ${highlighted ? "is-highlight" : ""}`}
              key={`${entry.date || index}-${index}`}
            >
              <span className="history-bar__value">{formatValue(entry)}</span>
              <div className="history-bar__track">
                <span
                  className="history-bar__fill"
                  style={{ height: `${Math.max(6, Math.min(100, height))}%` }}
                />
              </div>
              <span className="history-bar__date">
                {entry.date ? entry.date.slice(-5) : `#${index + 1}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SchulteGrid({ onBack, history, setHistory }) {
  const [grid, setGrid] = useState([]);
  const [next, setNext] = useState(1);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [wrongCell, setWrongCell] = useState(null);
  const timerRef = useRef(null);

  const shuffle = useCallback(() => {
    const values = Array.from({ length: 25 }, (_, index) => index + 1);
    for (let index = values.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapIndex]] = [
        values[swapIndex],
        values[index],
      ];
    }
    return values;
  }, []);

  const startGame = useCallback(() => {
    sounds.click(600);
    setGrid(shuffle());
    setNext(1);
    setStarted(true);
    setFinished(false);
    setElapsed(0);
    setWrongCell(null);
    const startedAt = Date.now();
    setStartTime(startedAt);
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 50);
  }, [shuffle]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleClick = (number, index) => {
    if (!started || finished) return;
    if (number === next) {
      setWrongCell(null);
      sounds.schulteStep(next);

      if (number === 25) {
        clearInterval(timerRef.current);
        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        setFinished(true);
        sounds.complete();
        setHistory((entries) => [
          ...entries,
          {
            time: parseFloat(time),
            date: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          },
        ]);
      }
      setNext((prev) => prev + 1);
    } else {
      sounds.wrong();
      setWrongCell(index);
      setTimeout(() => setWrongCell(null), 350);
    }
  };

  const best = history.length
    ? Math.min(...history.map((entry) => entry.time))
    : null;
  const slowest = history.length
    ? Math.max(...history.slice(-8).map((entry) => entry.time))
    : 1;

  const currentSeconds = (elapsed / 1000).toFixed(1);
  const latestRun = history.length > 0 ? history[history.length - 1] : null;

  // Grade evaluation
  const getGrade = (time) => {
    if (time <= 15) return { tag: "极速卓越", grade: "S", desc: "神经反应极为敏锐，视觉广度顶级！" };
    if (time <= 22) return { tag: "优秀专注", grade: "A", desc: "扫描流畅，注意力集中度高。" };
    if (time <= 30) return { tag: "良好状态", grade: "B", desc: "表现稳定，保持呼吸节奏继续练习。" };
    return { tag: "稳步提升", grade: "C", desc: "建议视线放在中心，多用余光搜索周边。" };
  };

  return (
    <section className="session-shell session-shell--schulte">
      <SessionHeader
        onBack={onBack}
        index="01"
        kicker="Visual Scan"
        title="舒尔特方格"
        toolbar={
          <div className="session-readout" aria-live="polite">
            <small>Elapsed</small>
            <span className="readout-num">{currentSeconds}</span>
            <span className="readout-unit">s</span>
          </div>
        }
      />

      <div className="session-panel">
        {!started ? (
          <div className="session-intro">
            <div className="session-intro__badge">
              <span className="session-intro__code">01—25</span>
            </div>
            <h3>扩大视觉注意范围</h3>
            <p>
              眼睛尽量保持在中心区域，用余光搜索数字。
              按照从 <strong>1 到 25</strong> 的顺序依次点击。
            </p>
            <div className="intro-meta-tags">
              <span className="intro-meta-tag">⚡ 5×5 矩阵</span>
              <span className="intro-meta-tag">🎯 目标 25 格</span>
              {best && <span className="intro-meta-tag highlight">🏆 历史最佳 {best}s</span>}
            </div>
            <button className="control-button" onClick={startGame}>
              <span>开始训练</span>
            </button>
          </div>
        ) : (
          <>
            <div className="schulte-status" aria-live="polite">
              <div className="status-item">
                <span className="status-label">当前目标</span>
                <span className="status-target-pill">
                  <strong>{Math.min(next, 25)}</strong> / 25
                </span>
              </div>
              <div className="status-item status-item--right">
                <span className="status-label">最佳记录</span>
                <span className="status-best-text">
                  {best ? `最佳 ${best}s` : "建立首轮基准"}
                </span>
              </div>
            </div>

            <div className="schulte-grid" aria-label="舒尔特数字方格">
              {grid.map((number, index) => {
                const found = number < next;
                const isWrong = wrongCell === index;
                const isCurrent = number === next;
                return (
                  <button
                    className={`schulte-cell ${
                      found ? "is-found" : ""
                    } ${isWrong ? "is-wrong" : ""} ${
                      isCurrent ? "is-target" : ""
                    }`}
                    key={number}
                    onClick={() => handleClick(number, index)}
                    aria-label={`数字 ${number}${found ? "，已完成" : ""}`}
                    aria-disabled={found}
                  >
                    <span className="cell-number">{number}</span>
                    {found && <span className="cell-check">✓</span>}
                  </button>
                );
              })}
            </div>

            {finished && latestRun && (
              <div className="completion-banner" aria-live="polite">
                <div className="banner-badge">
                  <span className="grade-pill">
                    {getGrade(latestRun.time).grade}
                  </span>
                </div>
                <div className="banner-content">
                  <div className="banner-headline">
                    <strong>扫描完成 · {getGrade(latestRun.time).tag}</strong>
                    <span className="banner-sub">
                      本轮用时 <em>{latestRun.time}s</em>
                      {best && latestRun.time <= best && (
                        <span className="new-record-tag">🎉 新纪录!</span>
                      )}
                    </span>
                  </div>
                  <p className="banner-desc">{getGrade(latestRun.time).desc}</p>
                </div>
                <button className="control-button control-button--compact" onClick={startGame}>
                  <span>再来一轮</span>
                </button>
              </div>
            )}
          </>
        )}

        <HistoryPanel
          history={history}
          label="扫描速度"
          getHeight={(entry) =>
            Math.max(14, Math.round((best / entry.time) * 100))
          }
          formatValue={(entry) => `${entry.time}s`}
          isHighlighted={(entry) => entry.time === best && entry.time <= slowest}
        />
      </div>
    </section>
  );
}

function NBack({ onBack, history, setHistory }) {
  const [n, setN] = useState(2);
  const [sequence, setSequence] = useState([]);
  const [current, setCurrent] = useState(-1);
  const [running, setRunning] = useState(false);
  const [responded, setResponded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const sequenceLength = 20 + n;
  const letters = "BCDFGHJKLMNPQRSTVWXZ";
  const keyboardHint = "快捷键：M=相同，N 或空格=不同";
  const timerRef = useRef(null);
  const responsesRef = useRef({});

  const generateSequence = useCallback(() => {
    const generated = [];
    for (let index = 0; index < sequenceLength; index++) {
      if (index >= n && Math.random() < 0.35) {
        generated.push(generated[index - n]);
      } else {
        let letter;
        do {
          letter = letters[Math.floor(Math.random() * letters.length)];
        } while (index > 0 && letter === generated[index - 1]);
        generated.push(letter);
      }
    }
    return generated;
  }, [n, sequenceLength]);

  const startGame = () => {
    sounds.click(600);
    const generated = generateSequence();
    setSequence(generated);
    setCurrent(-1);
    responsesRef.current = {};
    setResults(null);
    setRunning(true);
    setResponded(false);
    setFeedback(null);
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setTimeout(
      () => {
        if (current < sequenceLength - 1) {
          setCurrent((value) => value + 1);
          setResponded(false);
          setFeedback(null);
        } else {
          setRunning(false);
          const result = scoreNBackResponses(
            sequence,
            n,
            responsesRef.current,
          );
          setResults(result);
          sounds.complete();
          setHistory((entries) => [
            ...entries,
            {
              n,
              accuracy: result.accuracy,
              correct: result.correct,
              total: result.total,
              date: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
          ]);
        }
      },
      current === -1 ? 400 : 2100,
    );
    return () => clearTimeout(timerRef.current);
  }, [current, n, running, sequence, sequenceLength, setHistory]);

  const handleResponse = useCallback(
    (isMatch) => {
      if (!running || current < n || responded) return;
      setResponded(true);
      const actualMatch = sequence[current] === sequence[current - n];
      responsesRef.current[current] = isMatch;
      const isCorrect = actualMatch === isMatch;
      if (isCorrect) {
        sounds.correct();
        setFeedback("correct");
      } else {
        sounds.wrong();
        setFeedback("wrong");
      }
    },
    [current, n, responded, running, sequence],
  );

  useEffect(() => {
    if (!running || current < n) return;
    const handler = (event) => {
      if (event.key === "m" || event.key === "M") {
        setActiveKey("m");
        handleResponse(true);
        setTimeout(() => setActiveKey(null), 150);
      }
      if (
        event.key === "n" ||
        event.key === "N" ||
        event.key === " "
      ) {
        setActiveKey("n");
        handleResponse(false);
        setTimeout(() => setActiveKey(null), 150);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, handleResponse, n, running]);

  const progress =
    current < 0 ? 0 : Math.round(((current + 1) / sequenceLength) * 100);

  const getNBackGrade = (acc) => {
    if (acc >= 90) return { grade: "S", label: "大师记忆", desc: "工作记忆容量与更新速度极其优异！" };
    if (acc >= 80) return { grade: "A", label: "敏锐记忆", desc: "记忆保持稳定，抗干扰良好。" };
    if (acc >= 65) return { grade: "B", label: "状态良好", desc: "持续练习可进一步扩展记忆广度。" };
    return { grade: "C", label: "热身复位", desc: "尝试在脑海中默念位置序列来辅助记忆。" };
  };

  return (
    <section className="session-shell session-shell--nback">
      <SessionHeader
        onBack={onBack}
        index="02"
        kicker="Working Memory"
        title="N-Back"
        toolbar={
          <div className="difficulty-group" aria-label="N-Back 难度">
            {[2, 3, 4].map((value) => (
              <button
                className={`difficulty-button ${n === value ? "is-active" : ""}`}
                key={value}
                onClick={() => {
                  sounds.click(450);
                  setN(value);
                }}
                disabled={running}
                aria-label={`${value}-Back难度${
                  running ? "，训练中不可切换" : ""
                }`}
              >
                {value}-Back
              </button>
            ))}
          </div>
        }
      />

      <div className="session-panel">
        {!running && !results && (
          <div className="session-intro">
            <div className="session-intro__badge">
              <span className="session-intro__code">{n}—BACK</span>
            </div>
            <h3>保持工作记忆在线</h3>
            <p>
              依次观察字母，判断当前字母是否与
              <strong> {n} 步前 </strong>
              相同。点击“相同”或“不同”作答。
              <br />
              <span className="keyboard-subhint">{keyboardHint}</span>
            </p>
            <div className="intro-meta-tags">
              <span className="intro-meta-tag">🧠 难度: {n}-Back</span>
              <span className="intro-meta-tag">📊 序列长度: {sequenceLength}</span>
            </div>
            <button className="control-button" onClick={startGame}>
              <span>开始训练</span>
            </button>
          </div>
        )}

        {running && (
          <>
            <div className="session-counter">
              <span className="counter-tag">Sequence</span>
              <strong>{Math.max(0, current + 1)}</strong> / {sequenceLength}
              <span className="counter-mode">· {n}-Back</span>
            </div>

            <div
              className={`stimulus-stage ${
                feedback ? `is-${feedback}` : ""
              }`}
              aria-live="polite"
              aria-label={
                current >= 0 ? `当前字母 ${sequence[current]}` : "准备开始"
              }
            >
              <div className="stimulus-corner tl" />
              <div className="stimulus-corner tr" />
              <div className="stimulus-corner bl" />
              <div className="stimulus-corner br" />
              <span className="stimulus-letter">
                {current >= 0 ? sequence[current] : "·"}
              </span>
            </div>

            {current >= n ? (
              <div className="response-controls">
                <div className="keyboard-hint">{keyboardHint}</div>
                <div className="response-buttons">
                  <button
                    className={`answer-button answer-button--primary ${
                      activeKey === "m" ? "is-pressed" : ""
                    }`}
                    onClick={() => handleResponse(true)}
                    disabled={responded}
                    aria-label="回答相同，快捷键 M"
                  >
                    <span className="btn-key-badge">M</span>
                    <span>相同</span>
                  </button>
                  <button
                    className={`answer-button ${
                      activeKey === "n" ? "is-pressed" : ""
                    }`}
                    onClick={() => handleResponse(false)}
                    disabled={responded}
                    aria-label="回答不同，快捷键 N 或空格"
                  >
                    <span className="btn-key-badge">N</span>
                    <span>不同</span>
                  </button>
                </div>
              </div>
            ) : (
              current >= 0 && (
                <div className="memory-hint">
                  <span className="pulse-dot" /> 先记住前 {n} 个字母，准备比对...
                </div>
              )
            )}

            <div
              className="sequence-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div
                className="sequence-progress__fill"
                style={{ "--progress": `${progress}%`, width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {results && (
          <div className="result-card" aria-live="polite">
            <div className="result-card__eyebrow">Session Complete</div>
            <div className="result-badge-wrap">
              <div className="result-card__value">{results.accuracy}%</div>
              <span className="result-grade-tag">
                {getNBackGrade(results.accuracy).label}
              </span>
            </div>
            <div className="result-card__detail">
              正确 <strong>{results.correct}</strong> / {results.total} · {n}-Back 难度
            </div>
            <p className="result-desc">{getNBackGrade(results.accuracy).desc}</p>
            <button className="control-button" onClick={startGame}>
              <span>再来一轮</span>
            </button>
          </div>
        )}

        {!running && (
          <HistoryPanel
            history={history}
            label="记忆准确率"
            getHeight={(entry) => Math.max(8, entry.accuracy)}
            formatValue={(entry) => `${entry.accuracy}%`}
            isHighlighted={(entry) => entry.accuracy >= 80}
          />
        )}
      </div>
    </section>
  );
}

const STROOP_COLORS = [
  { name: "红", color: "#ff5364" },
  { name: "蓝", color: "#38bdf8" },
  { name: "绿", color: "#4ade80" },
  { name: "黄", color: "#facc15" },
  { name: "紫", color: "#c084fc" },
];

function Stroop({ onBack, history, setHistory }) {
  const [running, setRunning] = useState(false);
  const [trials, setTrials] = useState([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [trialStartTime, setTrialStartTime] = useState(null);
  const [reactionTimes, setReactionTimes] = useState([]);
  const totalTrials = 20;

  const generateTrials = () => {
    const generated = [];
    for (let index = 0; index < totalTrials; index++) {
      const wordIndex = Math.floor(Math.random() * STROOP_COLORS.length);
      let colorIndex;
      do {
        colorIndex = Math.floor(Math.random() * STROOP_COLORS.length);
      } while (colorIndex === wordIndex);
      generated.push({
        word: STROOP_COLORS[wordIndex].name,
        color: STROOP_COLORS[colorIndex],
      });
    }
    return generated;
  };

  const startGame = () => {
    sounds.click(600);
    setTrials(generateTrials());
    setCurrent(0);
    setCorrect(0);
    setResults(null);
    setFeedback(null);
    setReactionTimes([]);
    setRunning(true);
    const now = Date.now();
    setStartTime(now);
    setTrialStartTime(now);
  };

  const handleAnswer = (colorName) => {
    if (!running || feedback) return;
    const isCorrect = colorName === trials[current].color.name;
    const reactionTime = Date.now() - trialStartTime;
    setReactionTimes((prev) => [...prev, reactionTime]);

    if (isCorrect) {
      sounds.correct();
      setCorrect((value) => value + 1);
    } else {
      sounds.wrong();
    }
    setFeedback(isCorrect ? "correct" : "wrong");

    setTimeout(() => {
      setFeedback(null);
      if (current + 1 >= totalTrials) {
        setRunning(false);
        sounds.complete();
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const finalCorrect = isCorrect ? correct + 1 : correct;
        const accuracy = Math.round((finalCorrect / totalTrials) * 100);
        const avgReaction = Math.round(
          [...reactionTimes, reactionTime].reduce((a, b) => a + b, 0) /
            totalTrials,
        );

        setResults({
          accuracy,
          time: parseFloat(elapsed),
          avgReaction,
        });
        setHistory((entries) => [
          ...entries,
          {
            accuracy,
            time: parseFloat(elapsed),
            avgReaction,
            date: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          },
        ]);
      } else {
        setCurrent((value) => value + 1);
        setTrialStartTime(Date.now());
      }
    }, 450);
  };

  const getOptions = useCallback(() => {
    if (!running || !trials[current]) return [];
    const correctColor = trials[current].color.name;
    const options = [correctColor];
    while (options.length < 4) {
      const randomColor =
        STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)].name;
      if (!options.includes(randomColor)) options.push(randomColor);
    }
    for (let index = options.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[swapIndex]] = [
        options[swapIndex],
        options[index],
      ];
    }
    return options;
  }, [current, running, trials]);

  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (running && trials[current]) {
      setOptions(getOptions());
    }
  }, [current, getOptions, running, trials]);

  // Keyboard shortcut listener for 1, 2, 3, 4
  useEffect(() => {
    if (!running || !options.length || feedback) return;
    const handler = (e) => {
      const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (e.key in keyMap) {
        const selected = options[keyMap[e.key]];
        if (selected) handleAnswer(selected);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const progress = running
    ? Math.round(((current + 1) / totalTrials) * 100)
    : 0;

  const getStroopGrade = (acc) => {
    if (acc >= 95) return { grade: "S", label: "绝对免疫", desc: "大脑抗干扰与抑制控制能力极强！" };
    if (acc >= 85) return { grade: "A", label: "敏锐清晰", desc: "抗干扰表现稳定，反应果断快速。" };
    if (acc >= 70) return { grade: "B", label: "抗性良好", desc: "偶尔受词义干扰，保持专注即可突破。" };
    return { grade: "C", label: "需加训练", desc: "提示：看到文字时先默念'颜色'而非读出词义。" };
  };

  return (
    <section className="session-shell session-shell--stroop">
      <SessionHeader
        onBack={onBack}
        index="03"
        kicker="Interference Control"
        title="Stroop 测试"
        toolbar={
          <div className="session-readout" aria-live="polite">
            <small>Trials</small>
            <span className="readout-num">
              {running ? `${current + 1}/${totalTrials}` : totalTrials}
            </span>
          </div>
        }
      />

      <div className="session-panel">
        {!running && !results && (
          <div className="session-intro">
            <div className="session-intro__badge">
              <span className="session-intro__code">INK≠WORD</span>
            </div>
            <h3>过滤文字干扰</h3>
            <p>
              屏幕会显示一个颜色词，但字体使用另一种颜色。
              请选择<strong>字体的颜色</strong>，不要选择文字内容。
            </p>
            <div className="intro-meta-tags">
              <span className="intro-meta-tag">🎨 5色冲突</span>
              <span className="intro-meta-tag">⚡ 20 次快速判定</span>
              <span className="intro-meta-tag">⌨️ 支持数字键 1-4</span>
            </div>
            <button className="control-button" onClick={startGame}>
              <span>开始训练</span>
            </button>
          </div>
        )}

        {running && trials[current] && (
          <>
            <div className="session-counter">
              <span className="counter-tag">Interference</span>
              <strong>{current + 1}</strong> / {totalTrials}
            </div>

            <div
              className={`stimulus-stage stimulus-stage--stroop ${
                feedback ? `is-${feedback}` : ""
              }`}
              aria-live="polite"
              aria-label={`文字 ${trials[current].word}，请选择字体颜色`}
            >
              <div className="stimulus-corner tl" />
              <div className="stimulus-corner tr" />
              <div className="stimulus-corner bl" />
              <div className="stimulus-corner br" />
              <span
                className="stimulus-word"
                style={{ color: trials[current].color.color }}
              >
                {trials[current].word}
              </span>
            </div>

            <div className="stimulus-question">
              这个字的<strong>字体颜色</strong>是什么？（按数字键 1–4 或点击）
            </div>

            <div className="stroop-options">
              {options.map((option, idx) => {
                const colorObj = STROOP_COLORS.find((c) => c.name === option);
                return (
                  <button
                    className="answer-button answer-button--stroop"
                    key={option}
                    onClick={() => handleAnswer(option)}
                    disabled={Boolean(feedback)}
                  >
                    <span className="stroop-key-pill">{idx + 1}</span>
                    <span
                      className="stroop-color-dot"
                      style={{ background: colorObj?.color || "#fff" }}
                    />
                    <span className="stroop-option-name">{option}色</span>
                  </button>
                );
              })}
            </div>

            <div
              className="sequence-progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div
                className="sequence-progress__fill"
                style={{ "--progress": `${progress}%`, width: `${progress}%` }}
              />
            </div>
          </>
        )}

        {results && (
          <div className="result-card" aria-live="polite">
            <div className="result-card__eyebrow">Interference Cleared</div>
            <div className="result-badge-wrap">
              <div className="result-card__value">{results.accuracy}%</div>
              <span className="result-grade-tag">
                {getStroopGrade(results.accuracy).label}
              </span>
            </div>
            <div className="result-card__detail">
              完成 20 次判断 · 用时 <strong>{results.time}s</strong>
              {results.avgReaction ? ` · 平均反应 ${results.avgReaction}ms` : ""}
            </div>
            <p className="result-desc">{getStroopGrade(results.accuracy).desc}</p>
            <button className="control-button" onClick={startGame}>
              <span>再来一轮</span>
            </button>
          </div>
        )}

        {!running && (
          <HistoryPanel
            history={history}
            label="抗干扰准确率"
            getHeight={(entry) => Math.max(8, entry.accuracy)}
            formatValue={(entry) => `${entry.accuracy}%`}
            isHighlighted={(entry) => entry.accuracy >= 80}
          />
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [active, setActive] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // LocalStorage Persistence
  const [schulteHistory, setSchulteHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("att_schulte_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [nbackHistory, setNbackHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("att_nback_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stroopHistory, setStroopHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("att_stroop_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("att_schulte_history", JSON.stringify(schulteHistory));
    } catch {}
  }, [schulteHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("att_nback_history", JSON.stringify(nbackHistory));
    } catch {}
  }, [nbackHistory]);

  useEffect(() => {
    try {
      localStorage.setItem("att_stroop_history", JSON.stringify(stroopHistory));
    } catch {}
  }, [stroopHistory]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.click(700);
  };

  const handleResetHistory = () => {
    if (window.confirm("确定要清空所有训练历史数据吗？")) {
      setSchulteHistory([]);
      setNbackHistory([]);
      setStroopHistory([]);
      try {
        localStorage.removeItem("att_schulte_history");
        localStorage.removeItem("att_nback_history");
        localStorage.removeItem("att_stroop_history");
      } catch {}
      sounds.click(300);
    }
  };

  const histories = {
    schulte: schulteHistory,
    nback: nbackHistory,
    stroop: stroopHistory,
  };

  const totalSessions =
    schulteHistory.length + nbackHistory.length + stroopHistory.length;

  return (
    <div className="attention-app">
      <link
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700;900&display=swap"
        rel="stylesheet"
      />
      <div className="ambient-grid" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--1" aria-hidden="true" />
      <div className="ambient-glow ambient-glow--2" aria-hidden="true" />

      <main className="focus-console">
        {!active && (
          <div className="console-home">
            <header className="console-header">
              <div className="console-header__top">
                <div>
                  <div className="console-eyebrow">
                    <span className="eyebrow-chip">PRO</span>
                    Cognitive Training Unit
                  </div>
                  <h1 className="console-title">
                    专注
                    <span>控制台</span>
                  </h1>
                  <p className="console-subtitle">
                    三个短时认知训练模块，帮助你校准视觉注意、
                    工作记忆与抗干扰能力。一次训练，从清晰开始。
                  </p>
                </div>
                <div className="header-controls">
                  <button
                    className={`sound-toggle-btn ${soundEnabled ? "is-on" : ""}`}
                    onClick={toggleSound}
                    title={soundEnabled ? "音效已开启" : "音效已静音"}
                    aria-label={soundEnabled ? "关闭音效" : "开启音效"}
                  >
                    <span className="sound-icon">{soundEnabled ? "🔊" : "🔇"}</span>
                    <span className="sound-text">
                      {soundEnabled ? "音效 ON" : "静音 OFF"}
                    </span>
                  </button>

                  <div className="system-status" role="status">
                    <span className="system-status__dot" aria-hidden="true" />
                    系统就绪
                  </div>
                </div>
              </div>

              <div className="console-metrics" aria-label="训练概览">
                <div className="metric">
                  <div className="metric-value">
                    <em>{String(totalSessions).padStart(2, "0")}</em>
                  </div>
                  <div className="metric-label">本次完成轮次</div>
                </div>
                <div className="metric">
                  <div className="metric-value">10 MIN</div>
                  <div className="metric-label">建议每日训练</div>
                </div>
                <div className="metric">
                  <div className="metric-value">03</div>
                  <div className="metric-label">认知训练模块</div>
                </div>
                {totalSessions > 0 && (
                  <div className="metric metric--reset">
                    <button
                      className="reset-history-btn"
                      onClick={handleResetHistory}
                      title="重置所有历史记录"
                    >
                      清空记录
                    </button>
                  </div>
                )}
              </div>
            </header>

            <section className="training-section" aria-labelledby="training-title">
              <div className="section-heading">
                <div>
                  <h2 id="training-title">选择训练模块</h2>
                  <p className="section-desc">每日坚持 10 分钟，显著提升专注稳定性与工作记忆</p>
                </div>
                <span className="protocol-badge">Select a protocol</span>
              </div>

              <div className="training-grid">
                {GAMES.map((game) => {
                  const history = histories[game];
                  const meta = GAME_META[game];
                  return (
                    <button
                      className="training-card"
                      data-game={game}
                      key={game}
                      onClick={() => {
                        sounds.click(600);
                        setActive(game);
                      }}
                      aria-label={`开始${GAME_LABELS[game]}训练：${GAME_DESC[game]}`}
                    >
                      <div className="training-card__top">
                        <span className="training-card__index">
                          Module {meta.index}
                        </span>
                        <div className="card-pill-group">
                          <span className="training-card__tag">{meta.tag}</span>
                          {history.length > 0 && (
                            <span className="training-card__count">
                              {history.length} 轮
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="training-card__mark" aria-hidden="true">
                        {meta.mark}
                      </div>
                      <h3 className="training-card__title">
                        {GAME_LABELS[game]}
                      </h3>
                      <p className="training-card__description">
                        {GAME_DESC[game]}
                      </p>
                      <div className="training-card__footer">
                        <span className="training-card__meta">
                          {meta.duration} · {meta.target}
                        </span>
                        <span className="training-card__arrow" aria-hidden="true">
                          →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <aside className="protocol" aria-label="推荐训练协议">
              <div className="protocol-heading">
                <div className="protocol-title">Recommended Protocol</div>
                <strong>10 分钟训练协议</strong>
                <span className="protocol-subtext">科学递进·唤醒大脑</span>
              </div>
              <div className="protocol-steps">
                <div className="protocol-step">
                  <div className="step-num">01 / 热身</div>
                  <div className="step-title">舒尔特方格</div>
                  <div className="step-desc">扩大周边视野，唤醒视觉扫描与专注广度</div>
                </div>
                <div className="protocol-step">
                  <div className="step-num">02 / 核心</div>
                  <div className="step-title">N-Back 记忆</div>
                  <div className="step-desc">持续更新脑中缓存，深度激活工作记忆容量</div>
                </div>
                <div className="protocol-step">
                  <div className="step-num">03 / 收尾</div>
                  <div className="step-title">Stroop 抑制</div>
                  <div className="step-desc">强化抗干扰控制，抑制自动化语义冲动</div>
                </div>
              </div>
            </aside>

            <footer className="console-footer">
              <span>Local session · 数据保存在本地浏览器</span>
              <span>Focus protocol v2.0 · Designed for High Performance</span>
            </footer>
          </div>
        )}

        {active === "schulte" && (
          <SchulteGrid
            onBack={() => setActive(null)}
            history={schulteHistory}
            setHistory={setSchulteHistory}
          />
        )}
        {active === "nback" && (
          <NBack
            onBack={() => setActive(null)}
            history={nbackHistory}
            setHistory={setNbackHistory}
          />
        )}
        {active === "stroop" && (
          <Stroop
            onBack={() => setActive(null)}
            history={stroopHistory}
            setHistory={setStroopHistory}
          />
        )}
      </main>
    </div>
  );
}
