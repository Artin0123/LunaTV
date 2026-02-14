# 🔍 LunaTV Code Review

> **审查日期**：2026-02-14
> **审查范围**：全项目代码源码、配置文件、部署方案
> **部署目标**：Serverless 平台（Vercel）+ Upstash Redis

---

## 📋 目录

- [一、技术栈总览](#一技术栈总览)
- [二、核心功能模块](#二核心功能模块)
- [三、待改进项目](#三待改进项目)
- [四、已知阻碍](#四已知阻碍)

---

## 一、技术栈总览

| 类别        | 技术                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| 前端框架    | Next.js 14 (App Router)                                                    |
| UI & 样式   | Tailwind CSS 3 + Headless UI + Heroicons                                   |
| 语言        | TypeScript 5.9.3                                                           |
| 播放器      | ArtPlayer 5 + HLS.js                                                       |
| 状态管理    | React Context (`SiteProvider`) + `localStorage` 缓存                       |
| 动画        | Framer Motion                                                              |
| 拖拽        | @dnd-kit (core / sortable / modifiers / utilities)                         |
| 加密        | crypto-js (AES) + Web Crypto API (HMAC-SHA256)                             |
| 认证        | bcrypt 密码哈希 + HMAC-SHA256 签名 + HttpOnly/Secure Cookie                |
| 编码        | bs58 (Base58)                                                              |
| 数据库      | Upstash Redis (HTTP) / localStorage                                        |
| PWA         | next-pwa（已停止维护，待替换）                                             |
| 轮播        | Swiper 11                                                                  |
| 代码质量    | ESLint 8 + Prettier 3 + Jest 30 + Husky 9 + Commitlint 20 + lint-staged 16 |
| 图标        | react-icons + lucide-react                                                 |
| CSS 工具    | clsx + tailwind-merge                                                      |
| Schema 验证 | Zod 3                                                                      |
| 主题        | next-themes (暗色 / 亮色)                                                  |
| 构建        | pnpm + Webpack 5 (SVG via @svgr/webpack) + SWC 编译器                      |
| 部署        | Serverless (Vercel) + Vercel Cron Jobs                                     |
| 反代        | Cloudflare Workers (proxy.worker.js)                                       |
| 监控        | `/api/admin/monitor` + `/api/admin/monitor/health`                         |

---

## 二、核心功能模块

### 1. 多源聚合搜索

- 支持多个苹果 CMS V10 API 兼容的采集站
- 并发搜索 + 分页拉取
- 搜索结果内存缓存（10 分钟 TTL，最大 1000 条，LRU 淘汰）
- 流式搜索输出（`NEXT_PUBLIC_FLUID_SEARCH`）
- 搜索建议联想 + 结果过滤（按播放源、标题、年份）

### 2. 视频播放

- HLS.js 集成播放 m3u8 流
- ArtPlayer 视频播放器 + HLS.js
- `/play` 与 `/live` 的播放器依赖改为运行时动态加载（降低开发态 HMR chunk 初始化异常）
- 视频清晰度检测 + 网络速度测量
- 剧集列表 & 选集功能 + 跳过片头片尾

### 3. 豆瓣数据集成

- 豆瓣分类浏览 + 推荐数据
- 6 种图片代理模式 + 4 种数据代理方式
- 自定义分类

### 4. IPTV 直播

- M3U 播放列表 / EPG 节目单解析
- 直播频道缓存 / 分组 / 搜索 / 收藏

### 5. 用户系统

- 站长 / 管理员 / 普通用户三级角色
- bcrypt 密码哈希 + Cookie 认证 + HMAC-SHA256 签名
- 用户组 (Tags) + 播放源权限控制

### 6. 数据存储

- Upstash Redis (HTTP) — 使用 MGET 批量查询 + Pipeline 优化
- 播放记录 / 收藏夹 / 搜索历史 / 跳过配置 CRUD
- 混合缓存策略（乐观更新 + 后台异步同步）

### 7. 管理后台

- 在线配置编辑 + 采集源管理 + 用户管理
- 直播源管理 + 自定义分类管理
- 配置订阅（自动更新）+ 数据导入/导出/迁移

### 8. 系统监控

- `/api/admin/monitor`：内存使用、数据库延迟（Upstash）、实例存活时间
- `/api/admin/monitor/health`：Upstash + 采集源连通性健康检查
- 前端监控面板已上线（系统概览 + 趋势图 + 健康检查，10 秒轮询）
- 监控 API 已限制为 owner/admin 访问

### 9. 安全特性

- bcrypt 密码哈希（自动从明文迁移）
- HttpOnly + Secure + SameSite Cookie
- HMAC-SHA256 签名带时间戳过期机制
- Cron API CRON_SECRET 认证
- 色情内容过滤（关键词黑名单）

### 10. 其他

- PWA 支持 + 响应式布局 + 暗色/亮色主题
- 版本检查 + 变更日志 + 每日新番放送
- Cloudflare Workers 反代 + 图片/m3u8 代理
- AndroidTV / OrionTV / Selene 客户端兼容

---

## 三、待改进项目

### 代码质量

| #   | 问题                                            | 位置                                        |
| --- | ----------------------------------------------- | ------------------------------------------- |
| 1   | `db.client.ts` 1643 行巨型文件                  | 应拆分为独立模块                            |
| 2   | 大量 `eslint-disable` 注释                      | 50+ 文件，掩盖实际问题                      |
| 3   | 认证资讯仍依赖客户端可读 cookie (`auth_client`) | 可再评估改为 `/api/me` 拉取角色，降低篡改面 |

### 性能

| #   | 问题                                         | 位置                             |
| --- | -------------------------------------------- | -------------------------------- |
| 1   | `db.client.ts` 多处 `JSON.stringify` 深比较  | 大对象比较有性能与可读性成本     |
| 2   | `admin/page.tsx` 中 3 处重复 `handleDragEnd` | 可抽取共用逻辑减少重复维护成本   |
| 3   | `CustomHlsJsLoader` 结构相近                 | `play/live` 两处可评估提取共用层 |

| #   | 问题                  | 说明                                  |
| --- | --------------------- | ------------------------------------- |
| 1   | `crypto-js` 约 400KB+ | 仅用 AES，但格式不兼容 Web Crypto API |

### DX

| #   | 问题                  | 说明                                                                                                   |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Zod 部分使用          | 已应用到 login/change-password/favorites/playrecords/searchhistory/skipconfigs，仍需逐步扩展到更多路由 |
| 2   | 测试覆盖率较低        | 有 28 个基础测试，但缺少 API 路由和组件测试                                                            |
| 3   | `next-pwa` 已停止维护 | 待迁移到 `@serwist/next` 或 `@ducanh2912/next-pwa`                                                     |

### 2026-02-14 复查补充（Medium）

| #   | 严重度 | 问题                                                        | 状态                                  |
| --- | :----: | ----------------------------------------------------------- | ------------------------------------- |
| 1   |   高   | `src/app/admin/page.tsx` 体积过大（5476 行）                | 待处理                                |
| 2   |   高   | `src/lib/db.client.ts` 体积过大（1643 行）                  | 待处理                                |
| 3   |   高   | `upstash.db.ts` 的 `deleteUser` 多次 KEYS 扫描              | ✅ 已优化为单次命名空间匹配           |
| 4   |   高   | `upstash.db.ts` 的 `getAllUsers` 使用 `KEYS('u:*:pwd')`     | ✅ 已改为用户索引集合优先（兼容回退） |
| 5   |   中   | `vod_play_url` 解析逻辑重复                                 | ✅ 已抽取 `parseVodPlayUrl`           |
| 6   |   中   | proxy / precheck 多处重复 LiveSource 查找                   | ✅ 已抽取 `getLiveSourceByKey`        |
| 7   |   中   | `src/app/admin/page.tsx` 顶层大范围 eslint-disable          | 待处理                                |
| 8   |   中   | `UserMenu` 与多处 `(window as any).RUNTIME_CONFIG` 分散存取 | ✅ 已完成统一访问层替换               |
| 9   |   中   | `data_migration/import/export` 使用 `(db as any).storage`   | ✅ 已改为 `DbManager` 公开方法        |
| 10  |   低   | `db.client.ts` 多处 `JSON.stringify` 深比较                 | 待处理                                |
| 11  |   低   | `admin/page.tsx` 中 3 处重复 `handleDragEnd`                | 待处理                                |
| 12  |   低   | `play` / `live` 的 `CustomHlsJsLoader` 结构相近             | 待处理                                |
| 13  |   低   | `POST /api/playrecords` 空请求体触发 JSON 解析异常          | ✅ 已加请求体安全解析（400）          |

---

## 四、已知阻碍

详见 [ISSUES.md](./ISSUES.md)。

核心阻碍链：

```
React 19 → Next.js 16 → ESLint 9 flat config → eslint-config-next
               ↓
         Tailwind 4 → tailwind-merge 3
```

React 19 迁移是解锁最多下游升级的关键路径。
