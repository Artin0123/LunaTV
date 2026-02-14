# 📖 LunaTV 开发与部署说明

> **更新日期**：2026-02-14

---

## 目录

- [一、开发环境](#一开发环境)
- [二、部署方案](#二部署方案)
- [三、数据库](#三数据库)
- [四、环境变量](#四环境变量)
- [五、API 端点一览](#五api-端点一览)

---

## 一、开发环境

| 项目          | 说明                                                             |
| ------------- | ---------------------------------------------------------------- |
| **框架**      | Next.js 14 (App Router)                                          |
| **构建工具**  | Next.js Webpack 5 + SWC 编译器                                   |
| **包管理器**  | pnpm                                                             |
| **语言**      | TypeScript 5.9.3                                                 |
| **CSS**       | Tailwind CSS 3 + PostCSS + Autoprefixer                          |
| **Node 版本** | ≥ 20（见 `.nvmrc`）                                              |
| **代码规范**  | ESLint 8 + Prettier 3 + Husky 9 + Commitlint 20 + lint-staged 16 |
| **测试**      | Jest 30 + @testing-library/react 16                              |

### 常用命令

```bash
pnpm install           # 安装依赖
pnpm dev               # 启动开发服务器 (next dev -H 0.0.0.0)
pnpm build             # 构建生产版本 (next build)
pnpm start             # 启动生产服务器 (next start)
pnpm lint              # 代码检查 (next lint)
pnpm lint:fix          # 自动修复 lint + 格式化
pnpm lint:strict       # 严格模式 (max-warnings=0)
pnpm typecheck         # 类型检查 (tsc --noEmit)
pnpm test              # 运行测试
pnpm format            # 格式化代码 (Prettier)
```

### 构建产出

- `pnpm build` 先执行 `pnpm gen:manifest`（生成 PWA `manifest.json`），再执行 `next build`
- Serverless 平台部署时自动处理构建和路由

### Git Hooks

- **pre-commit**：通过 lint-staged 自动运行 `eslint --max-warnings=0` 和 `prettier -w`
- **commit-msg**：通过 Commitlint 检查 commit message 格式（Conventional Commits）

---

## 二、部署方案

本项目使用 **Serverless 平台部署**。

### Vercel 部署

1. 连接 Git 仓库，Vercel 自动构建部署
2. 页面通过 CDN 分发，API 通过 Serverless Functions 处理
3. 定时任务通过 Vercel Cron Jobs 触发 `/api/cron`（配置在 `vercel.json`）
4. `/api/cron` 受 `CRON_SECRET` 环境变量保护

### 注意事项

- 模块级内存缓存（`cachedConfig` 等）在 Serverless 中每次请求可能在不同实例，命中率有限
- 图片优化使用 Vercel 内建优化（支持 WebP/AVIF 自动转换）
- PWA Service Worker 使用 `@serwist/next`（替代 `next-pwa`）

### Cloudflare Workers 反向代理

`proxy.worker.js` 是独立的 Cloudflare Workers 脚本，用于反代外部 API（绕过 CORS）。与主应用分开部署。

---

## 三、数据库

通过 `NEXT_PUBLIC_STORAGE_TYPE` 环境变量选择存储后端：

| 存储模式          | 环境变量值     | 协议       | 说明                                           |
| ----------------- | -------------- | ---------- | ---------------------------------------------- |
| **Upstash Redis** | `upstash`      | HTTP(S)    | 推荐。云端 Redis，HTTP 无状态，适合 Serverless |
| **LocalStorage**  | `localstorage` | 浏览器本地 | 数据存在浏览器中，仅限个人单机使用             |

> **推荐**：Serverless 部署使用 `upstash` 模式。

### Upstash 性能优化

- 批量读取使用 `MGET`（替代 N 次单独 GET）
- 搜索历史写入使用 Pipeline（3 次操作合并为 1 次往返）

---

## 四、环境变量

### 必填

| 变量                       | 说明                                 | 示例                     |
| -------------------------- | ------------------------------------ | ------------------------ |
| `USERNAME`                 | 站长账号                             | `admin`                  |
| `PASSWORD`                 | 站长密码（以 bcrypt 哈希存储）       | `your_strong_password`   |
| `NEXT_PUBLIC_STORAGE_TYPE` | 存储类型（`upstash`/`localstorage`） | `upstash`                |
| `UPSTASH_URL`              | Upstash Redis HTTPS 端点             | `https://xxx.upstash.io` |
| `UPSTASH_TOKEN`            | Upstash Redis 令牌                   | `AXxxxxxxxxxxxx`         |

### 可选（常用）

| 变量                                | 说明                                 | 默认值       |
| ----------------------------------- | ------------------------------------ | ------------ |
| `NEXT_PUBLIC_SITE_NAME`             | 站点名称                             | `LunaTV`     |
| `ANNOUNCEMENT`                      | 站点公告                             | 默认免责声明 |
| `SITE_BASE`                         | 站点 URL（m3u8 重写用）              | 空           |
| `CRON_SECRET`                       | Cron 任务认证密钥（Vercel 自动发送） | 空           |
| `NEXT_PUBLIC_FLUID_SEARCH`          | 是否开启流式搜索                     | `true`       |
| `NEXT_PUBLIC_SEARCH_MAX_PAGE`       | 搜索最大页数                         | `5`          |
| `NEXT_PUBLIC_DISABLE_YELLOW_FILTER` | 关闭色情内容过滤                     | `false`      |

### 可选（豆瓣）

| 变量                                  | 说明                   | 默认值   |
| ------------------------------------- | ---------------------- | -------- |
| `NEXT_PUBLIC_DOUBAN_PROXY_TYPE`       | 豆瓣数据代理方式       | `direct` |
| `NEXT_PUBLIC_DOUBAN_PROXY`            | 自定义豆瓣数据代理 URL | 空       |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE` | 豆瓣图片代理方式       | `direct` |
| `NEXT_PUBLIC_DOUBAN_IMAGE_PROXY`      | 自定义豆瓣图片代理 URL | 空       |

---

## 五、API 端点一览

### 公共 API

| 路由                 | 说明                     |
| -------------------- | ------------------------ |
| `/api/search/*`      | 多源聚合搜索（5 个路由） |
| `/api/detail`        | 视频详情                 |
| `/api/douban/*`      | 豆瓣数据（3 个路由）     |
| `/api/live/*`        | IPTV 直播（4 个路由）    |
| `/api/image-proxy`   | 图片代理                 |
| `/api/proxy/*`       | m3u8/ts 代理（4 个路由） |
| `/api/server-config` | 前端获取运行时配置       |

### 认证 API

| 路由                   | 说明             |
| ---------------------- | ---------------- |
| `/api/login`           | 登录             |
| `/api/logout`          | 登出             |
| `/api/register`        | 注册             |
| `/api/change-password` | 修改密码         |
| `/api/favorites`       | 收藏夹 CRUD      |
| `/api/playrecords`     | 播放记录 CRUD    |
| `/api/searchhistory`   | 搜索历史         |
| `/api/skipconfigs`     | 跳过片头片尾配置 |

### 管理 API（需 admin/owner 角色）

| 路由                             | 说明                                     |
| -------------------------------- | ---------------------------------------- |
| `/api/admin/config`              | 管理员配置                               |
| `/api/admin/config_file`         | 配置文件编辑                             |
| `/api/admin/config_subscription` | 配置订阅                                 |
| `/api/admin/site`                | 站点设置                                 |
| `/api/admin/user`                | 用户管理                                 |
| `/api/admin/source/*`            | 采集源管理                               |
| `/api/admin/category`            | 分类管理                                 |
| `/api/admin/live/*`              | 直播源管理                               |
| `/api/admin/data_migration/*`    | 数据导入/导出                            |
| `/api/admin/reset`               | 数据重置                                 |
| `/api/admin/monitor`             | 系统监控（内存、Upstash 延迟、实例信息） |
| `/api/admin/monitor/health`      | 健康检查（Upstash + 采集源连通性）       |

### 系统 API

| 路由                | 说明                                                   |
| ------------------- | ------------------------------------------------------ |
| `/api/cron`         | 定时任务（需 `CRON_SECRET` 认证）                      |
| `/api/docs`         | Swagger UI 文档页面（当前为核心 API 文档，非全量路由） |
| `/api/docs/openapi` | OpenAPI JSON 文档                                      |

> 说明：`/api/docs` 与 `/api/docs/openapi` 当前已覆盖的核心接口为  
> `/api/login`、`/api/change-password`、`/api/favorites`、`/api/playrecords`、`/api/searchhistory`、`/api/skipconfigs`（含 GET/POST/DELETE 核心方法）。  
> 其余 API 会按优先级逐步补齐到 OpenAPI。
