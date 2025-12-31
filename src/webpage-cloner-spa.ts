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
            cookies: {
              type: "array",
              description: "要设置的 Cookie 数组（用于访问需要登录的页面）",
              items: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "Cookie 名称",
                  },
                  value: {
                    type: "string",
                    description: "Cookie 值",
                  },
                  domain: {
                    type: "string",
                    description: "Cookie 域名（可选）",
                  },
                  path: {
                    type: "string",
                    description: "Cookie 路径（可选）",
                  },
                  expires: {
                    type: "number",
                    description: "过期时间戳（可选）",
                  },
                  httpOnly: {
                    type: "boolean",
                    description: "是否 HttpOnly（可选）",
                  },
                  secure: {
                    type: "boolean",
                    description: "是否 Secure（可选）",
                  },
                  sameSite: {
                    type: "string",
                    description: "SameSite 属性（可选）",
                  },
                },
                required: ["name", "value"],
              },
            },
            userDataDir: {
              type: "string",
              description: "浏览器用户数据目录路径（用于保持登录状态，留空则使用临时目录）",
            },
            headless: {
              type: "boolean",
              description: "是否使用无头模式（false 可以看到浏览器窗口，方便调试登录），默认 true",
              default: true,
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
    const cookies = (args?.cookies as any[]) || [];
    const userDataDir = (args?.userDataDir as string) || "";
    const headless = (args?.headless as boolean) ?? true;

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
    statusMessage += `等待时间: ${waitTime}ms\n`;
    if (cookies.length > 0) {
      statusMessage += `使用 Cookie 数量: ${cookies.length}\n`;
    }
    if (userDataDir) {
      statusMessage += `使用用户数据目录: ${userDataDir}\n`;
    }
    statusMessage += `无头模式: ${headless ? '是' : '否'}\n\n`;

    // 1. 启动浏览器
    statusMessage += "正在启动浏览器...\n";
    const launchOptions: any = {
      headless: headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    };
    
    // 如果指定了用户数据目录，使用它（可以保持登录状态）
    if (userDataDir) {
      launchOptions.userDataDir = userDataDir;
      statusMessage += `使用用户数据目录，将保持登录状态\n`;
    }
    
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    // 2. 设置 Cookies（如果提供）
    if (cookies.length > 0) {
      statusMessage += "正在设置 Cookies...\n";
      try {
        await page.setCookie(...cookies);
        statusMessage += `已设置 ${cookies.length} 个 Cookie\n`;
      } catch (error) {
        statusMessage += `警告: Cookie 设置失败 - ${error}\n`;
      }
    }

    // 3. 访问页面并等待 JavaScript 执行
    statusMessage += "正在加载页面并执行 JavaScript...\n";
    await page.goto(url, {
      waitUntil: "networkidle0",
      timeout: 60000,
    });

    // 额外等待时间，确保动态内容加载完成
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // 4. 获取渲染后的 HTML
    statusMessage += "正在提取渲染后的 HTML...\n";
    let html = await page.content();

    // 5. 提取所有 CSS（包括内联和外部）
    statusMessage += "正在提取和内联 CSS...\n";
    
    // 首先获取所有外部 CSS 链接，区分同域名和跨域
    const { styles: allStyles, sameDomainSheets, crossDomainSheets } = await page.evaluate((pageUrl: string) => {
      const styles: string[] = [];
      const sameDomain: string[] = [];
      const crossDomain: string[] = [];
      const pageOrigin = new URL(pageUrl).origin;
      const processedHrefs = new Set<string>();

      // 获取所有 style 标签
      document.querySelectorAll("style").forEach((style) => {
        styles.push(style.textContent || "");
      });

      // 获取所有外部样式表链接
      document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
        const href = (link as HTMLLinkElement).href;
        if (href && !processedHrefs.has(href)) {
          processedHrefs.add(href);
          try {
            const sheetUrl = new URL(href);
            if (sheetUrl.origin === pageOrigin) {
              sameDomain.push(href);
            } else {
              crossDomain.push(href);
            }
          } catch (urlError) {
            // 忽略无效的 URL
          }
        }
      });

      // 尝试通过 CSSOM 提取跨域样式表（它们通常已经通过 CORS 加载）
      Array.from(document.styleSheets).forEach((sheet) => {
        if (!sheet.href) return; // 跳过内联样式
        
        try {
          const sheetUrl = new URL(sheet.href);
          // 只处理跨域的样式表
          if (sheetUrl.origin !== pageOrigin && sheet.cssRules) {
            const rules = Array.from(sheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n");
            styles.push(rules);
          }
        } catch (e) {
          // 无法访问的跨域样式表，忽略
        }
      });

      return { styles, sameDomainSheets: sameDomain, crossDomainSheets: crossDomain };
    }, url);
    
    statusMessage += `找到 ${sameDomainSheets.length} 个同域名 CSS 文件，${crossDomainSheets.length} 个跨域 CSS 文件\n`;
    
    // 下载所有同域名的 CSS 文件（因为需要处理其中的相对路径）
    const downloadedCssContents: string[] = [];
    if (sameDomainSheets.length > 0) {
      statusMessage += `正在下载同域名 CSS 文件...\n`;
      
      for (const cssUrl of sameDomainSheets) {
        try {
          statusMessage += `  下载 CSS: ${cssUrl}\n`;
          
          // 使用 page.evaluate 和 fetch 在页面上下文中下载 CSS
          const cssText = await page.evaluate(async (url: string) => {
            try {
              const response = await fetch(url);
              if (!response.ok) return null;
              return await response.text();
            } catch (e) {
              return null;
            }
          }, cssUrl);
          
          if (cssText) {
            let processedCss = cssText;
            
            // 处理 CSS 中的字体文件引用
            if (downloadImages) {
              // 提取所有字体文件 URL
              const fontUrlMatches = cssText.matchAll(/url\(['"]?([^'")\s]+\.(woff2?|ttf|eot|otf|svg))(\?[^'")\s]*)?\s*['"]?\)/gi);
              const fontUrls = new Set<string>();
              
              for (const match of fontUrlMatches) {
                const fontPath = match[1];
                try {
                  const absoluteFontUrl = new URL(fontPath, cssUrl).href;
                  fontUrls.add(absoluteFontUrl);
                } catch (e) {
                  // 忽略无效的 URL
                }
              }
              
              // 下载字体文件
              if (fontUrls.size > 0) {
                statusMessage += `    找到 ${fontUrls.size} 个字体文件\n`;
                
                for (const fontUrl of fontUrls) {
                  try {
                    statusMessage += `      下载字体: ${fontUrl}\n`;
                    const relativePath = getOriginalFilePath(fontUrl, 0);
                    const fontPath = path.join(absoluteOutputDir, relativePath);
                    
                    // 确保目标目录存在
                    const fontDir = path.dirname(fontPath);
                    await fs.mkdir(fontDir, { recursive: true });
                    
                    // 下载字体文件
                    const fontData = await page.evaluate(async (url: string) => {
                      try {
                        const response = await fetch(url);
                        if (!response.ok) return null;
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        return Array.from(new Uint8Array(arrayBuffer));
                      } catch (e) {
                        return null;
                      }
                    }, fontUrl);
                    
                    if (fontData) {
                      const buffer = Buffer.from(fontData);
                      await fs.writeFile(fontPath, buffer);
                      
                      // 替换 CSS 中的字体 URL 为本地路径
                      const escapedUrl = fontUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                      processedCss = processedCss.replace(
                        new RegExp(escapedUrl, "g"),
                        `./${relativePath}`
                      );
                    }
                  } catch (error) {
                    statusMessage += `        警告: 字体下载失败 ${fontUrl}\n`;
                  }
                }
              }
            } else {
              // 不下载字体，转换为绝对 URL
              processedCss = processedCss.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match: string, urlPath: string) => {
                if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:') || urlPath.startsWith('//')) {
                  return match;
                }
                try {
                  const absoluteUrl = new URL(urlPath, cssUrl).href;
                  return `url('${absoluteUrl}')`;
                } catch {
                  return match;
                }
              });
            }
            
            downloadedCssContents.push(processedCss);
          }
        } catch (error) {
          statusMessage += `    警告: CSS 下载失败 ${cssUrl}: ${error}\n`;
        }
      }
    }

    let combinedCss = [...downloadedCssContents, ...allStyles].join("\n\n");
    
    // 当不下载图片时，转换 CSS 中的相对 URL 为绝对 URL
    if (!downloadImages) {
      combinedCss = combinedCss.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match: string, urlPath: string) => {
        // 跳过已经是绝对路径或 data URI 的
        if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:') || urlPath.startsWith('//')) {
          return match;
        }
        try {
          const absoluteUrl = new URL(urlPath, url).href;
          return `url('${absoluteUrl}')`;
        } catch {
          return match;
        }
      });
    }

    // 6. 提取所有图片 URL
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

    // 7. 处理图片
    const imageMap = new Map<string, string>();
    
    if (downloadImages && imageUrls.length > 0) {
      // 下载图片到本地
      statusMessage += "正在下载图片到本地...\n";
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
      statusMessage += "\n正在替换图片链接为本地路径...\n";
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
    } else if (!downloadImages && imageUrls.length > 0) {
      // 不下载图片，但需要确保所有图片 URL 都是绝对路径
      statusMessage += "正在将图片链接转换为绝对 URL...\n";
      
      // 在浏览器上下文中获取所有图片的绝对 URL 映射
      const absoluteUrlMap = await page.evaluate(() => {
        const map: { [key: string]: string } = {};
        
        // 处理 img 标签
        document.querySelectorAll("img").forEach((img) => {
          const originalSrc = img.getAttribute("src");
          const absoluteSrc = img.src;
          if (originalSrc && absoluteSrc && !absoluteSrc.startsWith("data:")) {
            map[originalSrc] = absoluteSrc;
          }
        });
        
        // 处理 CSS 背景图片（这些已经是绝对路径了，但为了保险起见）
        document.querySelectorAll("*").forEach((el) => {
          const style = window.getComputedStyle(el);
          const bgImage = style.backgroundImage;
          if (bgImage && bgImage !== "none") {
            const match = bgImage.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (match && match[1] && !match[1].startsWith("data:")) {
              // 背景图片的 URL 可能需要处理
              map[match[1]] = match[1]; // 已经是绝对路径
            }
          }
        });
        
        return map;
      });
      
      // 替换 HTML 中的相对路径为绝对 URL
      for (const [originalPath, absoluteUrl] of Object.entries(absoluteUrlMap)) {
        if (originalPath !== absoluteUrl) {
          // 转义特殊字符用于正则表达式
          const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          // 同时创建 HTML 实体编码版本（& -> &amp;）
          const escapedPathWithEntities = escapedPath.replace(/&/g, "&amp;");
          
          // 替换 HTML 中的 src 属性（处理两种情况：原始和实体编码）
          html = html.replace(
            new RegExp(`src=["']${escapedPath}["']`, "g"),
            `src="${absoluteUrl}"`
          );
          html = html.replace(
            new RegExp(`src=["']${escapedPathWithEntities}["']`, "g"),
            `src="${absoluteUrl}"`
          );
          
          // 替换 CSS 中的 url() 引用
          html = html.replace(
            new RegExp(`url\\(['"]?${escapedPath}['"]?\\)`, "g"),
            `url('${absoluteUrl}')`
          );
          html = html.replace(
            new RegExp(`url\\(['"]?${escapedPathWithEntities}['"]?\\)`, "g"),
            `url('${absoluteUrl}')`
          );
          
          statusMessage += `  转换: ${originalPath} -> ${absoluteUrl}\n`;
        }
      }
      
      statusMessage += `已将 ${Object.keys(absoluteUrlMap).length} 个图片链接转换为绝对 URL\n`;
    }
    
    // 8. 当不下载图片时，也需要转换其他资源的相对路径为绝对 URL
    if (!downloadImages) {
      statusMessage += "正在将其他资源链接转换为绝对 URL...\n";
      
      // 获取页面的基础 URL
      const baseUrl = new URL(url);
      const origin = baseUrl.origin;
      
      // 辅助函数：将相对 URL 转换为绝对 URL
      const toAbsoluteUrl = (relativeUrl: string): string => {
        if (!relativeUrl || relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://') || relativeUrl.startsWith('data:') || relativeUrl.startsWith('//')) {
          return relativeUrl;
        }
        try {
          return new URL(relativeUrl, url).href;
        } catch {
          return relativeUrl;
        }
      };
      
      // 转换 img 标签的 src（处理可能遗漏的图片）
      html = html.replace(/<img([^>]*?)src=["']([^"']+)["']/gi, (match: string, attrs: string, src: string) => {
        const absoluteSrc = toAbsoluteUrl(src);
        if (absoluteSrc !== src) {
          statusMessage += `  转换 img: ${src} -> ${absoluteSrc}\n`;
        }
        return `<img${attrs}src="${absoluteSrc}"`;
      });
      
      // 转换 link 标签的 href（包括 favicon、stylesheet 等）
      html = html.replace(/<link([^>]*?)href=["']([^"']+)["']/gi, (match: string, attrs: string, href: string) => {
        const absoluteHref = toAbsoluteUrl(href);
        if (absoluteHref !== href) {
          statusMessage += `  转换 link: ${href} -> ${absoluteHref}\n`;
        }
        return `<link${attrs}href="${absoluteHref}"`;
      });
      
      // 转换 script 标签的 src
      html = html.replace(/<script([^>]*?)src=["']([^"']+)["']/gi, (match: string, attrs: string, src: string) => {
        const absoluteSrc = toAbsoluteUrl(src);
        if (absoluteSrc !== src) {
          statusMessage += `  转换 script: ${src} -> ${absoluteSrc}\n`;
        }
        return `<script${attrs}src="${absoluteSrc}"`;
      });
      
      // 转换 a 标签的 href（只转换相对路径，保留锚点和 javascript:）
      html = html.replace(/<a([^>]*?)href=["']([^"']+)["']/gi, (match: string, attrs: string, href: string) => {
        if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          return match;
        }
        const absoluteHref = toAbsoluteUrl(href);
        if (absoluteHref !== href) {
          statusMessage += `  转换 a: ${href} -> ${absoluteHref}\n`;
        }
        return `<a${attrs}href="${absoluteHref}"`;
      });
      
      // 转换 CSS 中的 url() - 处理所有未被处理的相对路径
      html = html.replace(/url\(['"]?([^'")\s]+)['"]?\)/gi, (match: string, urlPath: string) => {
        if (urlPath.startsWith('http://') || urlPath.startsWith('https://') || urlPath.startsWith('data:') || urlPath.startsWith('//')) {
          return match;
        }
        const absoluteUrl = toAbsoluteUrl(urlPath);
        if (absoluteUrl !== urlPath) {
          statusMessage += `  转换 CSS url: ${urlPath} -> ${absoluteUrl}\n`;
        }
        return `url('${absoluteUrl}')`;
      });
      
      statusMessage += "已完成所有资源链接的转换\n";
    }

    // 9. 移除原有的 CSS 链接和 script 标签（但保留图标字体库）
    // 保留常见的图标字体库 CDN 链接
    const iconLibraries = [
      'remixicon',
      'font-awesome',
      'fontawesome',
      'material-icons',
      'bootstrap-icons',
      'feather',
      'ionicons',
      'line-awesome'
    ];
    
    // 提取所有 link 标签
    const linkRegex = /<link[^>]*>/gi;
    const links = html.match(linkRegex) || [];
    
    // 移除非图标库的 stylesheet 链接
    links.forEach((link: string) => {
      const isIconLibrary = iconLibraries.some((lib: string) => 
        link.toLowerCase().includes(lib)
      );
      
      // 只移除非图标库的 stylesheet
      if (!isIconLibrary && /rel=["']stylesheet["']/i.test(link)) {
        html = html.replace(link, '');
      }
    });
    
    html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ""); // 移除旧的 style 标签

    // 可选：移除 script 标签（因为已经渲染完成）
    // html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");

    // 10. 将合并的 CSS 内联到 HTML
    const styleTag = `<style>\n${combinedCss}\n</style>`;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${styleTag}\n</head>`);
    } else if (html.includes("<body")) {
      html = html.replace("<body", `${styleTag}\n<body`);
    } else {
      html = styleTag + html;
    }

    // 11. 保存 HTML 文件
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

