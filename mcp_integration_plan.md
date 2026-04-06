# MiniMax MCP Server 集成方案

## 一、背景

用户拥有 MiniMax Plus 订阅，希望在 Claude Code 中通过 MCP (Model Context Protocol) 调用 MiniMax 的以下能力：

- 文生图 (Image Generation)
- TTS 语音合成 (Text-to-Audio)
- 文生音乐 (Music Generation)
- 文生视频 (Video Generation)

**当前状态：**
- `minimax-mcp` (Coding Plan MCP)：使用 `sk-cp-` key，认证失败
- `minimax-image` (本地 MCP)：使用 `sk-api-` key，可正常工作

**目标：** 基于 `sk-api-` key，设计一个自定义 MCP Server，使用 Python FastMCP 框架封装所有 MiniMax API 能力。

---

## 二、MiniMax API 总览

### 2.1 认证方式

| 项目 | 说明 |
|------|------|
| **认证类型** | Bearer Token (HTTP Authorization header) |
| **Key 格式** | `sk-api-xxxxxxxx` (API Key from MiniMax Platform) |
| **Header** | `Authorization: Bearer <API_KEY>` |
| **国内端点** | `https://api.minimaxi.com` |
| **国际端点** | `https://api.minimax.io` |
| **Content-Type** | `application/json` |

### 2.2 API 端点总表

| 能力 | 端点 | 方法 | 模型 |
|------|------|------|------|
| 文生图 | `POST /v1/image_generation` | POST | `image-01`, `image-01-live` |
| 文生音乐 | `POST /v1/music_generation` | POST | `music-2.5+`, `music-2.5` |
| 文生视频 (T2V) | `POST /v1/video_generation` | POST | `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-02`, `T2V-01` |
| 文生视频 (I2V) | `POST /v1/video_generation` | POST | `MiniMax-Hailuo-2.3`, `I2V-01` |
| TTS 语音合成 | `POST /v1/t2a_v2` | POST | `speech-2.8-hd/turbo`, `speech-2.6-hd/turbo`, `speech-02-hd/turbo` |
| 视频任务查询 | `GET /v1/query/video_generation?task_id=xxx` | GET | - |
| 文本对话 | `POST /v1/text/chatcompletion_v2` | POST | `MiniMax-M2.7`, `MiniMax-M2.5`, `MiniMax-Text-01` |

---

## 三、各能力详细 API 规格

### 3.1 文生图 (Image Generation)

**端点：** `POST https://api.minimaxi.com/v1/image_generation`

**认证：** `Authorization: Bearer <API_KEY>`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | Yes | `image-01` (默认) 或 `image-01-live` |
| `prompt` | string | Yes | 文本描述，最多 1500 字符 |
| `aspect_ratio` | string | No | `1:1` (默认), `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9` |
| `width` | int | No | 512-2048，8 的倍数（仅 image-01） |
| `height` | int | No | 512-2048，8 的倍数（仅 image-01） |
| `response_format` | string | No | `url` (默认，24h过期) 或 `base64` |
| `seed` | int64 | No | 随机种子，用于复现 |
| `n` | int | No | 生成数量，1-9，默认 1 |
| `prompt_optimizer` | bool | No | 启用提示词自动优化 |
| `aigc_watermark` | bool | No | 添加水印 |
| `style` | object | No | 仅 `image-01-live` 可用：`style_type` (漫画/元气/中世纪/水彩) + `style_weight` (0-1) |

**响应：**

```json
{
  "id": "task_id_string",
  "data": {
    "image_urls": ["https://..."],
    "image_base64": []
  },
  "metadata": {
    "success_count": 1,
    "failed_count": 0
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

**状态码：** 0=成功, 1002=限流, 1004=认证失败, 1008=余额不足, 1026=内容违规, 2013=参数错误

---

### 3.2 TTS 语音合成 (Text-to-Audio)

**端点：** `POST https://api.minimaxi.com/v1/t2a_v2`

**认证：** `Authorization: Bearer <API_KEY>`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | Yes | `speech-2.8-hd`, `speech-2.8-turbo`, `speech-2.6-hd`, `speech-2.6-turbo`, `speech-02-hd`, `speech-02-turbo`, `speech-01-hd`, `speech-01-turbo` |
| `text` | string | Yes | 待合成文本，最多 10,000 字符 |
| `stream` | bool | No | 启用流式输出，默认 false |
| `output_format` | string | No | `hex` (默认) 或 `url` |
| `voice_setting` | object | No | 音色设置 |
| `voice_setting.voice_id` | string | No | 指定音色 ID |
| `voice_setting.speed` | float | No | 语速 0.5-2.0 |
| `voice_setting.vol` | float | No | 音量 0-10 |
| `voice_setting.pitch` | float | No | 音调 -12 到 12 |
| `voice_setting.emotion` | string | No | 情绪：happy, sad, angry, fearful, disgusted, surprised, calm, fluent, whisper |
| `audio_setting` | object | No | 音频设置：`sample_rate`, `bitrate`, `format` (mp3/pcm/flac/wav), `channel` |
| `subtitle_enable` | bool | No | 启用字幕，默认 false |

**响应：**

```json
{
  "data": {
    "audio": "<hex_string>",
    "status": 1,
    "subtitle_file": "<url>"
  },
  "trace_id": "...",
  "extra_info": {
    "audio_length": 9900,
    "audio_sample_rate": 32000,
    "usage_characters": 26
  },
  "base_resp": { "status_code": 0, "status_msg": "success" }
}
```

**WebSocket 端点：** `wss://api.minimaxi.com/ws/v1/t2a_v2`（用于实时流式合成）

---

### 3.3 文生音乐 (Music Generation)

**端点：** `POST https://api.minimaxi.com/v1/music_generation`

**认证：** `Authorization: Bearer <API_KEY>`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | Yes | `music-2.5+` (推荐) 或 `music-2.5` |
| `prompt` | string | Conditional | 音乐描述（风格/情绪/场景），最多 2000 字符 |
| `lyrics` | string | Conditional | 歌词，`\n` 换行，带结构标签，最多 3500 字符 |
| `stream` | bool | No | 流式输出，默认 false |
| `output_format` | string | No | `url` 或 `hex` (默认 hex) |
| `audio_setting` | object | No | `sample_rate`, `bitrate`, `format` |
| `aigc_watermark` | bool | No | 在音频末尾添加水印 |
| `lyrics_optimizer` | bool | No | 从 prompt 自动生成歌词 |
| `is_instrumental` | bool | No | 仅生成器乐（仅 music-2.5+） |

**注：** 非器乐模式下 `lyrics` 为必填

**响应：**

```json
{
  "data": {
    "status": 1,
    "audio": "<hex_string_or_url>"
  },
  "trace_id": "...",
  "extra_info": {
    "music_duration": 25364,
    "music_sample_rate": 44100,
    "music_channel": 2,
    "bitrate": 256000,
    "music_size": 813651
  },
  "base_resp": { "status_code": 0, "status_msg": "success" }
}
```

**状态码：** 0=成功, 1002=限流, 1004=认证失败, 1008=余额不足, 1026=内容违规, 2013=参数错误

---

### 3.4 文生视频 (Video Generation)

#### 3.4.1 文生视频 (Text-to-Video)

**端点：** `POST https://api.minimaxi.com/v1/video_generation`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | Yes | `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-02`, `T2V-01-Director`, `T2V-01` |
| `prompt` | string | Yes | 文本描述，最多 2000 字符。支持摄像机指令如 `[推进]`, `[拉远]`, `[左移]` 等 |
| `prompt_optimizer` | bool | No | 自动优化提示词，默认 true |
| `fast_pretreatment` | bool | No | 缩短优化时间（Hailuo-2.3/02 专用） |
| `duration` | int | No | 视频时长（秒），默认 6 |
| `resolution` | string | No | `720P`, `768P`, `1080P`（因模型而异） |
| `callback_url` | string | No | Webhook URL 用于任务状态通知 |
| `aigc_watermark` | bool | No | 添加水印，默认 false |

#### 3.4.2 图生视频 (Image-to-Video)

**端点：** `POST https://api.minimaxi.com/v1/video_generation`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | Yes | `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-2.3-Fast`, `MiniMax-Hailuo-02`, `I2V-01-Director`, `I2V-01-live`, `I2V-01` |
| `first_frame_image` | string | Yes | 公开 URL 或 Base64 Data URL（JPG/PNG/WebP，<20MB，短边 >300px） |
| `prompt` | string | No | 文本描述，最多 2000 字符 |
| `prompt_optimizer` | bool | No | 自动优化提示词，默认 true |
| `fast_pretreatment` | bool | No | 缩短优化时间 |
| `duration` | int | No | 视频时长（秒），默认 6 |
| `resolution` | string | No | `512P`/`720P`/`768P`/`1080P`（因模型而异） |
| `callback_url` | string | No | Webhook URL |
| `aigc_watermark` | bool | No | 添加水印 |

#### 3.4.3 视频任务状态查询

**端点：** `GET https://api.minimaxi.com/v1/query/video_generation?task_id=xxx`

**认证：** `Authorization: Bearer <API_KEY>`

**响应：**

```json
{
  "task_id": "string",
  "status": "Preparing | Queueing | Processing | Success | Fail",
  "file_id": "string (成功后返回)",
  "video_width": 1920,
  "video_height": 1080,
  "base_resp": { "status_code": 0, "status_msg": "success" }
}
```

---

## 四、现有 MCP 实现调研

### 4.1 minimax-mcp (Coding Plan)

- **npm 包：** `minimax-mcp`
- **Key 类型：** `sk-cp-` (Coding Plan 专用)
- **问题：** 认证失败，无法使用
- **原因推测：** Coding Plan key 与标准 API key 认证体系不同

### 4.2 minimax-image

- **Key 类型：** `sk-api-` (标准 API Key)
- **状态：** 可正常工作
- **局限性：** 仅封装了文生图能力

### 4.3 第三方 MiniMax MCP

- **搜索结果：** 未找到活跃的、功能完整的第三方 MiniMax MCP Server
- **GitHub：** 无成熟的多能力合一开源实现
- **Python SDK：** MiniMax 官方未提供 Python SDK，仅提供 HTTP API

---

## 五、自定义 MCP Server 架构设计

### 5.1 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| **框架** | FastMCP (Python) | 轻量、易用、Claude Code 原生支持 MCP |
| **HTTP 客户端** | httpx | 异步支持，兼容性好 |
| **Python 版本** | 3.10+ | FastMCP 要求 |
| **配置文件** | YAML | 用户可通过 config.yaml 管理 API Key |

### 5.2 架构图

```
                    ┌──────────────────────────────────────┐
                    │        Claude Code (MCP Client)       │
                    └──────────────┬───────────────────────┘
                                   │ MCP Protocol (stdio)
                    ┌──────────────▼───────────────────────┐
                    │     MiniMax MCP Server (FastMCP)     │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │     Tool Handlers              │  │
                    │  │  ┌─ generate_image            │  │
                    │  │  ├─ text_to_speech            │  │
                    │  │  ├─ generate_music            │  │
                    │  │  ├─ generate_video            │  │
                    │  │  ├─ query_video_task          │  │
                    │  │  └─ generate_image_i2v        │  │
                    │  └────────────────────────────────┘  │
                    │                                      │
                    │  ┌────────────────────────────────┐  │
                    │  │     MiniMax API Client         │  │
                    │  │  - Base URL: api.minimaxi.com  │  │
                    │  │  - Auth: Bearer token          │  │
                    │  │  - Async httpx session        │  │
                    │  └────────────────────────────────┘  │
                    └──────────────┬───────────────────────┘
                                   │ HTTPS
                    ┌──────────────▼───────────────────────┐
                    │       MiniMax Platform API            │
                    │  /v1/image_generation                │
                    │  /v1/t2a_v2                           │
                    │  /v1/music_generation                 │
                    │  /v1/video_generation                 │
                    │  /v1/query/video_generation           │
                    └──────────────────────────────────────┘
```

### 5.3 工具清单 (MCP Tools)

| Tool Name | 描述 | 模式 |
|-----------|------|------|
| `generate_image` | 文生图 (T2I) | 同步（直接返回 URL/base64） |
| `generate_image_i2i` | 图生图 (I2I) | 同步（需额外调研） |
| `text_to_speech` | TTS 语音合成 | 同步（`response_format=url`） |
| `generate_music` | 文生音乐 | 同步（`output_format=url`） |
| `generate_video_t2v` | 文生视频 | 异步（返回 task_id，需轮询） |
| `generate_video_i2v` | 图生视频 | 异步（返回 task_id，需轮询） |
| `query_video_task` | 视频任务状态查询 | 同步 |

### 5.4 关键设计决策

1. **视频异步处理：** 视频生成是异步任务，需要轮询状态。提供 `query_video_task` 工具让用户自行查询，或在工具内部做 3-5 次轮询后返回 task_id 和状态。
2. **音频/图片格式：** 为简化处理，TTS 和图片默认使用 `output_format=url`/`response_format=url`，避免处理 hex/base64 编码。
3. **音乐格式：** 音乐默认使用 `output_format=url`。
4. **错误处理：** 统一处理 MiniMax 的 status_code 错误，转换为人类可读的错误信息。
5. **超时控制：** 视频轮询设置 120s 超时，图片/TTS 同步请求设置 30s 超时。

---

## 六、完整代码示例

### 6.1 项目结构

```
minimax-mcp-server/
├── config.yaml              # 配置文件（API Key 等）
├── requirements.txt         # Python 依赖
├── minimax_mcp_server.py     # 主程序入口
├── client.py                # MiniMax API 客户端
└── tools/
    ├── __init__.py
    ├── image_tools.py       # 图片生成工具
    ├── speech_tools.py      # TTS 工具
    ├── music_tools.py       # 音乐生成工具
    └── video_tools.py       # 视频生成工具
```

### 6.2 config.yaml

```yaml
minimax:
  api_key: "sk-api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  base_url: "https://api.minimaxi.com"  # 国内
  # base_url: "https://api.minimax.io"  # 国际用户切换此行

video:
  poll_timeout: 120        # 视频任务轮询超时（秒）
  poll_interval: 5         # 轮询间隔（秒）
  max_polls: 24            # 最大轮询次数

speech:
  default_model: "speech-02-hd"
  default_voice_id: ""     # 可留空使用默认音色

image:
  default_model: "image-01"
  default_response_format: "url"

music:
  default_model: "music-2.5+"
  default_output_format: "url"
```

### 6.3 requirements.txt

```
fastmcp>=0.1.0
httpx>=0.27.0
pydantic>=2.0.0
pyyaml>=6.0
python-dotenv>=1.0.0
```

### 6.4 client.py - MiniMax API 客户端

```python
"""
MiniMax API HTTP 客户端
封装所有与 MiniMax Platform API 的交互
"""
import httpx
import yaml
from pathlib import Path
from typing import Any


class MiniMaxClient:
    """MiniMax Platform API 客户端"""

    def __init__(self, config_path: str = "config.yaml"):
        config_file = Path(config_path)
        if config_file.exists():
            with open(config_file, "r") as f:
                self.config = yaml.safe_load(f)
        else:
            self.config = {}

        self.api_key = self.config.get("minimax", {}).get("api_key", "")
        self.base_url = self.config.get("minimax", {}).get(
            "base_url", "https://api.minimaxi.com"
        )

        if not self.api_key:
            raise ValueError(
                "API key not found. Please set 'minimax.api_key' in config.yaml "
                "or environment variable MINIMAX_API_KEY"
            )

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            headers=self.headers,
            timeout=httpx.Timeout(60.0, connect=10.0),
        )
        return self

    async def __aexit__(self, *args):
        if self._client:
            await self._client.aclose()

    @property
    def client(self) -> httpx.AsyncClient:
        if not self._client:
            raise RuntimeError("Client not initialized. Use 'async with' context.")
        return self._client

    def _check_response(self, resp_data: dict) -> None:
        """检查 API 响应状态码，错误时抛出异常"""
        base_resp = resp_data.get("base_resp", {})
        status_code = base_resp.get("status_code", 0)
        if status_code != 0:
            status_msg = base_resp.get("status_msg", "Unknown error")
            error_map = {
                1001: "Request timeout",
                1002: "Rate limit exceeded",
                1004: "Authentication failed",
                1008: "Insufficient balance",
                1026: "Content policy violation",
                2013: "Invalid parameters",
                2049: "Invalid API key",
            }
            msg = error_map.get(status_code, f"Error {status_code}: {status_msg}")
            raise MiniMaxAPIError(status_code, msg)

    # ─────────────────────────────────────────────
    # Image Generation
    # ─────────────────────────────────────────────

    async def generate_image(
        self,
        prompt: str,
        model: str = "image-01",
        aspect_ratio: str = "1:1",
        width: int | None = None,
        height: int | None = None,
        n: int = 1,
        response_format: str = "url",
        seed: int | None = None,
        prompt_optimizer: bool = False,
        aigc_watermark: bool = False,
        style_type: str | None = None,
        style_weight: float | None = None,
    ) -> dict[str, Any]:
        """文生图 API"""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "response_format": response_format,
            "n": n,
            "prompt_optimizer": prompt_optimizer,
            "aigc_watermark": aigc_watermark,
        }
        if width:
            payload["width"] = width
        if height:
            payload["height"] = height
        if seed is not None:
            payload["seed"] = seed
        if style_type and model == "image-01-live":
            payload["style"] = {"style_type": style_type, "style_weight": style_weight or 0.5}

        url = f"{self.base_url}/v1/image_generation"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data

    # ─────────────────────────────────────────────
    # Text-to-Audio (TTS)
    # ─────────────────────────────────────────────

    async def text_to_speech(
        self,
        text: str,
        model: str = "speech-02-hd",
        voice_id: str | None = None,
        speed: float = 1.0,
        pitch: float = 0.0,
        volume: float = 1.0,
        emotion: str | None = None,
        output_format: str = "url",
        stream: bool = False,
        audio_format: str = "mp3",
        sample_rate: int = 32000,
        subtitle_enable: bool = False,
    ) -> dict[str, Any]:
        """TTS 语音合成 API"""
        voice_setting: dict[str, Any] = {"speed": speed, "pitch": pitch, "vol": volume}
        if voice_id:
            voice_setting["voice_id"] = voice_id
        if emotion:
            voice_setting["emotion"] = emotion

        audio_setting = {
            "sample_rate": sample_rate,
            "format": audio_format,
        }

        payload: dict[str, Any] = {
            "model": model,
            "text": text,
            "stream": stream,
            "output_format": output_format,
            "voice_setting": voice_setting,
            "audio_setting": audio_setting,
            "subtitle_enable": subtitle_enable,
        }

        url = f"{self.base_url}/v1/t2a_v2"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data

    # ─────────────────────────────────────────────
    # Music Generation
    # ─────────────────────────────────────────────

    async def generate_music(
        self,
        prompt: str,
        model: str = "music-2.5+",
        lyrics: str | None = None,
        is_instrumental: bool = False,
        output_format: str = "url",
        stream: bool = False,
        aigc_watermark: bool = False,
        lyrics_optimizer: bool = False,
        audio_sample_rate: int = 44100,
        audio_bitrate: int = 256000,
        audio_format: str = "mp3",
    ) -> dict[str, Any]:
        """文生音乐 API"""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "stream": stream,
            "output_format": output_format,
            "is_instrumental": is_instrumental,
            "aigc_watermark": aigc_watermark,
            "lyrics_optimizer": lyrics_optimizer,
            "audio_setting": {
                "sample_rate": audio_sample_rate,
                "bitrate": audio_bitrate,
                "format": audio_format,
            },
        }
        if lyrics and not is_instrumental:
            payload["lyrics"] = lyrics

        url = f"{self.base_url}/v1/music_generation"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data

    # ─────────────────────────────────────────────
    # Video Generation
    # ─────────────────────────────────────────────

    async def generate_video_t2v(
        self,
        prompt: str,
        model: str = "MiniMax-Hailuo-2.3",
        duration: int = 6,
        resolution: str = "720P",
        prompt_optimizer: bool = True,
        fast_pretreatment: bool = False,
        aigc_watermark: bool = False,
        callback_url: str | None = None,
    ) -> dict[str, Any]:
        """文生视频 API"""
        payload: dict[str, Any] = {
            "model": model,
            "prompt": prompt,
            "prompt_optimizer": prompt_optimizer,
            "duration": duration,
            "resolution": resolution,
            "aigc_watermark": aigc_watermark,
        }
        if model in ("MiniMax-Hailuo-2.3", "MiniMax-Hailuo-02"):
            payload["fast_pretreatment"] = fast_pretreatment
        if callback_url:
            payload["callback_url"] = callback_url

        url = f"{self.base_url}/v1/video_generation"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data

    async def generate_video_i2v(
        self,
        first_frame_image: str,
        prompt: str = "",
        model: str = "MiniMax-Hailuo-2.3-Fast",
        duration: int = 6,
        resolution: str = "720P",
        prompt_optimizer: bool = True,
        fast_pretreatment: bool = False,
        aigc_watermark: bool = False,
        callback_url: str | None = None,
    ) -> dict[str, Any]:
        """图生视频 API"""
        payload: dict[str, Any] = {
            "model": model,
            "first_frame_image": first_frame_image,
            "prompt": prompt,
            "prompt_optimizer": prompt_optimizer,
            "duration": duration,
            "resolution": resolution,
            "aigc_watermark": aigc_watermark,
        }
        if model in ("MiniMax-Hailuo-2.3", "MiniMax-Hailuo-2.3-Fast", "MiniMax-Hailuo-02"):
            payload["fast_pretreatment"] = fast_pretreatment
        if callback_url:
            payload["callback_url"] = callback_url

        url = f"{self.base_url}/v1/video_generation"
        resp = await self.client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data

    async def query_video_task(self, task_id: str) -> dict[str, Any]:
        """视频任务状态查询"""
        url = f"{self.base_url}/v1/query/video_generation"
        resp = await self.client.get(url, params={"task_id": task_id})
        resp.raise_for_status()
        data = resp.json()
        self._check_response(data)
        return data


class MiniMaxAPIError(Exception):
    """MiniMax API 错误"""

    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {message}")
```

### 6.5 minimax_mcp_server.py - MCP Server 主程序

```python
"""
MiniMax MCP Server
使用 FastMCP 框架封装 MiniMax API 能力
运行方式: python minimax_mcp_server.py
Claude Code 会通过 MCP stdio 协议与此服务器通信
"""
import asyncio
import os
from contextlib import asynccontextmanager
from typing import Annotated

from fastmcp import FastMCP
from pydantic import BaseModel, Field

# 导入 API 客户端
from client import MiniMaxClient, MiniMaxAPIError

# ─────────────────────────────────────────────
# 初始化 FastMCP Server
# ─────────────────────────────────────────────
mcp = FastMCP(
    "MiniMax-Plus",
    dependencies=["httpx", "pydantic", "pyyaml"],
)

# 全局客户端实例
_client: MiniMaxClient | None = None


def get_client() -> MiniMaxClient:
    """获取或创建 MiniMax 客户端"""
    global _client
    if _client is None:
        config_path = os.environ.get("MINIMAX_CONFIG", "config.yaml")
        _client = MiniMaxClient(config_path)
    return _client


@asynccontextmanager
async def client_context():
    """为每个请求提供客户端上下文"""
    client = get_client()
    async with client:
        yield client


# ─────────────────────────────────────────────
# 通用错误处理装饰器
# ─────────────────────────────────────────────

def handle_api_error(func):
    """捕获 MiniMax API 错误并返回友好消息"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except MiniMaxAPIError as e:
            return {"error": True, "code": e.code, "message": e.message}
        except httpx.HTTPStatusError as e:
            return {"error": True, "code": e.response.status_code, "message": str(e)}
        except Exception as e:
            return {"error": True, "code": -1, "message": str(e)}
    return wrapper


# ─────────────────────────────────────────────
# MCP Tool: 文生图
# ─────────────────────────────────────────────

class GenerateImageInput(BaseModel):
    prompt: Annotated[str, Field(description="图片的文本描述（英文效果更佳），最多 1500 字符")]
    model: Annotated[str, Field(default="image-01", description="模型: image-01 或 image-01-live")]
    aspect_ratio: Annotated[str, Field(default="1:1", description="宽高比: 1:1, 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9")]
    width: Annotated[int | None, Field(default=None, description="图片宽度 512-2048，仅 image-01")]
    height: Annotated[int | None, Field(default=None, description="图片高度 512-2048，仅 image-01")]
    n: Annotated[int, Field(default=1, description="生成数量 1-9")]
    seed: Annotated[int | None, Field(default=None, description="随机种子，用于复现结果")]
    prompt_optimizer: Annotated[bool, Field(default=False, description="启用提示词自动优化")]
    style_type: Annotated[str | None, Field(default=None, description="风格类型 (漫画/元气/中世纪/水彩)，仅 image-01-live")]
    aigc_watermark: Annotated[bool, Field(default=False, description="添加水印")]


@mcp.tool()
async def generate_image(input: GenerateImageInput) -> str:
    """根据文本描述生成图片。支持 image-01 (写实风格) 和 image-01-live (插画风格)"""
    async with client_context() as client:
        result = await client.generate_image(
            prompt=input.prompt,
            model=input.model,
            aspect_ratio=input.aspect_ratio,
            width=input.width,
            height=input.height,
            n=input.n,
            seed=input.seed,
            prompt_optimizer=input.prompt_optimizer,
            style_type=input.style_type,
            aigc_watermark=input.aigc_watermark,
        )
        return _format_image_result(result)


def _format_image_result(data: dict) -> str:
    """格式化图片生成结果"""
    if "error" in data:
        return f"Error {data['code']}: {data['message']}"

    image_urls = data.get("data", {}).get("image_urls", [])
    image_base64 = data.get("data", {}).get("image_base64", [])
    metadata = data.get("metadata", {})
    task_id = data.get("id", "unknown")

    lines = [f"**Task ID:** {task_id}"]
    lines.append(f"**成功:** {metadata.get('success_count', 0)} | **失败:** {metadata.get('failed_count', 0)}")
    lines.append("")

    if image_urls:
        lines.append("**生成的图片:**")
        for i, url in enumerate(image_urls, 1):
            lines.append(f"{i}. {url}")
    elif image_base64:
        lines.append(f"**Base64 图片数量:** {len(image_base64)}")
    else:
        lines.append("*未返回图片数据*")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool: TTS 语音合成
# ─────────────────────────────────────────────

class TextToSpeechInput(BaseModel):
    text: Annotated[str, Field(description="要转换为语音的文本，最多 10,000 字符")]
    model: Annotated[str, Field(default="speech-02-hd", description="模型: speech-2.8-hd/turbo, speech-2.6-hd/turbo, speech-02-hd/turbo, speech-01-hd/turbo")]
    voice_id: Annotated[str | None, Field(default=None, description="指定音色 ID，留空使用默认音色")]
    speed: Annotated[float, Field(default=1.0, ge=0.5, le=2.0, description="语速 0.5-2.0")]
    pitch: Annotated[float, Field(default=0.0, ge=-12, le=12, description="音调 -12 到 12")]
    emotion: Annotated[str | None, Field(default=None, description="情绪: happy, sad, angry, fearful, disgusted, surprised, calm, fluent, whisper")]
    audio_format: Annotated[str, Field(default="mp3", description="音频格式: mp3, pcm, flac, wav")]
    sample_rate: Annotated[int, Field(default=32000, description="采样率: 8000/16000/22050/24000/32000/44100")]


@mcp.tool()
async def text_to_speech(input: TextToSpeechInput) -> str:
    """将文本转换为自然语音。支持多种音色和情绪调节"""
    async with client_context() as client:
        result = await client.text_to_speech(
            text=input.text,
            model=input.model,
            voice_id=input.voice_id,
            speed=input.speed,
            pitch=input.pitch,
            emotion=input.emotion,
            audio_format=input.audio_format,
            sample_rate=input.sample_rate,
        )
        return _format_speech_result(result)


def _format_speech_result(data: dict) -> str:
    """格式化 TTS 结果"""
    if "error" in data:
        return f"Error {data['code']}: {data['message']}"

    audio_data = data.get("data", {})
    extra_info = data.get("extra_info", {})
    trace_id = data.get("trace_id", "")

    audio = audio_data.get("audio", "")
    subtitle_url = audio_data.get("subtitle_file", "")
    audio_length = extra_info.get("audio_length", 0)
    sample_rate = extra_info.get("audio_sample_rate", 0)
    usage_chars = extra_info.get("usage_characters", 0)

    lines = [f"**Trace ID:** {trace_id}"]
    lines.append(f"**音频长度:** {audio_length}ms | **采样率:** {sample_rate}Hz | **消耗字符:** {usage_chars}")

    if audio.startswith("http"):
        lines.append(f"**音频 URL:** {audio}")
    elif audio:
        lines.append(f"**音频:** (hex 编码, 长度 {len(audio)} 字符)")
    else:
        lines.append("*未返回音频数据*")

    if subtitle_url:
        lines.append(f"**字幕 URL:** {subtitle_url}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool: 文生音乐
# ─────────────────────────────────────────────

class GenerateMusicInput(BaseModel):
    prompt: Annotated[str, Field(description="音乐描述（风格/情绪/场景/乐器），最多 2000 字符")]
    lyrics: Annotated[str | None, Field(default=None, description="歌词，\\n 换行，最多 3500 字符（器乐可留空）")]
    model: Annotated[str, Field(default="music-2.5+", description="模型: music-2.5+ (推荐) 或 music-2.5")]
    is_instrumental: Annotated[bool, Field(default=False, description="是否生成纯器乐（无歌词）")]
    lyrics_optimizer: Annotated[bool, Field(default=False, description="从 prompt 自动生成歌词")]


@mcp.tool()
async def generate_music(input: GenerateMusicInput) -> str:
    """根据文本描述生成音乐。支持纯器乐或有歌词的歌曲"""
    async with client_context() as client:
        result = await client.generate_music(
            prompt=input.prompt,
            lyrics=input.lyrics,
            model=input.model,
            is_instrumental=input.is_instrumental,
            lyrics_optimizer=input.lyrics_optimizer,
        )
        return _format_music_result(result)


def _format_music_result(data: dict) -> str:
    """格式化音乐生成结果"""
    if "error" in data:
        return f"Error {data['code']}: {data['message']}"

    audio_data = data.get("data", {})
    extra_info = data.get("extra_info", {})
    trace_id = data.get("trace_id", "")

    audio = audio_data.get("audio", "")
    status = audio_data.get("status", 0)
    duration = extra_info.get("music_duration", 0)
    sample_rate = extra_info.get("music_sample_rate", 0)
    bitrate = extra_info.get("bitrate", 0)
    size = extra_info.get("music_size", 0)

    lines = [f"**Trace ID:** {trace_id}"]
    lines.append(f"**状态:** {status} | **时长:** {duration}ms | **采样率:** {sample_rate}Hz | **码率:** {bitrate} | **大小:** {size} bytes")

    if audio.startswith("http"):
        lines.append(f"**音乐 URL:** {audio}")
    elif audio:
        lines.append(f"**音乐:** (hex 编码, 长度 {len(audio)} 字符)")
    else:
        lines.append("*未返回音乐数据*")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool: 文生视频
# ─────────────────────────────────────────────

class GenerateVideoT2VInput(BaseModel):
    prompt: Annotated[str, Field(description="视频描述，最多 2000 字符。支持摄像机指令如 [推进], [拉远], [左移] 等")]
    model: Annotated[str, Field(default="MiniMax-Hailuo-2.3", description="模型: MiniMax-Hailuo-2.3, MiniMax-Hailuo-02, T2V-01-Director, T2V-01")]
    duration: Annotated[int, Field(default=6, description="视频时长（秒）: 6 或 10，因模型而异")]
    resolution: Annotated[str, Field(default="720P", description="分辨率: 720P, 768P, 1080P（因模型而异）")]
    prompt_optimizer: Annotated[bool, Field(default=True, description="启用提示词自动优化")]
    fast_pretreatment: Annotated[bool, Field(default=False, description="缩短预处理时间（Hailuo-2.3/02 专用）")]
    aigc_watermark: Annotated[bool, Field(default=False, description="添加水印")]
    poll_until_complete: Annotated[bool, Field(default=False, description="是否等待视频生成完成（可能需要几十秒）")]


@mcp.tool()
async def generate_video_t2v(input: GenerateVideoT2VInput) -> str:
    """根据文本描述生成视频。支持摄像机运动指令"""
    async with client_context() as client:
        result = await client.generate_video_t2v(
            prompt=input.prompt,
            model=input.model,
            duration=input.duration,
            resolution=input.resolution,
            prompt_optimizer=input.prompt_optimizer,
            fast_pretreatment=input.fast_pretreatment,
            aigc_watermark=input.aigc_watermark,
        )
        return _format_video_result(result, input.poll_until_complete, client)


# ─────────────────────────────────────────────
# MCP Tool: 图生视频
# ─────────────────────────────────────────────

class GenerateVideoI2VInput(BaseModel):
    first_frame_image: Annotated[str, Field(description="首帧图片 URL 或 Base64 Data URL（JPG/PNG/WebP <20MB，短边 >300px）")]
    prompt: Annotated[str, Field(default="", description="视频描述，引导视频内容变化")]
    model: Annotated[str, Field(default="MiniMax-Hailuo-2.3-Fast", description="模型: MiniMax-Hailuo-2.3, MiniMax-Hailuo-2.3-Fast, MiniMax-Hailuo-02, I2V-01")]
    duration: Annotated[int, Field(default=6, description="视频时长（秒）")]
    resolution: Annotated[str, Field(default="720P", description="分辨率")]
    prompt_optimizer: Annotated[bool, Field(default=True, description="启用提示词自动优化")]
    fast_pretreatment: Annotated[bool, Field(default=False, description="缩短预处理时间")]
    aigc_watermark: Annotated[bool, Field(default=False, description="添加水印")]
    poll_until_complete: Annotated[bool, Field(default=False, description="是否等待视频生成完成")]


@mcp.tool()
async def generate_video_i2v(input: GenerateVideoI2VInput) -> str:
    """根据首帧图片生成视频，让静态图片动起来"""
    async with client_context() as client:
        result = await client.generate_video_i2v(
            first_frame_image=input.first_frame_image,
            prompt=input.prompt,
            model=input.model,
            duration=input.duration,
            resolution=input.resolution,
            prompt_optimizer=input.prompt_optimizer,
            fast_pretreatment=input.fast_pretreatment,
            aigc_watermark=input.aigc_watermark,
        )
        return _format_video_result(result, input.poll_until_complete, client)


def _format_video_result(data: dict, poll: bool, client: MiniMaxClient) -> str:
    """格式化视频生成结果"""
    if "error" in data:
        return f"Error {data['code']}: {data['message']}"

    task_id = data.get("task_id", "")
    base_resp = data.get("base_resp", {})
    status_code = base_resp.get("status_code", 0)
    status_msg = base_resp.get("status_msg", "")

    lines = [f"**Task ID:** {task_id}"]
    lines.append(f"**状态:** [{status_code}] {status_msg}")
    lines.append("")
    lines.append(f"使用 `query_video_task` 工具查询任务状态，Task ID: `{task_id}`")

    if poll and task_id:
        lines.append("")
        lines.append(_poll_video_task(client, task_id))

    return "\n".join(lines)


def _poll_video_task(client: MiniMaxClient, task_id: str, timeout: int = 120, interval: int = 5) -> str:
    """轮询视频任务直到完成或超时"""
    lines = []
    lines.append(f"正在轮询任务状态（超时 {timeout}s，间隔 {interval}s）...")

    import time
    elapsed = 0
    while elapsed < timeout:
        time.sleep(interval)
        elapsed += interval

        try:
            result = asyncio.run(client.query_video_task(task_id))
            status = result.get("status", "Unknown")
            lines.append(f"  [{elapsed}s] 状态: {status}")

            if status == "Success":
                file_id = result.get("file_id", "N/A")
                width = result.get("video_width", "N/A")
                height = result.get("video_height", "N/A")
                lines.append(f"  视频生成成功! file_id: {file_id}, 分辨率: {width}x{height}")
                break
            elif status == "Fail":
                lines.append("  视频生成失败")
                break
        except Exception as e:
            lines.append(f"  查询出错: {e}")

    if elapsed >= timeout:
        lines.append(f"轮询超时（{timeout}s），请稍后手动查询 Task ID: {task_id}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# MCP Tool: 视频任务状态查询
# ─────────────────────────────────────────────

@mcp.tool()
async def query_video_task(task_id: Annotated[str, Field(description="视频生成任务的 Task ID")]) -> str:
    """查询视频生成任务的状态和结果"""
    async with client_context() as client:
        result = await client.query_video_task(task_id)
        return _format_query_result(result)


def _format_query_result(data: dict) -> str:
    """格式化视频任务查询结果"""
    if "error" in data:
        return f"Error {data['code']}: {data['message']}"

    task_id = data.get("task_id", "")
    status = data.get("status", "Unknown")
    file_id = data.get("file_id", "")
    width = data.get("video_width", "")
    height = data.get("video_height", "")

    lines = [f"**Task ID:** {task_id}"]
    lines.append(f"**状态:** {status}")

    status_emoji = {"Success": "成功", "Fail": "失败", "Processing": "处理中", "Queueing": "排队中", "Preparing": "准备中"}
    lines.append(f"**状态说明:** {status_emoji.get(status, status)}")

    if status == "Success":
        lines.append(f"**File ID:** {file_id}")
        lines.append(f"**分辨率:** {width}x{height}")

    return "\n".join(lines)


# ─────────────────────────────────────────────
# 启动服务器
# ─────────────────────────────────────────────

if __name__ == "__main__":
    # 检查 API Key
    config_path = os.environ.get("MINIMAX_CONFIG", "config.yaml")
    if not os.path.exists(config_path):
        import sys
        print(f"Warning: config.yaml not found at {config_path}", file=sys.stderr)
        print("Please create config.yaml with your MiniMax API key.", file=sys.stderr)

    # 启动 MCP 服务器（使用 stdio 传输，Claude Code 默认使用）
    mcp.run(transport="stdio")
```

---

## 七、安装与配置指南

### 7.1 安装依赖

```bash
cd minimax-mcp-server
pip install -r requirements.txt
```

### 7.2 配置 Claude Code 的 MCP 设置

编辑 `~/.claude.json` 或 Claude Code 的 MCP 配置文件，添加：

```json
{
  "mcpServers": {
    "minimax-plus": {
      "command": "python",
      "args": [
        "E:/path/to/minimax-mcp-server/minimax_mcp_server.py"
      ],
      "env": {
        "MINIMAX_CONFIG": "E:/path/to/minimax-mcp-server/config.yaml"
      }
    }
  }
}
```

或者直接在 Claude Code 中运行：

```
/mcp add minimax-plus python E:/path/to/minimax_mcp_server.py
```

### 7.3 配置 API Key

编辑 `config.yaml`：

```yaml
minimax:
  api_key: "sk-api-your-actual-api-key-here"
  base_url: "https://api.minimaxi.com"
```

### 7.4 验证安装

```bash
# 启动服务器测试
python minimax_mcp_server.py

# Claude Code 中使用
/generate_image A cute cat sitting on a windowsill, sunset lighting, photorealistic
/text_to_speech Hello! This is a test of the MiniMax text-to-speech system.
/generate_music A peaceful ambient track with piano and gentle rain sounds
/generate_video_t2v A drone shot over a snowy mountain range at golden hour
```

---

## 八、已知限制与注意事项

1. **API Key 类型：** 本方案使用 `sk-api-` 标准 API Key。如使用 `sk-cp-` Coding Plan Key，需要额外的授权确认。

2. **异步任务轮询：** 视频生成是异步的，内部轮询有 120s 超时。对于超长时间生成的视频，建议用户手动调用 `query_video_task`。

3. **内容审核：** MiniMax 对生成内容有自动审核，违规内容会被拒绝（status_code: 1026）。

4. **计费：** 图片、TTS、视频、音乐生成均按实际调用量计费，具体价格参考 MiniMax Platform 定价页。

5. **Base64/hex 编码：** 默认使用 URL 格式返回结果，避免大文本 base64/hex 占用 token 配额。如需处理二进制结果，需自行解析。

6. **国际用户：** 国际版用户需将 `config.yaml` 中的 `base_url` 改为 `https://api.minimax.io`。

---

## 九、参考链接

- MiniMax Platform: https://platform.minimaxi.com
- 文生图 API: https://platform.minimaxi.com/docs/api-reference/image-generation-t2i
- TTS API: https://platform.minimaxi.com/docs/api-reference/speech-t2a-http
- 文生音乐 API: https://platform.minimaxi.com/docs/api-reference/music-generation
- 文生视频 API: https://platform.minimaxi.com/docs/api-reference/video-generation-t2v
- 图生视频 API: https://platform.minimaxi.com/docs/api-reference/video-generation-i2v
- FastMCP: https://github.com/jlowin/fastmcp
- OpenAPI Spec: https://platform.minimaxi.com/docs/api-reference/text/api/openapi.json

[DONE]
