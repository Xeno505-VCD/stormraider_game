# stormraider_game 部署与账号方案

## 1. MVP 推荐部署拓扑
```text
GitHub Repository
  -> GitHub Actions build
  -> Cloudflare Pages hosts frontend
```

MVP 不启用 Render、Cloudflare Workers、KV/D1。游戏是静态前端，个人记录写入浏览器本地 IndexedDB。

## 2. 免费额度友好策略
- 前端静态资源交给 Cloudflare Pages。
- 资源加版本号并强缓存，例如 `/assets/v1/player.glb`。
- `index.html` 不强缓存，避免更新后用户卡旧版本。
- 不需要 API 请求。
- 大文件不放 Render，MVP 不使用 Render。

## 3. 后端功能分级
P0 当前实施：
- GitHub 仓库。
- Cloudflare Pages 静态部署。
- 本地 IndexedDB 存档：上一局记录、历史最高记录。

P1 未来可选，需要 Cloudflare 账号并启用 Workers/KV/D1：
- 远程配置下发。
- 每日挑战种子。
- 个人历史云备份。

P2 暂不需要，需要 Render 或额外后端：
- 公共排行榜。
- 管理后台。
- 更复杂的反作弊校验。

## 4. 需要你决定或注册的内容
1. 需要你提供或操作 GitHub 仓库创建与 Cloudflare Pages 连接。
2. 如果没有域名，可以先使用 Cloudflare Pages 的免费子域名。
3. 不需要注册 Render。
4. 不需要启用公共排行榜。

## 5. GitHub Actions 建议
```yaml
name: build
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run build
```

Cloudflare Pages 可直接连接 GitHub 仓库，构建命令 `npm run build`，输出目录 `dist`。
Node 版本固定为 22，项目根目录 `.node-version` 与 GitHub Actions 保持一致。

## 6. 静态资源与缓存头
项目使用 `public/_headers`，Cloudflare Pages 构建后会复制为 `dist/_headers`。

- `index.html`: `Cache-Control: no-cache`，确保版本更新后尽快刷新入口。
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`，适配 Vite hash 文件名。
- `/config/*`: `Cache-Control: public, max-age=300`，方便未来调关卡配置。
- 全站默认安全头：`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`。
