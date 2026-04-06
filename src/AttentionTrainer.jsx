import { useState, useEffect, useCallback, useRef } from "react";

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
const GAME_ICONS = {
  schulte: "◫",
  nback: "⟲",
  stroop: "◉",
};

// ─── Schulte Grid ───
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
    const arr = Array.from({ length: 25 }, (_, i) => i + 1);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, []);

  const startGame = useCallback(() => {
    setGrid(shuffle());
    setNext(1);
    setStarted(true);
    setFinished(false);
    setElapsed(0);
    setWrongCell(null);
    const t = Date.now();
    setStartTime(t);
    timerRef.current = setInterval(() => setElapsed(Date.now() - t), 100);
  }, [shuffle]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleClick = (num, idx) => {
    if (!started || finished) return;
    if (num === next) {
      setWrongCell(null);
      if (num === 25) {
        clearInterval(timerRef.current);
        const time = ((Date.now() - startTime) / 1000).toFixed(1);
        setFinished(true);
        setHistory((h) => [...h, { time: parseFloat(time), date: new Date().toLocaleTimeString() }]);
      }
      setNext(next + 1);
    } else {
      setWrongCell(idx);
      setTimeout(() => setWrongCell(null), 400);
    }
  };

  const best = history.length ? Math.min(...history.map((h) => h.time)) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", justifyContent: "space-between" }}>
        <button onClick={onBack} style={backBtnStyle}>← 返回</button>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: "var(--c-text)" }}>
          {(elapsed / 1000).toFixed(1)}s
        </div>
      </div>

      {!started ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--c-sub)", fontSize: 15, lineHeight: 1.8, marginBottom: 24, maxWidth: 340 }}>
            眼睛尽量盯住中心区域，用余光搜索数字。按 1→25 顺序依次点击。
          </p>
          <button onClick={startGame} style={primaryBtnStyle}>开始训练</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 14, color: "var(--c-sub)", marginBottom: -8 }}>
            找到: <span style={{ color: "var(--c-accent)", fontWeight: 700 }}>{Math.min(next, 25)}</span>/25
            {best && <span style={{ marginLeft: 16 }}>最佳: {best}s</span>}
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6,
            width: "min(340px, 85vw)", aspectRatio: "1"
          }}>
            {grid.map((num, i) => {
              const found = num < next;
              const isWrong = wrongCell === i;
              return (
                <button key={i} onClick={() => handleClick(num, i)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 700,
                    fontFamily: "'DM Mono', monospace",
                    borderRadius: 10, border: "none", cursor: found ? "default" : "pointer",
                    background: found ? "var(--c-found)" : isWrong ? "var(--c-wrong)" : "var(--c-cell)",
                    color: found ? "var(--c-found-text)" : "var(--c-text)",
                    transition: "all .15s",
                    transform: isWrong ? "scale(0.92)" : "scale(1)",
                    opacity: found ? 0.35 : 1,
                  }}>{num}</button>
              );
            })}
          </div>
          {finished && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-accent)", marginBottom: 12 }}>
                完成！用时 {history[history.length - 1].time}s
              </div>
              <button onClick={startGame} style={primaryBtnStyle}>再来一轮</button>
            </div>
          )}
        </>
      )}

      {history.length > 0 && (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "var(--c-sub)", marginBottom: 8 }}>历史记录 (最近{Math.min(history.length, 8)}轮)</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 60 }}>
            {history.slice(-8).map((h, i) => {
              const max = Math.max(...history.slice(-8).map(x => x.time));
              const pct = (h.time / max) * 100;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "var(--c-sub)" }}>{h.time}s</span>
                  <div style={{
                    width: "100%", height: `${pct}%`, minHeight: 4,
                    background: h.time === best ? "var(--c-accent)" : "var(--c-cell)",
                    borderRadius: 4,
                  }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── N-Back ───
function NBack({ onBack, history, setHistory }) {
  const [n, setN] = useState(2);
  const [sequence, setSequence] = useState([]);
  const [current, setCurrent] = useState(-1);
  const [running, setRunning] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [responded, setResponded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState(null);
  const seqLen = 20 + n;
  const letters = "BCDFGHJKLMNPQRSTVWXZ";
  const timerRef = useRef(null);

  const generateSeq = useCallback(() => {
    const seq = [];
    for (let i = 0; i < seqLen; i++) {
      if (i >= n && Math.random() < 0.33) {
        seq.push(seq[i - n]);
      } else {
        let c;
        do { c = letters[Math.floor(Math.random() * letters.length)]; } while (i > 0 && c === seq[i - 1]);
        seq.push(c);
      }
    }
    return seq;
  }, [n, seqLen]);

  const startGame = () => {
    const seq = generateSeq();
    setSequence(seq);
    setCurrent(-1);
    setAnswers([]);
    setResults(null);
    setRunning(true);
    setResponded(false);
    setFeedback(null);
  };

  useEffect(() => {
    if (!running) return;
    timerRef.current = setTimeout(() => {
      if (current < seqLen - 1) {
        setCurrent((c) => c + 1);
        setResponded(false);
        setFeedback(null);
      } else {
        setRunning(false);
        // calc results
        let correct = 0, total = 0;
        for (let i = n; i < seqLen; i++) {
          const isMatch = sequence[i] === sequence[i - n];
          const userSaidMatch = answers.includes(i);
          total++;
          if (isMatch === userSaidMatch) correct++;
        }
        const acc = Math.round((correct / total) * 100);
        setResults({ correct, total, accuracy: acc });
        setHistory((h) => [...h, { n, accuracy: acc, date: new Date().toLocaleTimeString() }]);
      }
    }, current === -1 ? 500 : 2200);
    return () => clearTimeout(timerRef.current);
  }, [current, running, seqLen]);

  const handleResponse = (isMatch) => {
    if (!running || current < n || responded) return;
    setResponded(true);
    const actualMatch = sequence[current] === sequence[current - n];
    if (isMatch) setAnswers((a) => [...a, current]);
    setFeedback(actualMatch === isMatch ? "correct" : "wrong");
  };

  useEffect(() => {
    if (!running || current < n) return;
    const handler = (e) => {
      if (e.key === "m" || e.key === "M") handleResponse(true);
      if (e.key === "n" || e.key === "N" || e.key === " ") handleResponse(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [running, current, responded, sequence, n]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", justifyContent: "space-between" }}>
        <button onClick={onBack} style={backBtnStyle}>← 返回</button>
        <div style={{ display: "flex", gap: 8 }}>
          {[2, 3, 4].map((v) => (
            <button key={v} onClick={() => !running && setN(v)}
              style={{
                ...smallBtnStyle,
                background: n === v ? "var(--c-accent)" : "var(--c-cell)",
                color: n === v ? "#fff" : "var(--c-text)",
              }}>{v}-Back</button>
          ))}
        </div>
      </div>

      {!running && !results && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <p style={{ color: "var(--c-sub)", fontSize: 15, lineHeight: 1.8, marginBottom: 24, maxWidth: 360 }}>
            依次出现字母，判断当前字母是否与 <strong style={{ color: "var(--c-accent)" }}>{n}步前</strong> 相同。
            <br />点击"相同"或"不同"作答。
          </p>
          <button onClick={startGame} style={primaryBtnStyle}>开始训练</button>
        </div>
      )}

      {running && (
        <>
          <div style={{ fontSize: 13, color: "var(--c-sub)" }}>
            第 {Math.max(0, current + 1)}/{seqLen} 个 &nbsp;|&nbsp; {n}-Back模式
          </div>
          <div style={{
            width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 20, background: feedback === "correct" ? "var(--c-correct-bg)" : feedback === "wrong" ? "var(--c-wrong)" : "var(--c-cell)",
            transition: "all .2s",
          }}>
            <span style={{
              fontSize: 64, fontWeight: 800, fontFamily: "'DM Mono', monospace",
              color: current >= 0 ? "var(--c-text)" : "transparent",
            }}>
              {current >= 0 ? sequence[current] : ""}
            </span>
          </div>
          {current >= n && (
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => handleResponse(true)} disabled={responded}
                style={{
                  ...primaryBtnStyle, padding: "12px 28px",
                  opacity: responded ? 0.5 : 1,
                  background: "var(--c-accent)",
                }}>相同 (M)</button>
              <button onClick={() => handleResponse(false)} disabled={responded}
                style={{
                  ...primaryBtnStyle, padding: "12px 28px",
                  opacity: responded ? 0.5 : 1,
                  background: "var(--c-cell)", color: "var(--c-text)",
                }}>不同 (N)</button>
            </div>
          )}
          {current >= 0 && current < n && (
            <div style={{ fontSize: 14, color: "var(--c-sub)" }}>先记住前{n}个字母...</div>
          )}
          <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
            {Array.from({ length: seqLen }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i === current ? "var(--c-accent)" : i < current ? "var(--c-sub)" : "var(--c-cell)",
                transition: "all .2s",
              }} />
            ))}
          </div>
        </>
      )}

      {results && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: "var(--c-accent)", fontFamily: "'DM Mono', monospace" }}>
            {results.accuracy}%
          </div>
          <div style={{ fontSize: 14, color: "var(--c-sub)", marginBottom: 20 }}>
            正确 {results.correct}/{results.total}
          </div>
          <button onClick={startGame} style={primaryBtnStyle}>再来一轮</button>
        </div>
      )}

      {history.length > 0 && !running && (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "var(--c-sub)", marginBottom: 8 }}>历史记录</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 50 }}>
            {history.slice(-8).map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: "var(--c-sub)" }}>{h.accuracy}%</span>
                <div style={{
                  width: "100%", height: `${h.accuracy}%`, minHeight: 4,
                  background: h.accuracy >= 80 ? "var(--c-accent)" : "var(--c-cell)",
                  borderRadius: 4,
                }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stroop ───
const STROOP_COLORS = [
  { name: "红", color: "#ef4444" },
  { name: "蓝", color: "#3b82f6" },
  { name: "绿", color: "#22c55e" },
  { name: "黄", color: "#eab308" },
  { name: "紫", color: "#a855f7" },
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
    const t = [];
    for (let i = 0; i < totalTrials; i++) {
      const wordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
      let colorIdx;
      do { colorIdx = Math.floor(Math.random() * STROOP_COLORS.length); } while (colorIdx === wordIdx);
      t.push({ word: STROOP_COLORS[wordIdx].name, color: STROOP_COLORS[colorIdx] });
    }
    return t;
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
    if (isCorrect) setCorrect((c) => c + 1);
    setFeedback(isCorrect ? "correct" : "wrong");
    setTimeout(() => {
      setFeedback(null);
      if (current + 1 >= totalTrials) {
        setRunning(false);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const acc = Math.round(((isCorrect ? correct + 1 : correct) / totalTrials) * 100);
        setResults({ accuracy: acc, time: parseFloat(elapsed) });
        setHistory((h) => [...h, { accuracy: acc, time: parseFloat(elapsed), date: new Date().toLocaleTimeString() }]);
      } else {
        setCurrent((c) => c + 1);
      }
    }, 500);
  };

  const getOptions = () => {
    if (!running || !trials[current]) return [];
    const correctColor = trials[current].color.name;
    const opts = [correctColor];
    while (opts.length < 4) {
      const r = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)].name;
      if (!opts.includes(r)) opts.push(r);
    }
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    return opts;
  };

  const [options, setOptions] = useState([]);
  useEffect(() => {
    if (running && trials[current]) {
      setOptions(getOptions());
    }
  }, [current, running, trials.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", justifyContent: "space-between" }}>
        <button onClick={onBack} style={backBtnStyle}>← 返回</button>
        {running && <div style={{ fontSize: 14, color: "var(--c-sub)" }}>{current + 1}/{totalTrials}</div>}
      </div>

      {!running && !results && (
        <div style={{ textAlign: "center", padding: "30px 0" }}>
          <p style={{ color: "var(--c-sub)", fontSize: 15, lineHeight: 1.8, marginBottom: 24, maxWidth: 360 }}>
            屏幕显示一个颜色词，但字体是<strong style={{ color: "var(--c-accent)" }}>另一种颜色</strong>。
            <br />请选择<strong>字体的颜色</strong>，而非文字内容。
          </p>
          <button onClick={startGame} style={primaryBtnStyle}>开始训练</button>
        </div>
      )}

      {running && trials[current] && (
        <>
          <div style={{
            width: 200, height: 140, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 20,
            background: feedback === "correct" ? "var(--c-correct-bg)" : feedback === "wrong" ? "var(--c-wrong)" : "var(--c-cell)",
            transition: "all .2s",
          }}>
            <span style={{
              fontSize: 56, fontWeight: 900,
              color: trials[current].color.color,
            }}>{trials[current].word}</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--c-sub)" }}>↑ 这个字的颜色是什么？</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "min(300px, 80vw)" }}>
            {options.map((opt) => {
              return (
                <button key={opt} onClick={() => handleAnswer(opt)} disabled={!!feedback}
                  style={{
                    padding: "14px 0", borderRadius: 12, border: "2px solid var(--c-sub)",
                    background: "var(--c-cell)", cursor: "pointer", fontSize: 18, fontWeight: 700,
                    color: "var(--c-text)", opacity: feedback ? 0.6 : 1,
                    transition: "all .15s",
                  }}>{opt}</button>
              );
            })}
          </div>
        </>
      )}

      {results && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: "var(--c-accent)", fontFamily: "'DM Mono', monospace" }}>
            {results.accuracy}%
          </div>
          <div style={{ fontSize: 14, color: "var(--c-sub)", marginBottom: 20 }}>
            用时 {results.time}s
          </div>
          <button onClick={startGame} style={primaryBtnStyle}>再来一轮</button>
        </div>
      )}

      {history.length > 0 && !running && (
        <div style={{ width: "100%", marginTop: 8 }}>
          <div style={{ fontSize: 13, color: "var(--c-sub)", marginBottom: 8 }}>历史记录</div>
          <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 50 }}>
            {history.slice(-8).map((h, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, color: "var(--c-sub)" }}>{h.accuracy}%</span>
                <div style={{
                  width: "100%", height: `${h.accuracy}%`, minHeight: 4,
                  background: h.accuracy >= 80 ? "var(--c-accent)" : "var(--c-cell)",
                  borderRadius: 4,
                }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ───
const primaryBtnStyle = {
  padding: "12px 32px", borderRadius: 12, border: "none",
  background: "var(--c-accent)", color: "#fff", fontSize: 15, fontWeight: 600,
  cursor: "pointer", transition: "all .2s",
};
const backBtnStyle = {
  padding: "6px 14px", borderRadius: 8, border: "none",
  background: "var(--c-cell)", color: "var(--c-sub)", fontSize: 13,
  cursor: "pointer",
};
const smallBtnStyle = {
  padding: "6px 12px", borderRadius: 8, border: "none",
  fontSize: 12, fontWeight: 600, cursor: "pointer",
};

// ─── Main App ───
export default function App() {
  const [active, setActive] = useState(null);
  const [schulteHistory, setSchulteHistory] = useState([]);
  const [nbackHistory, setNbackHistory] = useState([]);
  const [stroopHistory, setStroopHistory] = useState([]);

  const totalSessions = schulteHistory.length + nbackHistory.length + stroopHistory.length;

  return (
    <div style={{
      "--c-bg": "#0f1117",
      "--c-card": "#181b25",
      "--c-cell": "#232738",
      "--c-text": "#e8eaf0",
      "--c-sub": "#6b7294",
      "--c-accent": "#6c63ff",
      "--c-found": "#2d3148",
      "--c-found-text": "#4a4f6a",
      "--c-wrong": "#ff4d6a22",
      "--c-correct-bg": "#6c63ff22",
      minHeight: "100vh",
      background: "var(--c-bg)",
      color: "var(--c-text)",
      fontFamily: "'Noto Sans SC', 'SF Pro', -apple-system, sans-serif",
      padding: "24px 20px",
      maxWidth: 440,
      margin: "0 auto",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Noto+Sans+SC:wght@400;600;700;900&display=swap" rel="stylesheet" />

      {!active && (
        <div style={{ animation: "fadeIn .4s ease" }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0, letterSpacing: -1 }}>
              专注力训练
            </h1>
            <p style={{ color: "var(--c-sub)", fontSize: 14, margin: "6px 0 0" }}>
              每天10分钟，提升注意力与工作记忆
            </p>
            {totalSessions > 0 && (
              <div style={{
                marginTop: 14, padding: "10px 16px", borderRadius: 10,
                background: "var(--c-cell)", fontSize: 13, color: "var(--c-sub)",
              }}>
                本次已完成 <strong style={{ color: "var(--c-accent)" }}>{totalSessions}</strong> 轮训练
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {GAMES.map((g) => {
              const hist = g === "schulte" ? schulteHistory : g === "nback" ? nbackHistory : stroopHistory;
              return (
                <button key={g} onClick={() => setActive(g)} style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "20px 20px", borderRadius: 16,
                  background: "var(--c-card)", border: "1px solid #ffffff08",
                  cursor: "pointer", textAlign: "left",
                  transition: "all .2s",
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14,
                    background: "var(--c-cell)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22,
                  }}>{GAME_ICONS[g]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--c-text)", marginBottom: 4 }}>
                      {GAME_LABELS[g]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--c-sub)", lineHeight: 1.4 }}>
                      {GAME_DESC[g]}
                    </div>
                  </div>
                  {hist.length > 0 && (
                    <div style={{
                      padding: "3px 8px", borderRadius: 6,
                      background: "var(--c-accent)22", color: "var(--c-accent)",
                      fontSize: 11, fontWeight: 600,
                    }}>{hist.length}轮</div>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: 28, padding: 16, borderRadius: 12,
            background: "var(--c-card)", border: "1px solid #ffffff06",
            fontSize: 13, color: "var(--c-sub)", lineHeight: 1.7,
          }}>
            <strong style={{ color: "var(--c-text)" }}>训练建议</strong>
            <br />每天轮流做 2-3 种练习，每种 3-5 轮。
            <br />先做舒尔特方格热身 → N-Back核心训练 → Stroop收尾。
          </div>
        </div>
      )}

      {active === "schulte" && <SchulteGrid onBack={() => setActive(null)} history={schulteHistory} setHistory={setSchulteHistory} />}
      {active === "nback" && <NBack onBack={() => setActive(null)} history={nbackHistory} setHistory={setNbackHistory} />}
      {active === "stroop" && <Stroop onBack={() => setActive(null)} history={stroopHistory} setHistory={setStroopHistory} />}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        button:hover { filter: brightness(1.08); }
        button:active { transform: scale(0.97) !important; }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
