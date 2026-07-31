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
  },
  nback: {
    index: "02",
    duration: "4–6 分钟",
    target: "工作记忆",
    mark: "↺",
  },
  stroop: {
    index: "03",
    duration: "2–4 分钟",
    target: "抗干扰",
    mark: "色",
  },
};

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
      <button className="back-button" onClick={onBack} aria-label="返回专注控制台">
        ←
      </button>
      <div>
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
  if (history.length === 0) return null;

  const recent = history.slice(-8);

  return (
    <section className="history-panel" aria-label={label}>
      <div className="history-label">
        {label} / Last {recent.length}
      </div>
      <div className="history-chart">
        {recent.map((entry, index) => (
          <div className="history-bar" key={`${entry.date}-${index}`}>
            <span className="history-bar__value">{formatValue(entry)}</span>
            <span
              className={`history-bar__fill ${
                isHighlighted(entry) ? "is-highlight" : ""
              }`}
              style={{ "--bar-height": `${getHeight(entry)}%` }}
            />
          </div>
        ))}
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
    setGrid(shuffle());
    setNext(1);
    setStarted(true);
    setFinished(false);
    setElapsed(0);
    setWrongCell(null);
    const startedAt = Date.now();
    setStartTime(startedAt);
    timerRef.current = setInterval(
      () => setElapsed(Date.now() - startedAt),
      100,
    );
  }, [shuffle]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleClick = (number, index) => {
    if (!started || finished) return;
    if (number === next) {
      setWrongCell(null);
      if (number === 25) {
        clearInterval(timerRef.current);
        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        setFinished(true);
        setHistory((entries) => [
          ...entries,
          {
            time: parseFloat(time),
            date: new Date().toLocaleTimeString(),
          },
        ]);
      }
      setNext(next + 1);
    } else {
      setWrongCell(index);
      setTimeout(() => setWrongCell(null), 400);
    }
  };

  const best = history.length
    ? Math.min(...history.map((entry) => entry.time))
    : null;
  const slowest = history.length
    ? Math.max(...history.slice(-8).map((entry) => entry.time))
    : 1;

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
            {(elapsed / 1000).toFixed(1)}s
          </div>
        }
      />

      <div className="session-panel">
        {!started ? (
          <div className="session-intro">
            <div className="session-intro__code">01—25</div>
            <h3>扩大视觉注意范围</h3>
            <p>
              眼睛尽量保持在中心区域，用余光搜索数字。
              按照从 1 到 25 的顺序依次点击。
            </p>
            <button className="control-button" onClick={startGame}>
              开始训练
            </button>
          </div>
        ) : (
          <>
            <div className="schulte-status" aria-live="polite">
              <span>
                当前目标 <strong>{Math.min(next, 25)}</strong> / 25
              </span>
              <span>{best ? `最佳 ${best}s` : "建立首轮基准"}</span>
            </div>

            <div className="schulte-grid" aria-label="舒尔特数字方格">
              {grid.map((number, index) => {
                const found = number < next;
                const isWrong = wrongCell === index;
                return (
                  <button
                    className={`schulte-cell ${
                      found ? "is-found" : ""
                    } ${isWrong ? "is-wrong" : ""}`}
                    key={number}
                    onClick={() => handleClick(number, index)}
                    aria-label={`数字 ${number}${found ? "，已完成" : ""}`}
                    aria-disabled={found}
                  >
                    {number}
                  </button>
                );
              })}
            </div>

            {finished && (
              <div className="completion-banner" aria-live="polite">
                <div>
                  <strong>扫描完成</strong>
                  <span>
                    本轮用时 {history[history.length - 1].time}s
                  </span>
                </div>
                <button className="control-button" onClick={startGame}>
                  再来一轮
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
  const sequenceLength = 20 + n;
  const letters = "BCDFGHJKLMNPQRSTVWXZ";
  const keyboardHint = "快捷键：M=相同，N 或空格=不同";
  const timerRef = useRef(null);
  const responsesRef = useRef({});

  const generateSequence = useCallback(() => {
    const generated = [];
    for (let index = 0; index < sequenceLength; index++) {
      if (index >= n && Math.random() < 0.33) {
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
          setHistory((entries) => [
            ...entries,
            {
              n,
              accuracy: result.accuracy,
              date: new Date().toLocaleTimeString(),
            },
          ]);
        }
      },
      current === -1 ? 500 : 2200,
    );
    return () => clearTimeout(timerRef.current);
  }, [current, n, running, sequence, sequenceLength, setHistory]);

  const handleResponse = useCallback(
    (isMatch) => {
      if (!running || current < n || responded) return;
      setResponded(true);
      const actualMatch = sequence[current] === sequence[current - n];
      responsesRef.current[current] = isMatch;
      setFeedback(actualMatch === isMatch ? "correct" : "wrong");
    },
    [current, n, responded, running, sequence],
  );

  useEffect(() => {
    if (!running || current < n) return;
    const handler = (event) => {
      if (event.key === "m" || event.key === "M") handleResponse(true);
      if (
        event.key === "n" ||
        event.key === "N" ||
        event.key === " "
      ) {
        handleResponse(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [current, handleResponse, n, running]);

  const progress =
    current < 0 ? 0 : Math.round(((current + 1) / sequenceLength) * 100);

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
                onClick={() => setN(value)}
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
            <div className="session-intro__code">{n}—BACK</div>
            <h3>保持工作记忆在线</h3>
            <p>
              依次观察字母，判断当前字母是否与
              <strong> {n} 步前 </strong>
              相同。点击“相同”或“不同”作答。
              <br />
              {keyboardHint}
            </p>
            <button className="control-button" onClick={startGame}>
              开始训练
            </button>
          </div>
        )}

        {running && (
          <>
            <div className="session-counter">
              Sequence <strong>{Math.max(0, current + 1)}</strong> /{" "}
              {sequenceLength} · {n}-Back
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
              <span className="stimulus-letter">
                {current >= 0 ? sequence[current] : ""}
              </span>
            </div>

            {current >= n ? (
              <div className="response-controls">
                <div className="keyboard-hint">{keyboardHint}</div>
                <div className="response-buttons">
                  <button
                    className="answer-button answer-button--primary"
                    onClick={() => handleResponse(true)}
                    disabled={responded}
                    aria-label="回答相同，快捷键 M"
                  >
                    相同 (M)
                  </button>
                  <button
                    className="answer-button"
                    onClick={() => handleResponse(false)}
                    disabled={responded}
                    aria-label="回答不同，快捷键 N 或空格"
                  >
                    不同 (N)
                  </button>
                </div>
              </div>
            ) : (
              current >= 0 && (
                <div className="memory-hint">先记住前 {n} 个字母</div>
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
                style={{ "--progress": `${progress}%` }}
              />
            </div>
          </>
        )}

        {results && (
          <div className="result-card" aria-live="polite">
            <div className="result-card__eyebrow">Session Complete</div>
            <div className="result-card__value">{results.accuracy}%</div>
            <div className="result-card__detail">
              正确 {results.correct} / {results.total}
            </div>
            <button className="control-button" onClick={startGame}>
              再来一轮
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
  { name: "红", color: "#ff5f68" },
  { name: "蓝", color: "#50a8ff" },
  { name: "绿", color: "#5fdd8d" },
  { name: "黄", color: "#f2cb4d" },
  { name: "紫", color: "#ba88ff" },
];

function Stroop({ onBack, history, setHistory }) {
  const [running, setRunning] = useState(false);
  const [trials, setTrials] = useState([]);
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const [startTime, setStartTime] = useState(null);
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
    setTrials(generateTrials());
    setCurrent(0);
    setCorrect(0);
    setResults(null);
    setFeedback(null);
    setRunning(true);
    setStartTime(Date.now());
  };

  const handleAnswer = (colorName) => {
    if (!running || feedback) return;
    const isCorrect = colorName === trials[current].color.name;
    if (isCorrect) setCorrect((value) => value + 1);
    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => {
      setFeedback(null);
      if (current + 1 >= totalTrials) {
        setRunning(false);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const accuracy = Math.round(
          ((isCorrect ? correct + 1 : correct) / totalTrials) * 100,
        );
        setResults({
          accuracy,
          time: parseFloat(elapsed),
        });
        setHistory((entries) => [
          ...entries,
          {
            accuracy,
            time: parseFloat(elapsed),
            date: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        setCurrent((value) => value + 1);
      }
    }, 500);
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

  const progress = running
    ? Math.round(((current + 1) / totalTrials) * 100)
    : 0;

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
            {running ? `${current + 1}/${totalTrials}` : totalTrials}
          </div>
        }
      />

      <div className="session-panel">
        {!running && !results && (
          <div className="session-intro">
            <div className="session-intro__code">INK≠WORD</div>
            <h3>过滤文字干扰</h3>
            <p>
              屏幕会显示一个颜色词，但字体使用另一种颜色。
              请选择<strong>字体的颜色</strong>，不要选择文字内容。
            </p>
            <button className="control-button" onClick={startGame}>
              开始训练
            </button>
          </div>
        )}

        {running && trials[current] && (
          <>
            <div className="session-counter">
              Interference <strong>{current + 1}</strong> / {totalTrials}
            </div>
            <div
              className={`stimulus-stage ${
                feedback ? `is-${feedback}` : ""
              }`}
              aria-live="polite"
              aria-label={`文字 ${trials[current].word}，请选择字体颜色`}
            >
              <span
                className="stimulus-word"
                style={{ color: trials[current].color.color }}
              >
                {trials[current].word}
              </span>
            </div>
            <div className="stimulus-question">这个字的字体颜色是什么？</div>
            <div className="stroop-options">
              {options.map((option) => (
                <button
                  className="answer-button"
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={Boolean(feedback)}
                >
                  {option}
                </button>
              ))}
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
                style={{ "--progress": `${progress}%` }}
              />
            </div>
          </>
        )}

        {results && (
          <div className="result-card" aria-live="polite">
            <div className="result-card__eyebrow">Interference Cleared</div>
            <div className="result-card__value">{results.accuracy}%</div>
            <div className="result-card__detail">
              完成 20 次判断 · 用时 {results.time}s
            </div>
            <button className="control-button" onClick={startGame}>
              再来一轮
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
  const [schulteHistory, setSchulteHistory] = useState([]);
  const [nbackHistory, setNbackHistory] = useState([]);
  const [stroopHistory, setStroopHistory] = useState([]);

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
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Noto+Sans+SC:wght@400;500;600;700;900&display=swap"
        rel="stylesheet"
      />
      <div className="ambient-grid" aria-hidden="true" />

      <main className="focus-console">
        {!active && (
          <div className="console-home">
            <header className="console-header">
              <div className="console-header__top">
                <div>
                  <div className="console-eyebrow">
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
                <div className="system-status" role="status">
                  <span className="system-status__dot" aria-hidden="true" />
                  系统就绪
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
              </div>
            </header>

            <section className="training-section" aria-labelledby="training-title">
              <div className="section-heading">
                <h2 id="training-title">选择训练模块</h2>
                <span>Select a protocol</span>
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
                      onClick={() => setActive(game)}
                      aria-label={`开始${GAME_LABELS[game]}训练：${GAME_DESC[game]}`}
                    >
                      <div className="training-card__top">
                        <span className="training-card__index">
                          Module {meta.index}
                        </span>
                        {history.length > 0 && (
                          <span className="training-card__count">
                            {history.length} 轮
                          </span>
                        )}
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
                <div className="protocol-title">Recommended</div>
                <strong>10 分钟训练协议</strong>
              </div>
              <div className="protocol-steps">
                <div className="protocol-step">
                  <span>01 / 热身</span>
                  舒尔特方格唤醒视觉扫描
                </div>
                <div className="protocol-step">
                  <span>02 / 核心</span>
                  N-Back 激活工作记忆
                </div>
                <div className="protocol-step">
                  <span>03 / 收尾</span>
                  Stroop 训练干扰抑制
                </div>
              </div>
            </aside>

            <footer className="console-footer">
              <span>Local session · No account required</span>
              <span>Focus protocol v1.0</span>
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
