# SPA 网页克隆工具使用说明

## 📋 功能概述

这是一个基于 MCP (Model Context Protocol) 的 SPA 网页克隆工具，使用 Puppeteer 浏览器自动化技术，能够完整克隆 React、Vue、Angular 等 SPA 应用的渲染结果。

## ✅ 核心能力

### 工作原理

1. **启动真实浏览器**（Puppeteer）
2. **访问页面并执行所有 JavaScript**
3. **等待页面完全渲染**（可配置等待时间）
4. **提取渲染后的 HTML**
5. **收集所有应用的 CSS 规则**
6. **下载所有图片资源**
7. **生成静态快照**

### 支持的框架

- ✅ React（Create React App、Vite 等）
- ✅ Vue.js（Vue CLI、Vite 等）
- ✅ Angular
- ✅ Svelte
- ✅ 任何基于 JavaScript 渲染的页面

### 特性

| 特性 | 支持情况 |
|------|---------|
| **JavaScript 执行** | ✅ 支持 |
| **动态渲染内容** | ✅ 完整获取 |
| **React/Vue/Angular** | ✅ 获取渲染后的完整页面 |
| **动态加载的 CSS** | ✅ 自动提取 |
| **懒加载图片** | ✅ 可以获取（需等待加载） |
| **保持目录结构** | ✅ 图片保持原始路径结构 |

## 🚀 使用方法

### 参数说明

```typescript
{
  url: string,              // 必填：网页 URL
  outputDir?: string,       // 可选：输出目录（留空则保存到桌面）
  downloadImages?: boolean, // 可选：是否下载图片，默认 true
  waitTime?: number,        // 可选：等待时间（毫秒），默认 3000
  viewport?: {              // 可选：视口大小
    width: number,          // 默认 1920
    height: number          // 默认 1080
  }
}
```

**默认保存位置**：如果不指定 `outputDir`，文件会自动保存到桌面，文件夹名格式为 `网站域名_时间戳`

### 使用示例

#### 示例 1：克隆 React 应用（保存到桌面）

```
请使用 clone_webpage 工具克隆 https://react-app.example.com
```

**结果**：文件保存到 `Desktop/react-app_example_com_2025-12-31T10-30-00/`

#### 示例 2：指定保存位置

```
请克隆 https://vue-app.example.com 到 D:\my-projects\vue-app 目录
```

#### 示例 3：增加等待时间（适用于加载慢的页面）

```
请克隆 https://slow-spa.example.com，等待 5000 毫秒
```

#### 示例 4：自定义视口大小

```
请克隆 https://responsive-app.example.com，使用 1366x768 的视口
```

#### 示例 5：不下载图片（保留原链接）

```
请克隆 https://example.com，不下载图片
```

## ⚠️ 重要限制

### 1. 静态快照，无交互功能

克隆后的页面是**静态的**，不包含 JavaScript 交互：

- ❌ 按钮点击无效
- ❌ 表单提交无效
- ❌ 路由跳转无效
- ❌ API 调用无效

**这是正常的**：你得到的是页面在某一时刻的视觉快照。

### 2. 需要等待时间

不同页面需要不同的等待时间：

- **简单 SPA**：3000ms（默认）
- **复杂页面**：5000-10000ms
- **懒加载内容**：可能需要更长时间

### 3. 性能考虑

- 启动浏览器需要时间（约 2-5 秒）
- 下载图片会增加总时间
- 建议在本地测试时使用

### 4. 资源限制

- 某些网站可能检测到自动化并拒绝访问
- 需要登录的页面可以使用 Cookie、用户数据目录或手动登录方式访问（详见[登录网站克隆指南](./登录网站克隆指南.md)）
- 跨域资源可能无法访问

## 🔧 故障排除

### 问题：工具启动失败

**可能原因**：Puppeteer 未正确安装

**解决方案**：
```bash
cd /path/to/first-mcp
npm install
npm run build
```

### 问题：页面内容不完整

**解决方案**：增加等待时间
```
请克隆 xxx，等待 10000 毫秒
```

### 问题：图片加载失败

**解决方案**：
1. 检查网络连接
2. 尝试不下载图片：设置 `downloadImages: false`
3. 某些图片可能有防盗链保护

### 问题：Chromium 下载失败

**解决方案**：
```bash
# 设置 Puppeteer 镜像（中国大陆用户）
set PUPPETEER_DOWNLOAD_HOST=https://npmmirror.com/mirrors
npm install puppeteer
```

## 💡 最佳实践

1. **先测试后使用**：在小范围测试确认效果
2. **合理设置等待时间**：根据页面复杂度调整
3. **考虑法律问题**：确保有权克隆目标网站
4. **注意版权**：克隆的内容仅供学习和测试
5. **图片目录结构**：工具会保持图片的原始目录结构，便于组织管理

## 📚 技术细节

### 实现原理

```typescript
// 1. 启动浏览器
const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

// 2. 访问并等待渲染
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForTimeout(waitTime);

// 3. 获取渲染后的 HTML
const html = await page.content();

// 4. 提取所有应用的 CSS
const styles = await page.evaluate(() => {
  // 获取所有 styleSheets 的 cssRules
  // ...
});

// 5. 提取图片并下载（保持目录结构）
const imageUrls = await page.evaluate(() => {
  // 提取 img 标签和 CSS 背景图片
  // ...
});

// 6. 下载图片到本地（保持原始路径）
for (const imageUrl of imageUrls) {
  const relativePath = getOriginalFilePath(imageUrl);
  // 下载并保存到相应目录
}
```

### 图片处理

工具会保持图片的原始目录结构：

```
输出目录/
├── index.html
├── images/
│   └── logo.png
├── assets/
│   └── bg.jpg
└── static/
    └── icon.svg
```

## 🎯 适用场景

### ✅ 适合使用的场景

- 克隆 SPA 应用的界面设计
- 保存网页的视觉快照
- 学习前端页面布局
- 制作静态演示页面
- 备份网页内容

### ❌ 不适合的场景

- 需要保留交互功能
- 需要克隆后端逻辑
- 需要用户登录状态
- 商业用途（注意版权）

## 🎉 总结

这个工具能够：

- ✅ **完整支持 SPA**：使用 Puppeteer 执行 JS，获取完整渲染结果
- ✅ **自动化处理**：CSS 内联、图片下载、目录结构保持
- ✅ **灵活配置**：等待时间、视口大小、保存位置可自定义
- ✅ **开箱即用**：通过 MCP 协议，在 Cursor 中直接使用

**注意**：生成的是静态快照，适合用于学习和参考，不包含交互功能。
