# 更新日志 (Changelog)

所有重要的项目更改都会记录在此文件中。

## [2.1.0] - 2025-12-31

### ✨ 新增功能

#### 支持克隆需要登录的网站

现在可以通过三种方式克隆需要登录的网站：

1. **Cookie 方式**（推荐）
   - 添加 `cookies` 参数，支持传入 Cookie 数组
   - 适用于大多数需要登录的网站
   - 快速、简单、可自动化

2. **用户数据目录方式**
   - 添加 `userDataDir` 参数
   - 使用已有浏览器的登录状态
   - 支持复杂的认证流程

3. **手动登录方式**
   - 添加 `headless` 参数
   - 支持非无头模式（显示浏览器窗口）
   - 适用于需要验证码、双因素认证的场景

### 🔧 新增参数

- `cookies`: Cookie 数组，用于设置登录凭证
- `userDataDir`: 浏览器用户数据目录路径
- `headless`: 是否使用无头模式（默认 true）

### 📚 新增文档

1. **快速开始-登录网站.md** - 5分钟快速上手指南
2. **登录网站克隆指南.md** - 详细的登录方式说明
3. **获取Cookie的方法.md** - 多种 Cookie 获取方法
4. **使用示例.md** - 丰富的使用示例
5. **更新日志.md** - 版本更新记录

### 🎯 适用场景

- ✅ GitHub 私有仓库
- ✅ 企业内网系统
- ✅ 后台管理系统
- ✅ 会员专属页面
- ✅ 需要验证码的网站

### 📖 使用示例

#### Cookie 方式
```
请克隆 https://example.com/dashboard，使用 cookies：
[{"name": "session_id", "value": "abc123", "domain": ".example.com"}]
```

#### 用户数据目录方式
```
请克隆 https://example.com/dashboard，使用用户数据目录：
C:\Users\YourUsername\AppData\Local\Google\Chrome\User Data
```

#### 手动登录方式
```
请克隆 https://example.com/login，使用非无头模式，等待 60000 毫秒
```

### 🔄 改进

- 更新 README.md，添加登录功能说明和文档链接
- 优化代码注释和错误处理
- 改进状态消息输出

---

## [2.0.0] - 2025-12-30

### ✨ 初始版本

#### 核心功能

- 🚀 支持 SPA 网页克隆（React、Vue、Angular 等）
- 🌐 使用 Puppeteer 执行 JavaScript
- 🎨 自动提取和内联所有 CSS
- 🖼️ 下载图片到本地（保持原始目录结构）
- 📱 支持自定义视口大小
- ⏱️ 可配置页面加载等待时间

#### 参数

- `url`: 要克隆的网页 URL（必需）
- `outputDir`: 输出目录路径（可选，默认桌面）
- `downloadImages`: 是否下载图片（可选，默认 true）
- `waitTime`: 等待时间（可选，默认 3000ms）
- `viewport`: 视口大小（可选，默认 1920x1080）

#### 特性

- ✅ 真实浏览器渲染
- ✅ 完整的 JavaScript 执行
- ✅ 动态内容捕获
- ✅ CSS 完全内联
- ✅ 图片本地化
- ✅ 保持目录结构
- ✅ 自动保存到桌面

#### 文档

- README.md - 项目介绍和快速开始
- SPA支持说明.md - 详细使用说明

---

## 版本说明

### 版本号规则

遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范：

- **主版本号**：不兼容的 API 修改
- **次版本号**：向下兼容的功能性新增
- **修订号**：向下兼容的问题修正

### 标签说明

- ✨ **新增功能** (Added) - 新功能
- 🔧 **改进** (Changed) - 对现有功能的变更
- 🐛 **修复** (Fixed) - Bug 修复
- ⚠️ **废弃** (Deprecated) - 即将移除的功能
- 🗑️ **移除** (Removed) - 已移除的功能
- 🔒 **安全** (Security) - 安全相关的改进

---

## 路线图

### 计划中的功能

#### v2.2.0
- [ ] 支持批量克隆多个页面
- [ ] 添加进度条显示
- [ ] 支持自定义 User-Agent
- [ ] 支持代理设置

#### v2.3.0
- [ ] 支持克隆整个网站（多页面）
- [ ] 添加页面截图功能
- [ ] 支持 PDF 导出
- [ ] 性能优化

#### v3.0.0
- [ ] 支持保留部分 JavaScript 交互
- [ ] 支持视频下载
- [ ] 支持自定义脚本注入
- [ ] Web UI 界面

### 反馈和建议

如果你有任何建议或发现了 Bug，欢迎：
- 提交 Issue
- 发起 Pull Request
- 联系维护者

---

## 致谢

感谢以下开源项目：

- [Puppeteer](https://pptr.dev/) - 浏览器自动化
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Model Context Protocol
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript

---

**最后更新**: 2025-12-31


