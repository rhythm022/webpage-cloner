#!/usr/bin/env node

/**
 * 网页克隆工具 - SPA 增强版 (Webpage Cloner Tool - SPA Enhanced)
 * 
 * 使用 Puppeteer 浏览器自动化，真正支持 SPA 页面
 * - 执行 JavaScript 并等待页面渲染完成
 * - 内联所有 CSS（包括动态加载的）
 * - 下载图片到本地或链接到原域名
 * - 生成的文件放到执行该 tool 的目录下
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import puppeteer from "puppeteer";

const server = new Server(
  {
    name: "webpage-cloner-spa",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义工具列表
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "clone_webpage",
        description: "1:1 复刻给定 URL 的 SPA 网页界面（HTML/CSS/图片），支持 JavaScript 渲染的页面，CSS 内联，图片下载到本地",
        inputSchema: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "要克隆的网页 URL",
            },
            outputDir: {
              type: "string",
              description: "输出目录路径（绝对路径或相对路径，留空则默认保存到桌面）",
            },
            downloadImages: {
              type: "boolean",
              description: "是否下载图片到本地（false 则保留原域名链接）",
              default: true,
            },
            waitTime: {
              type: "number",
              description: "等待页面加载的时间（毫秒），默认 3000ms",
              default: 3000,
            },
            viewport: {
              type: "object",
              description: "浏览器视口大小",
              properties: {
                width: {
                  type: "number",
                  default: 1920,
                },
                height: {
                  type: "number",
                  default: 1080,
                },
              },
            },
          },
          required: ["url"],
        },
      },
    ],
  };
});

// 从 URL 提取原始文件路径（保持目录结构）
function getOriginalFilePath(url: string, index: number): string {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    
    // 移除开头的斜杠
    if (pathname.startsWith('/')) {
      pathname = pathname.slice(1);
    }
    
    // 如果 URL 路径中没有文件名，使用默认名称
    if (!pathname || pathname === "" || pathname === "/") {
      return `image_${String(index).padStart(4, '0')}.jpg`;
    }
    
    // 返回完整的相对路径（包括目录结构）
    return pathname;
  } catch {
    return `image_${String(index).padStart(4, '0')}.jpg`;
  }
}

// 实现工具逻辑
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "clone_webpage") {
    throw new Error(`未知工具: ${name}`);
  }

  let browser: any = null;

  try {
    const url = (args?.url as string) || "";
    const outputDir = (args?.outputDir as string) || "";
    const downloadImages = (args?.downloadImages as boolean) ?? true;
    const waitTime = (args?.waitTime as number) || 3000;
    const viewport = (args?.viewport as any) || { width: 1920, height: 1080 };

    if (!url) {
      throw new Error("URL 参数不能为空");
    }

    // 验证 URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("无效的 URL 格式");
    }

    // 确定输出目录
    let absoluteOutputDir: string;
    if (outputDir) {
      // 如果用户指定了目录，使用指定的目录
      absoluteOutputDir = path.isAbsolute(outputDir)
        ? outputDir
        : path.resolve(process.cwd(), outputDir);
    } else {
      // 如果没有指定，默认保存到桌面
      const desktopPath = path.join(os.homedir(), "Desktop");
      // 使用网站域名作为文件夹名
      const siteName = parsedUrl.hostname.replace(/[^a-zA-Z0-9]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const folderName = `${siteName}_${timestamp}`;
      absoluteOutputDir = path.join(desktopPath, folderName);
    }

    await fs.mkdir(absoluteOutputDir, { recursive: true });

    let statusMessage = `开始克隆 SPA 网页: ${url}\n`;
    statusMessage += `输出目录: ${absoluteOutputDir}\n`;
    statusMessage += `等待时间: ${waitTime}ms\n\n`;

    // 1. 启动浏览器
    statusMessage += "正在启动浏览器...\n";
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport(viewport);

    // 2. 访问页面并等待 JavaScript 执行
    statusMessage += "正在加载页面并执行 JavaScript...\n";
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    // 额外等待时间，确保动态内容加载完成
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 3. 获取渲染后的 HTML
    statusMessage += "正在提取渲染后的 HTML...\n";
    let html = await page.content();

    // 4. 提取所有 CSS（包括内联和外部）
    statusMessage += "正在提取和内联 CSS...\n";
    const allStyles = await page.evaluate(() => {
      const styles: string[] = [];

      // 获取所有 style 标签
      document.querySelectorAll("style").forEach((style) => {
        styles.push(style.textContent || "");
      });

      // 获取所有外部样式表
      Array.from(document.styleSheets).forEach((sheet) => {
        try {
          if (sheet.cssRules) {
            const rules = Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
            styles.push(rules);
          }
        } catch (e) {
          // 跨域样式表可能无法访问
        }
      });

      return styles;
    });

    const combinedCss = allStyles.join("\n\n");

    // 5. 提取所有图片 URL
    statusMessage += "正在提取图片链接...\n";
    const imageUrls = await page.evaluate(() => {
      const urls: string[] = [];

      // 提取 img 标签
      document.querySelectorAll("img").forEach((img) => {
        const src = img.src;
        if (src && !src.startsWith("data:")) {
          urls.push(src);
        }
      });

      // 提取 CSS 背景图片
      document.querySelectorAll("*").forEach((el) => {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (bgImage && bgImage !== "none") {
          const match = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (match && match[1] && !match[1].startsWith("data:")) {
            urls.push(match[1]);
          }
        }
      });

      return [...new Set(urls)];
    });

    statusMessage += `找到 ${imageUrls.length} 个图片\n`;

    // 6. 下载图片（如果需要）
    const imageMap = new Map<string, string>();
    if (downloadImages && imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        try {
          statusMessage += `  下载图片 (${i + 1}/${imageUrls.length}): ${imageUrl}\n`;
          const relativePath = getOriginalFilePath(imageUrl, i);
          const imagePath = path.join(absoluteOutputDir, relativePath);
          
          // 确保目标目录存在
          const imageDir = path.dirname(imagePath);
          await fs.mkdir(imageDir, { recursive: true });

          // 使用 page.evaluate 和 fetch 在页面上下文中下载（保持 cookies 和认证）
          const imageData = await page.evaluate(async (url: string) => {
            try {
              const response = await fetch(url);
              if (!response.ok) {
                return null;
              }
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              // 直接返回字节数组
              return Array.from(new Uint8Array(arrayBuffer));
            } catch (e) {
              return null;
            }
          }, imageUrl);

          if (imageData) {
            // 从字节数组创建 buffer
            const buffer = Buffer.from(imageData);
            await fs.writeFile(imagePath, buffer);
            imageMap.set(imageUrl, `./${relativePath}`);
          } else {
            statusMessage += `    警告: 无法下载 ${imageUrl}\n`;
            imageMap.set(imageUrl, imageUrl);
          }
        } catch (error) {
          statusMessage += `    警告: 下载失败 ${imageUrl}: ${error}\n`;
          imageMap.set(imageUrl, imageUrl);
        }
      }

      // 替换 HTML 和 CSS 中的图片链接
      statusMessage += "\n正在替换图片链接...\n";
      for (const [originalUrl, localPath] of imageMap.entries()) {
        // 转义特殊字符用于正则表达式
        const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        
        // 替换 HTML 中的直接引用
        html = html.replace(new RegExp(escapedUrl, "g"), localPath);
        
        // 替换 CSS 中的 url() 引用（可能有引号或没有引号）
        html = html.replace(
          new RegExp(`url\\(['"]?${escapedUrl}['"]?\\)`, "g"),
          `url('${localPath}')`
        );
        
        statusMessage += `  替换: ${originalUrl} -> ${localPath}\n`;
      }
    }

    // 7. 移除原有的 CSS 链接和 script 标签
    html = html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, "");
    html = html.replace(/<link[^>]+href=["'][^"']+["'][^>]*rel=["']stylesheet["'][^>]*>/gi, "");
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""); // 移除旧的 style 标签

    // 可选：移除 script 标签（因为已经渲染完成）
    // html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

    // 8. 将合并的 CSS 内联到 HTML
    const styleTag = `<style>\n${combinedCss}\n</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${styleTag}\n</head>`);
    } else if (html.includes("<body")) {
      html = html.replace("<body", `${styleTag}\n<body`);
    } else {
      html = styleTag + html;
    }

    // 9. 保存 HTML 文件
    const htmlPath = path.join(absoluteOutputDir, "index.html");
    await fs.writeFile(htmlPath, html, "utf-8");

    statusMessage += `\n✅ 克隆完成！\n`;
    statusMessage += `HTML 文件: ${htmlPath}\n`;
    if (downloadImages && imageUrls.length > 0) {
      statusMessage += `图片已保存到输出目录\n`;
    }
    statusMessage += `\n注意：此为静态快照，不包含 JavaScript 交互功能\n`;

    return {
      content: [
        {
          type: "text",
          text: statusMessage,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `❌ 错误: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("服务器启动失败:", error);
  process.exit(1);
});

