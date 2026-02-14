# ✅ LunaTV Serverless 改造 To-Do

> **目标**：将 LunaTV 改造为纯 Serverless 部署方案
> **部署平台**：Vercel
> **数据库**：Upstash（云端 HTTP Redis）或 localStorage（无后端）
> **更新日期**：2026-02-14

---

## 📋 目录

- [阶段一：清理 Docker 相关文件](#阶段一清理-docker-相关文件) ✅
- [阶段二：移除不兼容的存储驱动](#阶段二移除不兼容的存储驱动) ✅
- [阶段三：适配 Serverless 构建配置](#阶段三适配-serverless-构建配置) ✅
- [阶段四：安全改进](#阶段四安全改进) ✅
- [阶段五：依赖升级](#阶段五依赖升级) 🔄
- [阶段六：可选优化](#阶段六可选优化) 🔄
- [阶段七：管理后台监控面板](#阶段七管理后台监控面板) ✅

---

## 阶段一：清理 Docker 相关文件 ✅

> **目标**：移除所有仅用于 Docker 部署的文件和配置

- [x] **1.1** 删除 `Dockerfile`
- [x] **1.2** 删除 `.dockerignore`
- [x] **1.3** 删除 `start.js`（Docker 容器启动脚本）
- [x] **1.4** 删除 `.github/workflows/docker-image.yml`（Docker 镜像 CI/CD）
- [x] **1.5** 删除 `webpack-obfuscator` 依赖

---

## 阶段二：移除不兼容的存储驱动 ✅

> **目标**：移除 Redis / Kvrocks TCP 驱动，保留 Upstash (HTTP) 和 localStorage

- [x] **2.1** 删除 `src/lib/redis.db.ts`
- [x] **2.2** 删除 `src/lib/kvrocks.db.ts`
- [x] **2.3** 删除 `src/lib/redis-base.db.ts`
- [x] **2.4** 修改 `src/lib/db.ts`：仅保留 `upstash` 和 `localstorage`
- [x] **2.5** 修改 `src/lib/db.client.ts`：移除 `'redis'` 类型
- [x] **2.6** 卸载 `redis` npm 包
- [x] **2.7** 确认 `@upstash/redis` 保留

---

## 阶段三：适配 Serverless 构建配置 ✅

> **目标**：让项目正确运行在 Serverless 平台上

- [x] **3.1** 移除 `output: 'standalone'`
- [x] **3.2** 启用 `swcMinify: true` + `reactStrictMode: true`
- [x] **3.3** 确认 Vercel cron 配置 + `CRON_SECRET` 认证
- [x] **3.4** 评估内存缓存策略 — 暂时保留现有缓存（可接受命中率低）
- [x] **3.5** 启用 Vercel 图片优化

---

## 阶段四：安全改进 ✅

> **目标**：修复安全问题

- [x] **4.1** 密码哈希（bcryptjs，含旧用户自动迁移）
- [x] **4.2** Cookie 安全（`auth` 使用 HttpOnly + Secure + SameSite，客户端展示信息拆分到 `auth_client`）
- [x] **4.3** Cron API 认证（`CRON_SECRET`）
- [x] **4.4** HMAC 签名添加时间戳（7 天过期）

---

## 阶段五：依赖升级 🔄

> **目标**：更新已过期的依赖
>
> 当前已完成 30 项，剩余项目因技术依赖链被阻挡（详见 [ISSUES.md](./ISSUES.md)）

### 当前依赖版本

| 类别      | 包名                               | 当前版本 |
| --------- | ---------------------------------- | :------: |
| 语言      | `typescript`                       |  5.9.3   |
| 代码规范  | `eslint`                           |  8.57.1  |
|           | `@typescript-eslint/eslint-plugin` |  7.18.0  |
|           | `@typescript-eslint/parser`        |  7.18.0  |
|           | `eslint-config-prettier`           |  10.1.8  |
|           | `eslint-plugin-simple-import-sort` |  12.1.1  |
|           | `eslint-plugin-unused-imports`     |  3.2.0   |
| 格式化    | `prettier`                         |  3.8.1   |
|           | `prettier-plugin-tailwindcss`      |  0.7.2   |
| 测试      | `jest`                             |  30.2.0  |
|           | `@testing-library/jest-dom`        |  6.9.1   |
|           | `@testing-library/react`           |  16.3.2  |
|           | `next-router-mock`                 |  1.0.5   |
| Git Hooks | `husky`                            |  9.1.7   |
|           | `@commitlint/cli`                  |  20.4.1  |
|           | `@commitlint/config-conventional`  |  20.4.1  |
|           | `lint-staged`                      |  16.2.7  |
| 类型      | `@types/node`                      |  25.2.3  |
| UI        | `@headlessui/react`                |  2.2.9   |
|           | `@tailwindcss/forms`               |  0.5.11  |
| 播放器    | `artplayer`                        |  5.3.0   |
|           | `hls.js`                           |  1.6.15  |
| 动画      | `framer-motion`                    | 12.34.0  |
| 数据库    | `@upstash/redis`                   |  1.36.2  |
| 其他      | `autoprefixer`                     | 10.4.24  |

### 被阻挡的升级

| 包名                  |   当前 → 目标   | 阻碍原因                                    |
| --------------------- | :-------------: | ------------------------------------------- |
| `react` + `react-dom` | 18.3 → **19.x** | 需重写 forwardRef、审查 useEffect，工作量大 |
| `next`                | 14.2 → **16.x** | 依赖 React 19                               |
| `eslint`              |  8.57 → **9+**  | Next.js 14 `next lint` 不支持 flat config   |
| `tailwindcss`         |  3.4 → **4.x**  | 全新架构，每个 .tsx 都受影响                |
| `zod`                 | 3.25 → **4.x**  | API 变更，且目前使用不多                    |
| `swiper`              | 11.2 → **12.x** | 主版本升级，优先级低                        |
| `tailwind-merge`      |  2.6 → **3.x**  | 与 Tailwind 4 绑定                          |
| `@types/react`        | 18.3 → **19.x** | 依赖 React 19                               |
| `@types/react-dom`    | 18.3 → **19.2** | 依赖 React 19                               |

> 详细阻碍说明见 [ISSUES.md](./ISSUES.md)

### 其他待处理

- [ ] **5.40** 替换 `next-pwa`（已停止维护）为 `@serwist/next` 或 `@ducanh2912/next-pwa`

---

## 阶段六：可选优化 🔄

> **目标**：按需改进

### 代码质量

- [ ] **6.1** 拆分 `db.client.ts`（1643 行） → 多个模块
- [x] **6.2** 统一 `PlayRecord` / `Favorite` 类型定义（`db.client.ts` 改为从 `types.ts` 导入）
- [x] **6.3** 提取 `ensureString`/`ensureStringArray` 到 `data-utils.ts`
- [x] **6.4** 修复 `version_check.ts` 数组越界问题
- [x] **6.5** 消除 `db.ts` 中的 `as any`，直接使用 `IStorage` 接口方法
- [x] **6.6** 清理 `eslint-disable` 注释（`version_check.ts`、`data-utils.ts` 已处理，其余文件待续）

### 性能优化

- [x] **6.7** `getAllPlayRecords`/`getAllFavorites` 使用 MGET 批量查询
- [x] **6.8** （合并到 6.7）
- [x] **6.9** `addSearchHistory` 使用 Pipeline（3 次操作 → 1 次往返）
- [ ] **6.10** 评估 `crypto-js` 替代方案（⚠️ 存在数据兼容性风险，详见 ISSUES.md）
- [x] **6.19** `deleteUser` KEYS 扫描优化（3 次模式匹配 → 单次用户命名空间匹配）
- [x] **6.20** `getAllUsers` 用户列表优化（新增索引集合，优先走 `SMEMBERS`，旧数据回退 KEYS）

### Bundle 优化

- [x] **6.11** 移除 Vidstack、media-icons（源码中无引用，仅使用 ArtPlayer）
- [x] **6.12** 移除 `he` 库，改用浏览器原生 HTML 实体解码（减少 bundle）

### DX 改进

- [x] **6.13** 新增 `.env.example`
- [ ] **6.14** 在 API Route 中统一使用 Zod 做输入验证（已落地 login、change-password、favorites、playrecords、searchhistory、skipconfigs，其余路由待覆盖）
- [x] **6.15** 增加基础测试覆盖率（data-utils、version_check、utils，共 28 个 test case）

### OpenAPI 文档（可选）

- [x] **6.16** 安装 `@asteasolutions/zod-to-openapi`（使用 7.x，兼容 Zod 3）
- [x] **6.17** 创建 `/api/docs` Swagger UI 路由
- [x] **6.18** 为核心 API 添加 Zod Schema 定义（已覆盖 login、change-password、favorites、playrecords、searchhistory、skipconfigs）
- [x] **6.26** 新增 OpenAPI 自动生成脚本（`gen:openapi:json` / `gen:openapi:types`）
- [ ] **6.27** 新增 typed API helper，基于 `src/types/openapi.d.ts` 推导请求/响应类型
- [ ] **6.28** 将核心前端 API 调用逐步迁移到 OpenAPI 生成类型（优先 auth + favorites + playrecords）
- [ ] **6.29** 在 CI 加入 OpenAPI 产物一致性检查（防止 schema 与类型漂移）

### 代码审查跟进（2026-02-14）

- [x] **6.21** 移除 `data_migration/import/export` 中 `(db as any).storage`，改为调用 `DbManager` 公开方法（新增密码哈希读写接口）
- [ ] **6.22** `RUNTIME_CONFIG` 类型化与统一访问层（先覆盖 `UserMenu`、`db.client`、`utils`）
- [ ] **6.23** 拆分 `src/app/admin/page.tsx`（5476 行）
- [ ] **6.24** 拆分 `src/lib/db.client.ts`（1643 行）
- [ ] **6.25** 缩小整档 `eslint-disable` 范围（优先 `admin/page.tsx`）

---

## 阶段七：管理后台实时监控面板 ✅

> **设计原则**：数据仅保存在 React State，不写入数据库。打开页面开始采集，关掉页面数据消失。

### 后端 API

- [x] **7.1** `/api/admin/monitor` — 返回内存使用、Redis 延迟、实例存活时间
- [x] **7.2** `/api/admin/monitor/health` — 健康检查（Upstash + 采集源连通性）

### 前端面板

- [x] **7.3** 在管理后台新增「系统监控」标签页
  - 系统概览卡片：内存使用、Redis 延迟、健康状态指示灯
  - 实时趋势图：最近 N 次轮询数据走势（SVG Sparkline）
  - API 源健康状态 + Redis 状态
- [x] **7.4** 自动轮询（每 10 秒，最多保留 60 条 = 10 分钟数据）
- [x] **7.5** 仅 owner / admin 可访问

---

## 📊 进度总结

| 阶段                    | 任务数 |     状态      |
| ----------------------- | :----: | :-----------: |
| 阶段一：清理 Docker     |   5    |    ✅ 完成    |
| 阶段二：移除 TCP 驱动   |   7    |    ✅ 完成    |
| 阶段三：Serverless 适配 |   5    |    ✅ 完成    |
| 阶段四：安全改进        |   4    |    ✅ 完成    |
| 阶段五：依赖升级        |   40   | 🔄 30/40 完成 |
| 阶段六：可选优化        |   28   | 🔄 19/28 完成 |
| 阶段七：实时监控        |   5    |    ✅ 完成    |
| **合计**                | **94** |   **75/94**   |

```
阶段一 ✅ → 阶段二 ✅ → 阶段三 ✅ → 阶段四 ✅ → 阶段五 🔄 → 阶段六（按需）→ 阶段七 ✅
```
