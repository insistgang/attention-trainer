import { act } from "react";
import { createRoot } from "react-dom/client";
import AttentionTrainer, { scoreNBackResponses } from "./AttentionTrainer";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function renderTrainer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<AttentionTrainer />);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function click(button) {
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("scoreNBackResponses", () => {
  test("does not count unanswered non-matches as correct", () => {
    const sequence = ["B", "C", "D", "F"];

    expect(scoreNBackResponses(sequence, 1, {})).toEqual({
      correct: 0,
      total: 3,
      accuracy: 0,
    });
  });

  test("counts explicit different answers as correct for non-matches", () => {
    const sequence = ["B", "C", "D", "F"];
    const responses = { 1: false, 2: false, 3: false };

    expect(scoreNBackResponses(sequence, 1, responses)).toEqual({
      correct: 3,
      total: 3,
      accuracy: 100,
    });
  });

  test("scores match and different responses through the final trial", () => {
    const sequence = ["B", "C", "B", "F"];
    const responses = { 2: true, 3: false };

    expect(scoreNBackResponses(sequence, 2, responses)).toEqual({
      correct: 2,
      total: 2,
      accuracy: 100,
    });
  });
});

describe("AttentionTrainer accessibility", () => {
  let rendered;

  afterEach(() => {
    if (rendered) {
      rendered.cleanup();
      rendered = null;
    }
  });

  test("labels the main training choices", () => {
    rendered = renderTrainer();

    const labels = Array.from(rendered.container.querySelectorAll("button"))
      .map((button) => button.getAttribute("aria-label"))
      .filter(Boolean);

    expect(labels).toEqual(expect.arrayContaining([
      "开始舒尔特方格训练：按1→25顺序快速点击，训练视觉注意力广度",
      "开始N-Back训练：判断当前字母是否与N步前相同，训练工作记忆",
      "开始Stroop测试训练：说出文字的颜色而非内容，训练抗干扰能力",
    ]));
  });

  test("shows N-Back keyboard hint and disables difficulty buttons while running", () => {
    rendered = renderTrainer();

    click(rendered.container.querySelector('button[aria-label^="开始N-Back训练"]'));

    expect(rendered.container.textContent).toContain("快捷键：M=相同，N 或空格=不同");

    click(Array.from(rendered.container.querySelectorAll("button"))
      .find((button) => button.textContent === "开始训练"));

    const difficultyButtons = Array.from(rendered.container.querySelectorAll("button"))
      .filter((button) => /^[234]-Back$/.test(button.textContent));

    expect(difficultyButtons).toHaveLength(3);
    difficultyButtons.forEach((button) => {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-label")).toContain("训练中不可切换");
    });
  });
});
