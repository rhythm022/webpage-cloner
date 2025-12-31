# SPA 网页克隆工具 (Webpage Cloner - SPA Enhanced)

基于 MCP (Model Context Protocol) 的 SPA 网页克隆工具，使用 Puppeteer 浏览器自动化技术。

## 功能特性

- ✅ **支持 React/Vue/Angular** 等 SPA 框架
- ✅ **执行 JavaScript** 并等待页面完全渲染
- ✅ **内联所有 CSS**（包括动态加载的）
- ✅ **下载图片**到本地或保留原链接
- ✅ **自动保存到桌面**（或指定目录）
- ✅ **保持原始目录结构**

## 项目结构

```
first-mcp/
├── src/
│   └── webpage-cloner-spa.ts # SPA 网页克隆工具
├── docs/
│   └── SPA支持说明.md        # 使用说明
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 配置 Cursor/Claude Desktop

在 Cursor 或 Claude Desktop 的配置文件中添加：

**Windows** (`%APPDATA%\Cursor\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "webpage-cloner": {
      "command": "node",
      "args": ["D:\\_jiangjj\\2026\\first-mcp\\build\\webpage-cloner-spa.js"]
    }
  }
}
```

**macOS/Linux** (`~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`):

```json
{
  "mcpServers": {
    "webpage-cloner": {
      "command": "node",
      "args": ["/path/to/first-mcp/build/webpage-cloner-spa.js"]
    }
  }
}
```

### 4. 使用工具

在 Cursor 中，你可以这样使用：

```
请使用 clone_webpage 工具克隆 https://react-app.example.com
```

**默认保存位置**：桌面（文件夹名：`网站域名_时间戳`）

**指定保存位置**：
```
请克隆 https://example.com 到 D:\my-websites 目录
```

## 工具参数

- `url` (必需): 要克隆的网页 URL
- `outputDir` (可选): 输出目录路径（绝对路径或相对路径，留空则默认保存到桌面）
- `downloadImages` (可选): 是否下载图片到本地（默认 true）
- `waitTime` (可选): 等待页面加载的时间（毫秒，默认 3000ms）
- `viewport` (可选): 浏览器视口大小（默认 1920x1080）
- `cookies` (可选): Cookie 数组（用于访问需要登录的页面）
- `userDataDir` (可选): 浏览器用户数据目录路径（用于保持登录状态）
- `headless` (可选): 是否使用无头模式（默认 true，设为 false 可看到浏览器窗口）

## 常用命令

```bash
# 开发模式（自动重新编译）
npm run watch

# 构建并运行
npm run dev

# 仅构建
npm run build
```

## 克隆需要登录的网站

工具支持三种方式访问需要登录的网站：

### 方法 1：使用 Cookie（推荐）

```
请克隆 https://example.com/dashboard，使用 cookies：
[
  {
    "name": "session_id",
    "value": "your_session_token",
    "domain": ".example.com"
  }
]
```

### 方法 2：使用浏览器用户数据目录

```
请克隆 https://example.com/dashboard，使用用户数据目录：
C:\Users\你的用户名\AppData\Local\Google\Chrome\User Data
```

**注意**：使用前需要关闭浏览器。

### 方法 3：手动登录（非无头模式）

```
请克隆 https://example.com/login，使用非无头模式，等待 60000 毫秒
```

浏览器窗口会打开，你可以手动登录，然后工具会自动克隆页面。

**详细说明**：查看 [docs/登录网站克隆指南.md](docs/登录网站克隆指南.md)

## 注意事项

- 生成的是静态快照，不包含 JavaScript 交互功能
- 需要安装 Chromium（Puppeteer 会自动下载）
- 需要登录的网站可以使用 Cookie、用户数据目录或手动登录方式访问

## 详细文档

### 核心文档
- [SPA支持说明](docs/SPA支持说明.md) - 工具功能和使用说明
- [快速开始：克隆登录网站](docs/快速开始-登录网站.md) - 5分钟快速上手

### 登录相关
- [登录网站克隆指南](docs/登录网站克隆指南.md) - 三种登录方式详解
- [获取Cookie的方法](docs/获取Cookie的方法.md) - Cookie 获取教程
- [使用示例](docs/使用示例.md) - 各种场景的使用示例

### 其他
- [更新日志](docs/更新日志.md) - 版本更新记录

## 资源链接

- [MCP 官方文档](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Puppeteer 文档](https://pptr.dev/)
