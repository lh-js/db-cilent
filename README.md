# Neurix DB Client

一个基于 Electron 的数据库连接可视化工具，支持 MySQL、PostgreSQL 和 SQLite。

## 功能特性

- ✅ 数据库连接管理（MySQL、PostgreSQL、SQLite）
- ✅ 连接测试功能
- ✅ 数据库和表浏览
- ✅ SQL 查询编辑器
- ✅ 查询结果展示
- ✅ 结果导出为 CSV
- ✅ 现代化的暗色主题 UI

## 开发环境设置

### 1. 安装依赖

```bash
npm install
```

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

## 打包成 Mac 应用

### 方法 1: 打包成 DMG 和 ZIP（推荐）

```bash
npm run dist:mac
```

或者：

```bash
npm run dist
```

这会在 `release` 目录下生成：
- `Neurix DB Client-1.0.0.dmg` - Mac 安装包
- `Neurix DB Client-1.0.0-mac.zip` - 压缩包

### 方法 2: 只打包目录（不生成安装包）

```bash
npm run pack
```

这会在 `release/mac` 目录下生成应用包，可以直接运行。

## 打包配置说明

打包配置在 `package.json` 的 `build` 字段中：

```json
{
  "build": {
    "appId": "com.neurix.dbclient",
    "productName": "Neurix DB Client",
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": ["dmg", "zip"],
      "icon": "build/icon.icns"
    }
  }
}
```

### 自定义图标

1. 准备一个 `.icns` 格式的图标文件
2. 放在 `build/icon.icns`
3. 重新打包

如果没有图标文件，electron-builder 会使用默认图标。

## 使用说明

### 创建数据库连接

1. 点击左侧边栏的 "+ 新建连接" 按钮
2. 填写连接信息：
   - 连接名称（可选）
   - 数据库类型（MySQL/PostgreSQL/SQLite）
   - 主机地址
   - 端口
   - 用户名
   - 密码
   - 数据库名（可选）
3. 点击 "测试连接" 验证连接信息
4. 点击 "连接" 建立连接

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

## 许可证

MIT

