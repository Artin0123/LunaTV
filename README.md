# LunaTV

<div align="center">
  <img src="public/logo.png" alt="LunaTV Logo" width="120">
</div>

> 🎬 **LunaTV** 是一个开箱即用的、跨平台的影视聚合播放器。它基于 **Next.js 14** + **Tailwind&nbsp;CSS 3** + **TypeScript 5** 构建，支持多资源搜索、在线播放、收藏同步、播放记录、云端存储，让你可以随时随地畅享海量免费影视内容。

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-000?logo=nextdotjs)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

---

## ✨ 功能特性

- 🔍 **多源聚合搜索**：一次搜索立刻返回全源结果。
- 📄 **丰富详情页**：支持剧集列表、演员、年份、简介等完整信息展示。
- ▶️ **流畅在线播放**：集成 HLS.js & ArtPlayer。
- ❤️ **收藏 + 继续观看**：支持 Upstash 云端存储，多端同步进度。
- 📱 **PWA**：离线缓存、安装到桌面/主屏，移动端原生体验。
- 🌗 **响应式布局**：桌面侧边栏 + 移动底部导航，自适应各种屏幕尺寸。
- 👿 **智能去广告**：自动跳过视频中的切片广告（实验性）。
- 🔐 **安全认证**：bcrypt 密码哈希 + HMAC-SHA256 签名 + `auth` HttpOnly Cookie（客户端展示信息使用 `auth_client`）。
- 📊 **系统监控**：内建监控 API（仅 owner/admin 可访问），实时查看内存、Redis 延迟、健康状态。

### 注意：部署后项目为空壳项目，无内置播放源和直播源，需要自行收集

<details>
  <summary>点击查看项目截图</summary>
  <img src="public/screenshot1.png" alt="项目截图" style="max-width:600px">
  <img src="public/screenshot2.png" alt="项目截图" style="max-width:600px">
  <img src="public/screenshot3.png" alt="项目截图" style="max-width:600px">
</details>

## 🗺 目录

- [技术栈](#技术栈)
- [部署](#部署)
- [配置文件](#配置文件)
- [订阅](#订阅)
- [环境变量](#环境变量)
- [客户端](#客户端)
- [AndroidTV 使用](#AndroidTV-使用)
- [安全与隐私提醒](#安全与隐私提醒)
- [License](#license)
- [致谢](#致谢)

## 技术栈

| 分类      | 主要依赖                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------- |
| 前端框架  | [Next.js 14](https://nextjs.org/) · App Router                                                        |
| UI & 样式 | [Tailwind&nbsp;CSS 3](https://tailwindcss.com/) + Headless UI                                         |
| 语言      | TypeScript 5                                                                                          |
| 播放器    | [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) · [HLS.js](https://github.com/video-dev/hls.js/) |
| 代码质量  | ESLint 8 · Prettier 3 · Jest 30 · Husky 9 · Commitlint 20                                             |
| 部署      | Serverless (Vercel)                                                                                   |
| 数据库    | [Upstash Redis](https://upstash.com/) (HTTP)                                                          |

## 部署

本项目使用 **Serverless 平台部署**。推荐使用 Vercel。

### Vercel 一键部署

1. Fork 本仓库到你的 GitHub 账号
2. 在 [Vercel](https://vercel.com) 中导入该仓库
3. 配置环境变量（见[环境变量](#环境变量)章节）
4. 点击 Deploy

### Upstash 数据库配置

1. 在 [Upstash](https://upstash.com/) 注册账号并新建一个 Redis 实例
2. 复制 **HTTPS ENDPOINT** 和 **TOKEN**
3. 在 Vercel 环境变量中配置：
   ```env
   NEXT_PUBLIC_STORAGE_TYPE=upstash
   UPSTASH_URL=https://xxx.upstash.io
   UPSTASH_TOKEN=AXxxxxxxxxxxxx
   ```

## 配置文件

完成部署后为空壳应用，无播放源，需要站长在管理后台的配置文件设置中填写配置文件（后续会支持订阅）

配置文件示例如下：

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzy": {
      "api": "http://xxx.com/api.php/provide/vod",
      "name": "示例资源",
      "detail": "http://xxx.com"
    }
  },
  "custom_category": [
    {
      "name": "华语",
      "type": "movie",
      "query": "华语"
    }
  ]
}
```

- `cache_time`：接口缓存时间（秒）。
- `api_site`：你可以增删或替换任何资源站，字段说明：
  - `key`：唯一标识，保持小写字母/数字。
  - `api`：资源站提供的 `vod` JSON API 根地址。
  - `name`：在人机界面中展示的名称。
  - `detail`：（可选）部分无法通过 API 获取剧集详情的站点，需要提供网页详情根 URL，用于爬取。
- `custom_category`：自定义分类配置。支持以下字段：
  - `name`：分类显示名称（可选，如不提供则使用 query 作为显示名）
  - `type`：分类类型，支持 `movie`（电影）或 `tv`（电视剧）
  - `query`：搜索关键词

LunaTV 支持标准的苹果 CMS V10 API 格式。

## 订阅

将配置文件（明文 JSON 或 base58 编码 JSON）通过 http 提供即可作为订阅链接，可在 LunaTV 后台/Helios 中使用。

## OpenAPI 与类型生成

- OpenAPI JSON：`/api/docs/openapi`
- Swagger UI：`/api/docs`
- 自动生成 OpenAPI JSON：`pnpm gen:openapi:json`
- 自动生成 TypeScript 类型：`pnpm gen:openapi:types`（输出到 `src/types/openapi.d.ts`）

## 环境变量

| 变量                                | 说明                     | 可选值                        | 默认值               |
| ----------------------------------- | ------------------------ | ----------------------------- | -------------------- |
| USERNAME                            | 站长账号                 | 任意字符串                    | 无默认，必填字段     |
| PASSWORD                            | 站长密码                 | 任意字符串                    | 无默认，必填字段     |
| SITE_BASE                           | 站点 URL                 | 形如 https://example.com      | 空                   |
| NEXT_PUBLIC_SITE_NAME               | 站点名称                 | 任意字符串                    | LunaTV               |
| ANNOUNCEMENT                        | 站点公告                 | 任意字符串                    | 默认免责声明         |
| NEXT_PUBLIC_STORAGE_TYPE            | 存储类型                 | upstash、localstorage、memory | 无默认，必填字段     |
| UPSTASH_URL                         | Upstash Redis HTTPS 端点 | 连接 URL                      | 空                   |
| UPSTASH_TOKEN                       | Upstash Redis 令牌       | 连接 token                    | 空                   |
| CRON_SECRET                         | Cron 任务认证密钥        | 任意字符串                    | 空（不设置则不认证） |
| NEXT_PUBLIC_SEARCH_MAX_PAGE         | 搜索最大页数             | 1-50                          | 5                    |
| NEXT_PUBLIC_DOUBAN_PROXY_TYPE       | 豆瓣数据源请求方式       | 见下方                        | direct               |
| NEXT_PUBLIC_DOUBAN_PROXY            | 自定义豆瓣数据代理 URL   | url prefix                    | 空                   |
| NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE | 豆瓣图片代理类型         | 见下方                        | direct               |
| NEXT_PUBLIC_DOUBAN_IMAGE_PROXY      | 自定义豆瓣图片代理 URL   | url prefix                    | 空                   |
| NEXT_PUBLIC_DISABLE_YELLOW_FILTER   | 关闭色情内容过滤         | true/false                    | false                |
| NEXT_PUBLIC_FLUID_SEARCH            | 是否开启搜索流式输出     | true/false                    | true                 |

`NEXT_PUBLIC_STORAGE_TYPE` 说明：

- `upstash`：云端 Redis 持久化，适合生产环境。
- `localstorage`：数据保存在浏览器本地，仅适合单机测试。
- `memory`：数据保存在服务进程内存，重启服务后应用数据会清空；浏览器登录 cookie 仍按有效期保留，可通过登出或清除 cookie 立即重置登录态。

NEXT_PUBLIC_DOUBAN_PROXY_TYPE 选项：

- `direct`: 由服务器直接请求豆瓣源站
- `cors-proxy-zwei`: 浏览器向 cors proxy 请求，该代理由 [Zwei](https://github.com/bestzwei) 搭建
- `cmliussss-cdn-tencent`: CDN 由 [CMLiussss](https://github.com/cmliu) 搭建，腾讯云加速
- `cmliussss-cdn-ali`: CDN 由 [CMLiussss](https://github.com/cmliu) 搭建，阿里云加速
- `custom`: 自定义代理，由 `NEXT_PUBLIC_DOUBAN_PROXY` 定义

NEXT_PUBLIC_DOUBAN_IMAGE_PROXY_TYPE 选项：

- `direct`：直接请求豆瓣默认图片域名
- `server`：由服务器代理请求
- `img3`：豆瓣官方精品 CDN（阿里云）
- `cmliussss-cdn-tencent`：CMLiussss CDN，腾讯云加速
- `cmliussss-cdn-ali`：CMLiussss CDN，阿里云加速
- `custom`: 自定义代理

## 客户端

v100.0.0 以上版本可配合 [Selene](https://github.com/MoonTechLab/Selene) 使用，移动端体验更加友好，数据完全同步

## AndroidTV 使用

目前该项目可以配合 [OrionTV](https://github.com/zimplexing/OrionTV) 在 Android TV 上使用，可以直接作为 OrionTV 后端

已实现播放记录和网页端同步

## 安全与隐私提醒

### 部署要求

1. **设置环境变量 `PASSWORD`**：为您的实例设置一个强密码
2. **仅供个人使用**：请勿将您的实例链接公开分享或传播
3. **遵守当地法律**：请确保您的使用行为符合当地法律法规

## License

[MIT](LICENSE) © 2025 LunaTV & Contributors

## 致谢

- [ts-nextjs-tailwind-starter](https://github.com/theodorusclarence/ts-nextjs-tailwind-starter) — 项目最初基于该脚手架。
- [LibreTV](https://github.com/LibreSpark/LibreTV) — 由此启发，站在巨人的肩膀上。
- [ArtPlayer](https://github.com/zhw2590582/ArtPlayer) — 提供强大的网页视频播放器。
- [HLS.js](https://github.com/video-dev/hls.js) — 实现 HLS 流媒体在浏览器中的播放支持。
- [Zwei](https://github.com/bestzwei) — 提供获取豆瓣数据的 cors proxy
- [CMLiussss](https://github.com/cmliu) — 提供豆瓣 CDN 服务
- 感谢所有提供免费影视接口的站点。
