# MiniMax Plus 全功能测试 Dashboard

**测试日期**: 2026-03-22
**测试环境**: Windows 10 Pro + Claude Code (Opus 4.6)
**API Base URL**: `https://api.minimaxi.com`

---

## 一、API 认证信息

### 正确的 API Key 格式

```
sk-api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ **重要发现**: 环境变量 `MINIMAX_API_KEY` 中存的是旧 key (`sk-cp-...`)，正确的 key 格式是 `sk-api-...`，包含 94 字符。
> MCP 工具之所以能用，是因为 `~/.claude.json` 中写死了正确的 key。

### MCP 配置（已修改为引用环境变量）

```json
"minimax-image": {
    "command": "python",
    "args": ["C:\\Users\\Administrator\\minimax-tools\\minimax_image_mcp.py"],
    "env": { "MINIMAX_API_KEY": "${MINIMAX_API_KEY}" }
}
```

### MCP 连接状态

| MCP Server | 状态 | 说明 |
|-----------|------|------|
| `minimax` (uvx minimax-mcp) | ✗ Failed | 官方 MCP 包离线 |
| `minimax-image` (本地脚本) | ✅ Connected | 本地 minimax_image_mcp.py |

---

## 二、功能测试结果

### 1. 🎨 文生图 (Image Generation) — ✅ 成功

| 指标 | 值 |
|------|-----|
| **API 端点** | `POST /v1/image_generation` |
| **模型** | `image-01` |
| **响应时间** | ~300ms |
| **状态码** | 0 (success) |
| **输出格式** | URL + 本地文件 |
| **已生成文件** | `test_robot_cyberpunk.png` (360KB) |

**请求示例**:
```python
requests.post(
    "https://api.minimaxi.com/v1/image_generation",
    headers={"Authorization": "Bearer sk-api-..."},
    json={
        "model": "image-01",
        "prompt": "A futuristic robot sitting in a cyberpunk cafe...",
        "aspect_ratio": "16:9",
        "n": 1,
        "return_type": "url"
    }
)
```

**生成效果**: 中文/英文 prompt 均正常生成，支持 16:9 / 1:1 / 9:16 多种比例。

---

### 2. 🔊 TTS 语音合成 — ✅ 成功

| 指标 | 值 |
|------|-----|
| **API 端点** | `POST /v1/t2a_v2` |
| **模型** | `speech-02-hd` (高清) |
| **支持格式** | mp3 / pcm / flac / wav |
| **采样率** | 8000~44100 Hz |
| **已生成文件** | `test_tts_chinese.mp3` (207KB, 13.1s)、`test_tts_english.mp3` (112KB) |

**请求示例**:
```python
requests.post(
    "https://api.minimaxi.com/v1/t2a_v2",
    headers={"Authorization": "Bearer sk-api-..."},
    json={
        "model": "speech-02-hd",
        "text": "欢迎使用 MiniMax 语音合成测试...",
        "stream": False,
        "voice_setting": {
            "voice_id": "female-tianmei",  # 中文女声
            "speed": 1.0,
            "emotion": "happy"
        },
        "audio_setting": {
            "format": "mp3",
            "sample_rate": 32000,
            "bitrate": 128000
        }
    }
)
```

**支持的 voice_id**: `female-tianmei`（女声）、`male-qn-qingse`（男声）等
**特殊能力**: 情绪控制 (happy/sad/angry/fearful/disgusted/surprised/calm/fluent/whisper)、语速调节、语调调节

---

### 3. 🎵 文生音乐 — ✅ 成功

| 指标 | 值 |
|------|-----|
| **API 端点** | `POST /v1/music_generation` |
| **模型** | `music-2.5+` |
| **音乐时长** | 最长 3 分钟 |
| **已生成文件** | `test_music_lofi.mp3` (4.1MB, 132秒)、`test_music_pop.mp3` (1MB, 32秒) |

> ⚠️ **注意**: 音乐 URL 在 `data.audio` 字段（不是 `data.audio_url`）

**请求示例**:
```python
requests.post(
    "https://api.minimaxi.com/v1/music_generation",
    headers={"Authorization": "Bearer sk-api-..."},
    json={
        "model": "music-2.5+",
        "prompt": "Lofi hip hop beats, relaxing study music...",
        "is_instrumental": True,
        "output_format": "url"
    }
)
```

**支持**: 纯音乐 + 带歌词歌曲，可指定风格、流派、节奏

---

### 4. 🎬 文生视频 — ⚠️ 提交成功，轮询受阻

| 指标 | 值 |
|------|-----|
| **API 端点** | `POST /v1/video_generation` |
| **模型** | `MiniMax-Hailuo-2.3`、`T2V-01` |
| **支持分辨率** | `768P`、`1080P` (Hailuo 2.3) |
| **视频时长** | 6 秒 |
| **任务 ID** | `379434492326287` (T2V-01) |

> ⚠️ **重要**: MiniMax **没有视频状态查询端点**，仅支持 **callback_url** 回调机制。
> 因此视频生成是"提交后即忘"，需要自建 webhook 服务接收结果。

**请求示例**:
```python
requests.post(
    "https://api.minimaxi.com/v1/video_generation",
    headers={"Authorization": "Bearer sk-api-..."},
    json={
        "model": "MiniMax-Hailuo-2.3",
        "prompt": "A cat sleeping in a sunbeam...",
        "duration": 6,
        "resolution": "768P",
        "callback_url": "https://your-webhook.com/video-callback"  # 回调地址
    }
)
```

---

## 三、已生成文件清单

```
C:\Users\Administrator\minimax-output\
├── minimax_20260322_142831.png   # MCP工具生成 (262KB)
├── test_robot_cyberpunk.png      # 文生图测试 (360KB)
├── test_tts_chinese.mp3           # TTS中文播报 (207KB, 13s)
├── test_tts_english.mp3          # TTS英文新闻 (113KB)
├── test_music_lofi.mp3           # 音乐-LOFI (4.1MB, 132s)
└── test_music_pop.mp3            # 音乐-流行 (1MB, 32s)
```

---

## 四、MiniMax Plus 实际意义分析

### 4.1 内容创作生态

| 能力 | 应用场景 | 商业价值 |
|------|----------|----------|
| **文生图** | 配图、封面、社交媒体、内容营销 | ⭐⭐⭐⭐⭐ 极高 |
| **TTS** | 有声书、播客、视频配音、无障碍阅读 | ⭐⭐⭐⭐⭐ 极高 |
| **文生音乐** | 背景音乐、视频配乐、游戏音效 | ⭐⭐⭐⭐ 高 |
| **文生视频** | 短视频创作、广告生成、内容营销 | ⭐⭐⭐⭐⭐ 极高（Hailuo2.3效果突出）|

### 4.2 API 集成能力

MiniMax API 支持 **OpenAI SDK** 和 **Anthropic SDK** 接入，这意味着：
- 现有应用可以零成本迁移到 MiniMax
- 支持 `stream=True` 实时流式输出
- 多端点覆盖：聊天、图像、语音、视频、音乐

### 4.3 与竞品对比

| 功能 | MiniMax | OpenAI | Midjourney |
|------|---------|--------|------------|
| 文生图 | ✅ | DALL-E 3 | ✅ |
| TTS | ✅ 情绪控制 | TTS | ❌ |
| 文生视频 | ✅ Hailuo 2.3 | ❌ | ❌ |
| 文生音乐 | ✅ | ❌ | ❌ |
| API 价格 | 💰 低 | 💰💰💰 高 | 仅订阅 |

### 4.4 核心优势

1. **多模态全覆盖**: 文字→图像→语音→音乐→视频，一个平台搞定
2. **Hailuo 视频生成**: MiniMax 的视频生成模型效果领先国内竞品
3. **情绪化 TTS**: 支持情感控制的语音合成，区别于其他 TTS API
4. **API 兼容**: 兼容 OpenAI/Anthropic SDK，集成成本低
5. **价格**: 比 OpenAI 低很多，适合中小企业和个人开发者

### 4.5 当前限制

1. **视频轮询缺失**: 没有查询端点，必须自建 callback webhook
2. **key 格式混乱**: `sk-cp-` (旧/代理) vs `sk-api-` (正确) 容易混淆
3. **MCP 官方包离线**: `uvx minimax-mcp` 无法连接，需使用本地脚本

---

## 五、API 快速参考卡

```
Base URL:  https://api.minimaxi.com
Auth:      Bearer {sk-api-...}

文生图:  POST /v1/image_generation        → image-01
TTS:      POST /v1/t2a_v2                → speech-02-hd / speech-2.8-turbo
文生音乐: POST /v1/music_generation       → music-2.5+
文生视频: POST /v1/video_generation        → MiniMax-Hailuo-2.3 / T2V-01
```

---

*Dashboard 由 Claude Code Agent Team 自动生成 | 2026-03-22*
