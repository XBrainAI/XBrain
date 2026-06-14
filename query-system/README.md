# 构建运行文档

## 场景一：日常开发调试

```bash
npm install    # 首次或依赖变更时执行
npm run dev    # 启动开发服务器 http://localhost:5173/
```

- 支持热更新，改代码自动刷新
- 不生成 dist，仅用于开发

## 场景二：验证构建产物（本地模拟线上环境）

```bash
npm run build     # 构建生成 dist/
npm run preview   # 预览 dist/，确认构建结果正确
```

- 用于发布前验证，例如检查 fetch 路径、静态资源是否正常
- `preview` 必须先执行 `build`

## 场景三：提交代码前检查

```bash
npm run lint   # 代码规范检查
npm run test   # 运行单元测试
```

## 场景四：推送到远程（Netlify 自动部署）

```bash
# 只需 push 代码，Netlify 会自动执行 npm run build 并部署
git push
```

- 无需本地构建，dist 不纳入版本控制

## 命令速查

| 命令 | 场景 | 生成 dist |
|------|------|-----------|
| `npm install` | 安装/更新依赖 | 否 |
| `npm run dev` | 日常开发 | 否 |
| `npm run build` | 构建产物 / 发布前验证 | 是 |
| `npm run preview` | 预览已构建的 dist | 否 |
| `npm run test` | 提交前检查 | 否 |
| `npm run lint` | 提交前检查 | 否 |
