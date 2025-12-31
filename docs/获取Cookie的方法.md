# 如何获取网站的 Cookie

本文档介绍几种获取网站 Cookie 的方法，用于克隆需要登录的网站。

## 方法 1：使用浏览器开发者工具（推荐）

### Chrome / Edge / Brave

1. **登录目标网站**
   - 在浏览器中正常登录你要克隆的网站

2. **打开开发者工具**
   - 按 `F12` 键
   - 或右键点击页面 → 选择"检查"

3. **查看 Cookie**
   - 点击顶部的 `Application` 标签（或 `应用程序`）
   - 左侧找到 `Storage` → `Cookies`
   - 点击你的网站域名

4. **复制 Cookie**
   - 你会看到所有 Cookie 的列表
   - 记录以下信息：
     - `Name`（名称）
     - `Value`（值）
     - `Domain`（域）
     - `Path`（路径）
     - `Expires / Max-Age`（过期时间）
     - `HttpOnly`
     - `Secure`
     - `SameSite`

5. **转换为 JSON 格式**

```json
[
  {
    "name": "session_id",
    "value": "abc123xyz789",
    "domain": ".example.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "Lax"
  },
  {
    "name": "auth_token",
    "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "domain": ".example.com",
    "path": "/",
    "secure": true
  }
]
```

### Firefox

1. 按 `F12` 打开开发者工具
2. 点击 `存储` 标签
3. 展开 `Cookie`
4. 选择你的网站
5. 复制 Cookie 信息

### Safari

1. 启用开发者菜单：
   - `Safari` → `偏好设置` → `高级`
   - 勾选"在菜单栏中显示开发菜单"

2. 打开 Web 检查器：
   - `开发` → `显示 Web 检查器`
   - 或按 `Option + Command + I`

3. 点击 `存储` 标签
4. 选择 `Cookies`
5. 复制 Cookie 信息

## 方法 2：使用浏览器扩展（最简单）

### EditThisCookie（Chrome/Edge）

1. **安装扩展**
   - Chrome Web Store 搜索 "EditThisCookie"
   - 点击"添加到 Chrome"

2. **导出 Cookie**
   - 登录目标网站
   - 点击浏览器工具栏的 EditThisCookie 图标
   - 点击"导出"按钮（Export）
   - 选择 JSON 格式
   - Cookie 会复制到剪贴板

3. **格式化 Cookie**
   - EditThisCookie 导出的格式可能需要调整
   - 确保包含 `name`、`value`、`domain` 字段

### Cookie-Editor（Chrome/Firefox/Edge）

1. **安装扩展**
   - 搜索 "Cookie-Editor"
   - 添加到浏览器

2. **导出 Cookie**
   - 登录目标网站
   - 点击扩展图标
   - 点击"Export"
   - 选择 JSON 格式
   - 复制 Cookie

## 方法 3：使用 JavaScript 控制台

### 快速获取所有 Cookie

1. 打开开发者工具（`F12`）
2. 切换到 `Console`（控制台）标签
3. 粘贴以下代码：

```javascript
// 获取所有 Cookie 并转换为 JSON 格式
const cookies = document.cookie.split(';').map(cookie => {
  const [name, value] = cookie.trim().split('=');
  return {
    name: name,
    value: value,
    domain: window.location.hostname,
    path: '/'
  };
});

console.log(JSON.stringify(cookies, null, 2));
```

4. 按 `Enter` 执行
5. 复制输出的 JSON

**注意**：这种方法只能获取非 `HttpOnly` 的 Cookie。

### 获取特定 Cookie

```javascript
// 获取特定名称的 Cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop().split(';').shift();
  }
}

// 使用示例
const sessionId = getCookie('session_id');
console.log('Session ID:', sessionId);
```

## 方法 4：使用 Puppeteer 脚本（高级）

如果你需要自动化获取 Cookie，可以使用这个脚本：

```javascript
// get-cookies.js
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // 访问网站
  await page.goto('https://example.com/login');
  
  // 等待你手动登录（30 秒）
  console.log('请在 30 秒内完成登录...');
  await page.waitForTimeout(30000);
  
  // 获取 Cookie
  const cookies = await page.cookies();
  console.log('\n获取到的 Cookies:');
  console.log(JSON.stringify(cookies, null, 2));
  
  await browser.close();
})();
```

**使用方法：**

```bash
node get-cookies.js
```

## Cookie 字段说明

| 字段 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `name` | ✅ | Cookie 名称 | `"session_id"` |
| `value` | ✅ | Cookie 值 | `"abc123xyz789"` |
| `domain` | 推荐 | Cookie 域名 | `".example.com"` |
| `path` | 可选 | Cookie 路径 | `"/"` |
| `expires` | 可选 | 过期时间（Unix 时间戳） | `1735689600` |
| `httpOnly` | 可选 | 是否 HttpOnly | `true` |
| `secure` | 可选 | 是否仅 HTTPS | `true` |
| `sameSite` | 可选 | SameSite 属性 | `"Lax"` |

### Domain 字段说明

- **带点前缀**（`.example.com`）：适用于所有子域名
  - `example.com`
  - `www.example.com`
  - `api.example.com`

- **不带点**（`example.com`）：仅适用于该域名
  - `example.com`

**建议**：使用带点的格式（`.example.com`），兼容性更好。

### Expires 字段说明

- **Unix 时间戳**（秒）
- 可以使用在线工具转换：https://www.unixtimestamp.com/
- 或使用 JavaScript：

```javascript
// 获取 1 小时后的时间戳
const expires = Math.floor(Date.now() / 1000) + 3600;
console.log(expires);
```

## 常见网站的关键 Cookie

不同网站使用不同的 Cookie 名称，以下是一些常见的：

| 网站类型 | 常见 Cookie 名称 |
|---------|-----------------|
| **通用** | `session`, `sessionid`, `PHPSESSID`, `JSESSIONID` |
| **认证** | `auth_token`, `access_token`, `jwt`, `bearer` |
| **用户** | `user_id`, `uid`, `username` |
| **记住我** | `remember_me`, `remember_token` |
| **CSRF** | `csrf_token`, `_csrf`, `XSRF-TOKEN` |

**提示**：通常需要复制所有 Cookie，而不是只复制一个。

## 完整示例

### 示例 1：GitHub

```json
[
  {
    "name": "user_session",
    "value": "your_github_session_token_here",
    "domain": ".github.com",
    "path": "/",
    "secure": true,
    "httpOnly": true,
    "sameSite": "Lax"
  },
  {
    "name": "_gh_sess",
    "value": "your_gh_sess_value_here",
    "domain": ".github.com",
    "path": "/",
    "secure": true,
    "httpOnly": true
  }
]
```

### 示例 2：企业内网

```json
[
  {
    "name": "JSESSIONID",
    "value": "A1B2C3D4E5F6G7H8I9J0",
    "domain": ".company.com",
    "path": "/",
    "secure": true
  },
  {
    "name": "auth_token",
    "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
    "domain": ".company.com",
    "path": "/",
    "secure": true
  }
]
```

## 安全注意事项

### ⚠️ Cookie 安全

1. **不要分享 Cookie**
   - Cookie 包含你的登录凭证
   - 泄露 Cookie = 泄露账号

2. **定期更新**
   - Cookie 会过期
   - 建议每次使用前重新获取

3. **使用后删除**
   - 使用完毕后删除 Cookie 记录
   - 不要保存在公共位置

4. **检查有效期**
   - 有些 Cookie 只在会话期间有效
   - 关闭浏览器后会失效

### 🔒 最佳实践

1. **最小权限原则**
   - 只复制必要的 Cookie
   - 不要复制所有 Cookie

2. **临时使用**
   - 使用完毕后立即删除
   - 不要长期保存

3. **本地存储**
   - 不要上传到云端
   - 不要提交到 Git

4. **加密存储**
   - 如需保存，使用加密工具
   - 如 1Password、LastPass 等

## 故障排除

### 问题 1：Cookie 设置后仍未登录

**原因**：
- Cookie 已过期
- 缺少必要的 Cookie
- Domain 设置错误

**解决**：
1. 重新获取最新的 Cookie
2. 复制所有 Cookie（不要只复制一个）
3. 检查 `domain` 字段是否正确

### 问题 2：无法获取 HttpOnly Cookie

**原因**：
- JavaScript 无法访问 HttpOnly Cookie

**解决**：
- 使用浏览器开发者工具（方法 1）
- 使用浏览器扩展（方法 2）

### 问题 3：Cookie 格式不正确

**原因**：
- JSON 格式错误
- 缺少必填字段

**解决**：
- 使用 JSON 验证工具：https://jsonlint.com/
- 确保包含 `name` 和 `value` 字段

## 工具推荐

### 浏览器扩展

1. **EditThisCookie**（Chrome/Edge）
   - 最流行的 Cookie 管理工具
   - 支持导入/导出

2. **Cookie-Editor**（Chrome/Firefox/Edge）
   - 界面简洁
   - 支持多种格式

3. **Cookie Quick Manager**（Firefox）
   - Firefox 专用
   - 功能强大

### 在线工具

1. **JSON Formatter**
   - https://jsonformatter.org/
   - 格式化和验证 JSON

2. **Unix Timestamp Converter**
   - https://www.unixtimestamp.com/
   - 转换时间戳

3. **Base64 Decode**
   - https://www.base64decode.org/
   - 解码 Base64 编码的 Cookie

## 总结

| 方法 | 难度 | 速度 | 完整性 | 推荐度 |
|------|------|------|--------|--------|
| 开发者工具 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 浏览器扩展 | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| JavaScript | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Puppeteer | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

**推荐**：
- **新手**：使用浏览器扩展（EditThisCookie）
- **开发者**：使用开发者工具
- **自动化**：使用 Puppeteer 脚本

---

更多信息请参考：
- [登录网站克隆指南](./登录网站克隆指南.md)
- [SPA支持说明](./SPA支持说明.md)









