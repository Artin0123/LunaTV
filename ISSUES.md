# 🚧 未完成项目阻碍说明

> **文档日期**：2026-02-14
>
> **目的**：说明 TODO.md 中各阶段尚未完成的项目，为什么目前无法执行，以及解除条件。

---

## 阶段五：依赖升级 — 被阻挡的项目

### 🔴 5.2 ESLint 8 → 9+ (Flat Config 迁移)

**当前版本**：`eslint@8.57.1`
**目标版本**：`eslint@9+`

**阻碍原因**：

Next.js 14 的 `next lint` 命令内部使用 ESLint 的旧版 API（`useEslintrc`, `extensions`, `resolvePluginsRelativeTo` 等选项），这些 API 在 ESLint 9 中已被移除。

```
Invalid Options:
- Unknown options: useEslintrc, extensions, resolvePluginsRelativeTo, rulePaths,
  ignorePath, reportUnusedDisableDirectives
- 'extensions' has been removed.
- 'resolvePluginsRelativeTo' has been removed.
```

**尝试过的解决方案**：

1. ❌ 直接升级到 ESLint 10 — `next lint` 完全无法运行
2. ❌ 降级到 ESLint 9 — 同样的 API 不兼容问题
3. ✅ 保持 ESLint 8 但升级所有插件到最新 ESLint 8 兼容版

**解除条件**：

- 升级 Next.js 到 **15+**（Next.js 15 内建 ESLint 9 flat config 支持）
- 这又依赖 React 19（见 5.7/5.8）

**相关项目**：5.17 (`eslint-config-next`)

---

### 🔴 5.7 React 18 → 19 + 5.8 Next.js 14 → 16

**当前版本**：`react@18.3.1` / `next@14.2.35`
**目标版本**：`react@19.x` / `next@16.x`

**阻碍原因**：

这是整个项目最大的升级项目，涉及多个互相依赖的生态系统变更：

1. **React 19 Breaking Changes**：
   - `forwardRef` 被弃用 → 需要重写所有使用 `forwardRef` 的组件
   - `useEffect` 清理函数行为变更 → 需要审查所有 useEffect
   - 移除了旧版 Context API
   - `React.FC` 类型不再自动包含 `children` prop

2. **Next.js 16 依赖 React 19**：
   - 不能单独升级 Next.js，必须先迁移 React 19
   - App Router API 有变更
   - 需要同时升级 `@types/react` (5.24) 和 `@types/react-dom` (5.34)

3. **连锁影响**：
   - `@headlessui/react` 需要 React 19 兼容版本
   - `framer-motion` 需要验证 React 19 兼容性
   - `swiper` 可能也需要同步升级
   - 项目有 199KB 的 `admin/page.tsx`，变更范围巨大

**解除条件**：

- 需要一个专门的迁移分支
- 建议等生态系统稳定后（主要库都发布 React 19 兼容版本）再进行
- 估计工时：1-2 天

**相关项目**：5.24 (`@types/react`), 5.34 (`@types/react-dom`)

---

### 🔴 5.9 Zod 3 → 4

**当前版本**：`zod@3.25.76`
**目标版本**：`zod@4.x`

**阻碍原因**：

Zod 4 是完全重写：

1. **API 变更**：`.transform()`、`.refine()`、`.preprocess()` 等方法签名有变化
2. **性能重写**：内部实现完全重构
3. **当前使用不充分**：项目已安装 `zod` 但实际使用很少，升级收益不大
4. **风险/收益比差**：API 变化大但目前用得少

**解除条件**：

- 等 Phase 6.14（在 API Route 中广泛使用 Zod 做验证）完成后再升级
- 或等 Zod 4 生态更成熟（Migration guide 完善后）

---

### 🔴 5.10 Tailwind CSS 3 → 4

**当前版本**：`tailwindcss@3.4.19`
**目标版本**：`tailwindcss@4.x`

**阻碍原因**：

Tailwind 4 是完全的架构重设计：

1. **配置方式完全改变**：不再使用 `tailwind.config.js`，改为 CSS-first 配置
2. **PostCSS 集成方式改变**：插件使用方式不同
3. **Class 名称变更**：部分 utility class 有 breaking changes
4. **插件生态**：`@tailwindcss/forms`、`prettier-plugin-tailwindcss` 等插件需全部更新
5. **项目影响巨大**：整个项目使用 Tailwind，每个 `.tsx` 文件都可能受影响

**解除条件**：

- 需要专门的迁移分支
- 建议使用 `@tailwindcss/upgrade` 官方迁移工具
- 估计工时：2-3 天

**相关项目**：5.22 (`tailwind-merge` 2 → 3), 5.33 (`@tailwindcss/forms`)

---

### 🟡 5.11 Swiper 11 → 12

**当前版本**：`swiper@11.2.10`
**目标版本**：`swiper@12.x`

**阻碍原因**：

- Swiper 12 是主版本升级，可能有 API 变更
- 需要测试所有使用 Swiper 的组件（轮播图等）
- 低优先级，当前版本没有已知问题

**解除条件**：

- 测试现有滑动/轮播功能
- 估计工时：0.5 天

---

### 🟡 5.22 tailwind-merge 2 → 3

**当前版本**：`tailwind-merge@2.6.1`
**目标版本**：`tailwind-merge@3.x`

**阻碍原因**：

- 与 Tailwind CSS 4 迁移绑定，如果升级到 TWM 3 但仍使用 Tailwind 3，可能会有 class 合并不正确的问题
- 建议与 Tailwind 4 一起升级

**解除条件**：

- 等 Tailwind 4 迁移完成后一起处理

---

### 🟡 5.40 替换 next-pwa

**当前**：`next-pwa`（已停止维护）
**目标**：`@serwist/next` 或 `@ducanh2912/next-pwa`

**阻碍原因**：

- 当前 PWA 功能运作正常
- 替换需要研究和测试 Service Worker 注册、离线缓存策略、Manifest 生成等
- 两个替代方案都需要评估：
  - `@serwist/next`：更现代，但迁移成本较高
  - `@ducanh2912/next-pwa`：`next-pwa` 的直接 fork，迁移成本最低
- 低优先级，等出现兼容性问题再处理

**解除条件**：

- 当 `next-pwa` 出现与 Next.js 或 Node.js 不兼容的问题时
- 估计工时：1 天

---

## 阶段六：可选优化 — 尚未执行的原因

### 6.1-6.3 代码重构（拆分 db.client.ts / 统一类型 / 提取辅助函数）

**阻碍类型**：⏳ 工时密集型（非技术阻碍）

- `db.client.ts` 有 1659 行代码，拆分需要仔细规划模块边界
- 类型统一需要全面梳理所有使用点
- 辅助函数提取是小改动但优先级低
- **无技术阻碍**，纯粹是工时投入 vs 收益的取舍

### 6.5-6.6 类型安全 + ESLint Disable 清理

**阻碍类型**：⏳ 工时密集型（非技术阻碍）

- `as any` 遍布项目，需要逐个文件分析正确的类型
- `eslint-disable` 注释背后往往是需要修复的代码问题
- 需要建立 `IStorage` 接口的完整定义
- **无技术阻碍**，但需要仔细的代码审查和测试

### 6.7-6.9 Redis 性能优化 — ✅ 已完成

已将 `getAllPlayRecords`/`getAllFavorites` 的 N+1 查询改为 `MGET` 批量获取，
`addSearchHistory` 的 3 次操作改为 Pipeline 合并。

### 6.10 crypto-js → Web Crypto API

**阻碍类型**：⚠️ 数据兼容性风险

- `crypto-js` 的 AES passphrase 模式使用了**专有的 Key 派生方式**（OpenSSL EVP_BytesToKey）
- Web Crypto API 的 AES 不兼容此格式
- 如果替换，**所有已加密的数据都会无法解密**
- 除非同时编写数据迁移工具，否则不建议替换
- **结论**：保留 `crypto-js`，或在有加密数据迁移计划时再处理

### 6.13-6.18 DX 改进 + OpenAPI 文档

**阻碍类型**：🎯 功能性需求（低优先级）

- `.env.example` 可以随时创建
- Zod 验证 (6.14) 和 OpenAPI 文档 (6.16-6.18) 是功能增强
- **无技术阻碍**，纯粹是优先级排序

---

## 阶段七：实时监控面板 — ✅ 已完成

### 7.3-7.5 前端面板

**完成情况**：

- 后端 API 已完成：`/api/admin/monitor`、`/api/admin/monitor/health`
- 前端面板已完成：管理员后台「系统监控」标签页、实时趋势图、10 秒轮询（最多 60 条）
- 权限控制已补齐：仅 owner/admin 可访问监控 API
- 当前无阻碍，后续仅保留体验类优化空间（例如图表细化、告警规则）

---

## 阶段八：代码审查新增问题（2026-02-14）

> 说明：本阶段用于记录最新 Code Review 发现，优先处理低风险高收益项。

### ✅ 已落地（快速修复）

- Upstash `deleteUser`：3 次 KEYS 扫描合并为单次用户命名空间匹配删除
- Upstash `getAllUsers`：新增用户索引集合，优先走 `SMEMBERS`，仅旧数据回退 `KEYS`
- 数据迁移导入 API：移除 `(db as any).storage`，改用 `DbManager` 公开方法

### ⏳ 待处理（后续）

| 优先级 | 项目                              | 说明                                 |
| ------ | --------------------------------- | ------------------------------------ |
| 高     | 拆分 `src/app/admin/page.tsx`     | 当前 5476 行，维护成本高             |
| 高     | 拆分 `src/lib/db.client.ts`       | 当前 1643 行，职责过重               |
| 中     | `RUNTIME_CONFIG` 类型化与集中访问 | 减少 `(window as any)` 分散写法      |
| 中     | 缩小大范围 eslint-disable         | 从整档禁用改为按行精准禁用           |
| 低     | 优化 `JSON.stringify` 深比较      | 降低大对象比较开销并提升可读性       |
| 低     | 合并 `handleDragEnd` 重复逻辑     | `admin/page.tsx` 有 3 处近似实现     |
| 低     | 抽象 `CustomHlsJsLoader` 共用层   | `play/live` 两处结构相似，可评估共用 |

---

## 📊 阻碍类型汇总

| 阻碍类型                      | 项数 | 说明                                                |
| ----------------------------- | :--: | --------------------------------------------------- |
| 🔴 技术依赖链（需等上游升级） |  8   | React/Next.js/Tailwind 三件套 + ESLint + 关联类型包 |
| 🟡 可执行但低优先级           |  3   | Swiper 12, tailwind-merge 3, next-pwa 替换          |
| ⏳ 工时密集型（无技术阻碍）   |  8   | 代码重构、类型安全、性能优化                        |
| 🎯 功能需求（待开发）         |  6   | DX 改进、OpenAPI 等增强项                           |

### 技术依赖链图

```
React 19 (5.7)          Tailwind 4 (5.10)
    ↓                       ↓
Next.js 16 (5.8)        tailwind-merge 3 (5.22)
    ↓
ESLint 9 Flat Config (5.2)
    ↓
eslint-config-next (5.17)

@types/react (5.24) ← React 19
@types/react-dom (5.34) ← React 19
```

> **结论**：React 19 迁移 是解锁最多下游项目的关键路径。建议在生态稳定后，优先在独立分支执行 React 19 + Next.js 16 迁移。
