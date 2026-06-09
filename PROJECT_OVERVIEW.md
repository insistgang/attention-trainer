# attention-trainer 项目总览

更新时间：2026-06-09

## 项目定位

这是一个 React 专注力训练 Web 应用，包含舒尔特方格、N-Back 和 Stroop 测试三个训练模块。

## 技术栈

- React
- react-scripts
- GitHub Pages 部署脚本
- Jest / React Testing Library 测试环境

## 主要文件

| 路径 | 说明 |
|---|---|
| `src/AttentionTrainer.jsx` | 主训练组件和交互逻辑。 |
| `src/AttentionTrainer.test.js` | 当前新增/待维护的测试文件。 |
| `package.json` | 启动、构建、测试和部署脚本。 |
| `README.md` | 使用说明和训练方法介绍。 |

## 运行方式

```powershell
npm install
npm start
npm test
npm run build
```

## 维护重点

- 当前仓库存在未提交改动，修复前先查看 `git diff`。
- 优先保证训练判分、键盘操作、无障碍状态和测试稳定。
- 小项目适合先修复、先验证、先推送。
