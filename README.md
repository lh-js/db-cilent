# Neurix DB Client

一个基于 Electron 的数据库连接可视化工具，支持 MySQL、PostgreSQL、SQLite 和 Redis。

## 功能特性

- ✅ 数据库连接管理（MySQL、PostgreSQL、SQLite、Redis）
- ✅ 连接测试功能
- ✅ 数据库和表浏览
- ✅ Redis Key 浏览和数据查看
- ✅ SQL 查询编辑器
- ✅ 查询结果展示（支持分页）
- ✅ 结果导出为 CSV
- ✅ 现代化的暗色主题 UI
- ✅ 启动加载动画

## 开发环境设置

### 1. 安装依赖

```bash
npm install
```

> ⚠️ **注意**：请使用 npm 或 yarn 作为包管理器，**不推荐使用 pnpm**。
> 
> 原因：pnpm 使用符号链接来管理依赖，这与 electron-builder 的打包机制不完全兼容，可能导致：
> - 打包后的应用缺少某些依赖模块
> - 原生模块（如 mysql2、ioredis）无法正确打包
> - Windows 平台上出现模块找不到的错误

### 2. 开发模式运行

```bash
npm run dev
```

这将同时启动：
- TypeScript 编译器（监听主进程代码）
- Vite 开发服务器（渲染进程）
- Electron 应用

## 构建应用

### 构建所有文件

```bash
npm run build
```

这会编译：
- 主进程代码（TypeScript → JavaScript）
- 渲染进程代码（React + Vite 打包）

### 启动已构建的应用

```bash
npm start
```

## 打包应用

### 打包 Mac 应用

```bash
npm run dist:mac
```

这会在 `release` 目录下生成：
- `Neurix DB Client-1.0.0.dmg` - Mac 安装包
- `Neurix DB Client-1.0.0-mac.zip` - 压缩包

### 打包 Windows 应用

```bash
npm run dist:win
```

这会在 `release` 目录下生成：
- `Neurix DB Client Setup 1.0.0.exe` - Windows 安装程序（NSIS）
- `Neurix DB Client 1.0.0.exe` - Windows 便携版

> **Windows 打包注意事项**：
> - 在 macOS 上打包 Windows 应用需要安装 Wine（可选，用于测试）
> - 建议在 Windows 机器上进行 Windows 打包以获得最佳兼容性
> - 如果在虚拟机中运行打包后的应用，请将应用复制到本地磁盘（如 `C:\`）运行，不要从共享文件夹运行

### 打包所有平台

```bash
npm run dist
```

### 只打包目录（不生成安装包）

```bash
npm run pack
```

这会在 `release` 目录下生成应用目录，可以直接运行。

## 打包配置说明

打包配置在 `package.json` 的 `build` 字段中。

### 自定义图标

应用图标位于 `build/` 目录：
- `icon.png` - 原始 PNG 图标（用于 Linux）
- `icon.icns` - macOS 图标
- `icon.ico` - Windows 图标

如需更换图标：
1. 准备一个 PNG 格式的图标（建议 512x512 或更大）
2. 将其重命名为 `icon.png` 放到 `build/` 目录
3. 使用 png2icons 生成其他格式：
   ```bash
   npx png2icons build/icon.png build/icon -allp
   ```
4. 重新打包

## 使用说明

### 创建数据库连接

1. 点击左侧边栏的 "+ 新建连接" 按钮
2. 填写连接信息：
   - 连接名称（可选）
   - 数据库类型（MySQL/PostgreSQL/SQLite/Redis）
   - 主机地址
   - 端口（MySQL: 3306, PostgreSQL: 5432, Redis: 6379）
   - 用户名（Redis 不需要）
   - 密码
   - 数据库名（可选，Redis 为数据库索引 0-15）
3. 点击 "测试连接" 验证连接信息
4. 点击 "连接" 建立连接

### Redis 使用

1. 创建 Redis 连接后，可以浏览所有 Key
2. 支持通配符搜索（如 `user:*`）
3. 可以切换数据库（db0 - db15）
4. 点击 Key 查看数据，支持 string、list、set、zset、hash 类型

### 执行 SQL 查询

1. 在左侧选择数据库
2. 在右侧 SQL 编辑器中输入查询语句
3. 按 `⌘ + Enter`（Mac）或 `Ctrl + Enter`（Windows/Linux）执行查询
4. 查看结果表格
5. 可以点击 "导出 CSV" 导出查询结果

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **React** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 快速构建工具
- **mysql2** - MySQL 数据库驱动
- **ioredis** - Redis 客户端
- **electron-builder** - 应用打包工具

## 项目结构

```
neurix-db-client/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── main.ts        # 主进程入口
│   │   ├── preload.ts     # 预加载脚本
│   │   └── database/      # 数据库管理
│   └── renderer/          # 渲染进程（React）
│       ├── components/    # React 组件
│       ├── styles/        # 样式文件
│       └── main.tsx       # React 入口
├── dist/                  # 构建输出
├── release/               # 打包输出
└── package.json
```

## 注意事项

- 首次打包可能需要较长时间，因为需要下载 Electron 二进制文件
- 如果遇到权限问题，可能需要授予终端相关权限
- DMG 文件可以直接分发给其他 Mac 用户使用

## 故障排除

### 打包失败

如果遇到打包错误，尝试：

1. 清理缓存：
```bash
rm -rf node_modules dist release
npm install
```

2. 检查 electron-builder 版本：
```bash
npm list electron-builder
```

3. 查看详细错误信息：
```bash
npm run dist:mac -- --debug
```

### 连接数据库失败

- 确保数据库服务正在运行
- 检查防火墙设置
- 验证用户名和密码
- 确认数据库允许远程连接（如适用）

### Windows 应用闪退

1. **GPU 相关错误**：应用已内置 GPU 兼容性处理，如果仍有问题，请确保显卡驱动是最新版本

2. **虚拟机环境**：如果在虚拟机（如 Parallels、VMware）中运行，请将应用复制到 Windows 本地磁盘运行，不要从共享文件夹运行

3. **查看错误日志**：在命令行中运行应用查看详细错误：
   ```powershell
   & ".\Neurix DB Client.exe"
   ```

### 模块找不到错误

如果出现类似 `Cannot find module 'xxx'` 的错误：

1. 确保使用 npm 而不是 pnpm 安装依赖
2. 删除 `node_modules` 后重新安装：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. 重新打包应用

## 许可证

MIT

## 提交类型 (type)
- feat: 新功能
- fix: 修复 bug
- docs: 文档变更
- style: 代码风格（不影响代码逻辑）
- refactor: 重构代码（非功能或 bug 修复）
- perf: 性能优化
- test: 添加或修改测试
- chore: 构建过程或辅助工具的变动
- build: 构建系统或外部依赖的变更
- ci: 持续集成配置的变更
- revert: 回滚之前的提交
