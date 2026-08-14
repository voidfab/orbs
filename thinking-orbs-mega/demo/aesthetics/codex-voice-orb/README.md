# Codex Voice Orb Study

一个零依赖、可直接在浏览器运行的 WebGL 语音圆球研究项目。它把声音的低频、
中频、高频和总体能量转换成圆球的呼吸、流动、颜色与纹理变化，并提供可重复的
固定时间预览。

这个项目适合：

- 学习音频频谱如何驱动 WebGL 动画；
- 在自己的语音助手、录音工具或 AI 对话界面中复用圆球组件；
- 比较 listening、thinking、speaking 等状态的视觉表达；
- 使用确定性输入制作截图和视觉回归基准。

它不是 OpenAI 官方项目，也不包含 Codex 安装包、完整 bundle、source map 或
本机提取证据。

[在线演示](https://aimer779.github.io/codex-voice-orb-study/) ·
[GitHub 仓库](https://github.com/Aimer779/codex-voice-orb-study)

## 灵感与致谢

项目灵感来自 X 用户
[神烦老狗（@shenfanlaogou）的这篇帖子](https://x.com/shenfanlaogou/status/2082822926437642330)。
感谢原作者分享这个有趣的想法和视觉方向。

## 截图

截图来自 GitHub Pages 上实际运行的 WebGL 1 页面，使用固定 `4200ms` 输入。

| Listening | Thinking | Speaking |
|---|---|---|
| ![Listening voice orb](docs/screenshots/listening.jpg) | ![Thinking voice orb](docs/screenshots/thinking.jpg) | ![Speaking voice orb](docs/screenshots/speaking.jpg) |

## 功能

- WebGL 1 实时渲染；
- `inactive / starting / active / stopping` 四种会话阶段；
- `idle / listening / thinking / speaking` 四种活动状态；
- Web Audio FFT 三频段分析；
- 合成音频强度和固定时间预览；
- 麦克风演示输入；
- 可选的 `BroadcastChannel` 跨窗口同步；
- WebGL 不可用时自动使用 Canvas 2D；
- 页面隐藏时暂停动画；
- 无框架、无构建步骤、无运行依赖。

## 快速运行

最简单的方法是直接双击 `index.html`。

也可以使用任意静态服务器：

```powershell
python -m http.server 4173
```

然后打开：

```text
http://127.0.0.1:4173/
```

麦克风权限通常需要 `localhost` 或 HTTPS，因此测试麦克风时推荐使用本地服务器。

## 怎么实现的

### 1. WebGL 圆球

顶点着色器绘制覆盖 Canvas 的两个三角形。片元着色器先计算圆形距离场，再在圆球
内部组合：

- 3D classic noise：负责较大的流动和音频形变；
- 五层 FBM：形成云雾、水彩和细粒度纹理；
- 多尺度 2D noise：打散规则渐变；
- linear burn 与颜色插值：混合蓝紫、冰蓝和暖白；
- 解析边缘透明度：得到平滑圆形轮廓。

时间、分辨率、音频能量、累计能量和活动状态通过 uniform 输入 shader。

### 2. 音频分析

`attachOutputStream(mediaStream)` 使用 Web Audio `AnalyserNode`：

| 参数 | 值 |
|---|---:|
| FFT size | 2048 |
| 采样频率 | 30Hz |
| 最低/最高分贝 | -100 / -10 |
| 平滑系数 | 0.86 |
| 低频 bins | `[0, 9)` |
| 中频 bins | `[9, 96)` |
| 高频 bins | `[96, 400)` |
| 低频权重 | 10x |

每个频段使用中位数能量，避免单个尖峰让整个圆球突然跳变。攻击和释放使用不同的
指数平滑时间，使语音进入迅速、退出自然。

演示页允许用麦克风驱动，但 Codex Voice 的实际产品行为是分析助手输出流；这里的
麦克风按钮只是为了让独立页面容易测试。

### 3. 状态系统

`phase` 描述会话生命周期，`activity` 描述当前语音行为：

| phase/activity | listen | think | speak |
|---|---:|---:|---:|
| inactive | 0 | 0 | 0 |
| starting | 0 | 1 | 0 |
| stopping | 0.35 | 0 | 0 |
| active + idle/listening | 1 | 0 | 0 |
| active + thinking | 0.65 | 1 | 0 |
| active + speaking | 0.2 | 0 | 1 |

状态权重使用约 280ms 的指数平滑；说话检测使用进入阈值、退出阈值和 300ms 退出
迟滞，减少临界音量附近的快速闪烁。

### 4. 性能处理

在不降低 DPR、帧率或噪声层数的前提下，渲染器做了以下优化：

- `gl.scissor()` 将片元绘制限制到圆球最大包围盒；
- Canvas 仍在每帧完整清除，因此透明背景行为保持一致；
- `ResizeObserver` 只在尺寸变化时读取布局和更新绘图缓冲区；
- viewport、scissor 和 `u_resolution` 只在分辨率变化时上传；
- DPR 最高限制为 1.5；
- WebGL 关闭不需要的抗锯齿和深度缓冲；
- 只保留一个 `requestAnimationFrame` 生命周期；
- `dispose()` 释放 RAF、AudioContext、计时器、BroadcastChannel、Program 和
  Vertex Buffer。

没有采用降低渲染分辨率、减少 FBM 层数或限制动画帧率，因为这些方法会改变清晰度
或运动效果。

## 使用组件

加载 `voice-orb.js` 后：

```html
<canvas id="orb"></canvas>
<script src="./voice-orb.js"></script>
<script>
  const { VoiceOrb } = window.CodexVoiceOrbArchive;
  const orb = new VoiceOrb(document.querySelector("#orb"), {
    broadcast: true,
    glowEnabled: true,
  });

  orb.setState({ phase: "active", activity: "listening" });
  orb.setAudioLevels({
    low: 0.1,
    mid: 0.2,
    high: 0.15,
    overall: 0.2,
  });
  orb.start();
</script>
```

主要接口：

- `setState({ phase, activity })`
- `setAudioLevels({ low, mid, high, overall })`
- `setPreview({ level, timeMs })`
- `attachOutputStream(mediaStream)`
- `setBroadcastEnabled(enabled)`
- `start()`
- `stop()`
- `dispose()`

固定时间预览示例：

```text
index.html?phase=active&activity=listening&level=35&time=4200
index.html?phase=active&activity=thinking&level=35&time=4200
index.html?phase=active&activity=speaking&level=55&time=4200
index.html?phase=active&activity=speaking&level=55&time=4200&renderer=2d
```

## 测试

只需要 Node.js：

```powershell
npm test
```

测试覆盖 FFT 边界和权重、状态映射、固定预览确定性、说话迟滞、单一 RAF、
ResizeObserver 尺寸缓存、scissor 边界、WebGL 资源释放和静态页面完整性。

## 项目结构

```text
.
├── index.html
├── styles.css
├── app.js
├── voice-orb.js
├── docs/screenshots/
└── tests/
```

## 说明

这是根据公开可见交互与本地行为研究整理的独立演示，不代表 OpenAI，也不应被描述为
OpenAI 官方源码。Codex、OpenAI 及相关商标归其各自权利人所有。

公开仓库只包含可运行演示、测试、文档和页面截图；版本化发行包证据继续保留在研究
机器本地，不随仓库分发。

本项目主要用于技术交流和娱乐，简单说就是“图一乐”，不用于冒充官方产品。如相关
权利人认为仓库内容存在版权、商标或其他法律风险，请通过 GitHub Issue 联系；收到
明确说明后会及时核查、调整或删除相关内容。

## License

[MIT](LICENSE)
