用gemini+tripo3d做的

如需转载请注明出处，禁止商用

需要在终端里运行
1️⃣cd进入文件夹
2️⃣python -m http.server
3️⃣打开http://localhost:8000/

提示词：
请从零编写一个完整的 index.html 文件，只用原生 HTML + CSS + JavaScript，实现一个 3D 手势交互小游戏。要求如下：

基础与依赖

使用 <script> 标签从 CDN 引入：Three.js（含 GLTFLoader）、GSAP、MediaPipe Hands、Camera Utils。

页面全屏 WebGL 场景，body 无滚动条，背景为黑色。

页内包含：

用于摄像头预览的 <video>（左上角小窗，左右镜像）；

三个按钮：Reset、Fullscreen、Camera 显隐。

模型与背景

使用 GLTFLoader 加载 public/model.glb（假设与 index.html 同级目录下有 public/ 目录），保留模型原有材质和纹理。

使用暗色环境光 + 至少两个方向光，营造阴暗立体效果。

使用 public/background.png 作为远处大平面背景，并根据窗口宽高比自适应铺满视野（类似 CSS 的 background-size: cover 效果）。

模型初始在远处略低位置，例如 (0, -7, -25)。

手势控制逻辑（MediaPipe Hands）
通过 MediaPipe Hands 识别单手手势，实现三个阶段：

阶段 1：上升（ASCENDING）

初始为 IDLE；当检测到张开手掌时，从 IDLE 进入 ASCENDING。

在 ASCENDING 状态中，用手掌在画面中的 y 坐标控制模型的高度：手越高，模型越高，限制在合理范围（如 y 从 -7 到 15）。

阶段 2：靠近并悬停（HOVERING_NEAR）

当模型上升到接近最高高度时，如果检测到握拳：

结束 ASCENDING，使用 GSAP 让模型沿 z 轴快速移动到摄像机前方（如 (0, 0, -8)），并轻微上下浮动。

阶段 3：化为灰烬粒子（DISSOLVING）

当处于 HOVERING_NEAR 时，如果再次检测到张开手掌：

隐藏原网格模型；

基于模型顶点生成粒子系统（THREE.Points），粒子大小略有随机、数量较多；

在着色器或更新逻辑中，让粒子随时间向外、向上发散，并逐渐透明，表现为“灰烬消散”；

动画结束后，将状态和模型重置回初始 IDLE，可重复体验。
