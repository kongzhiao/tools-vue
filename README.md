- # 环境配置设置完成

  ## 已完成的工作

  ### 1. 配置文件创建
  - ✅ `src/config/index.ts` - 主配置文件，包含环境检测和配置加载逻辑
  - ✅ `src/config/constants.ts` - 应用常量配置
  - ✅ `src/config/api.ts` - API配置和端点定义
  - ✅ `src/config/test.ts` - 配置测试文件

  ### 2. 环境配置支持

  - ✅ 开发环境 (development): `http://localhost:9501`
  - ✅ 测试环境 (test): `http://test-api.example.com`
  - ✅ 生产环境 (production): `https://api.example.com`

  ### 3. 自动环境检测
  - ✅ 优先使用环境变量 `NODE_ENV`
  - ✅ 根据域名自动判断环境
  - ✅ 默认回退到开发环境

  ### 4. 构建脚本更新
  - ✅ 添加了 `cross-env` 依赖
  - ✅ 支持不同环境的启动和构建命令

  ### 5. 服务层更新
  - ✅ 更新了 `insuranceData.ts` 服务文件
  - ✅ 更新了 `dashboard.ts` 服务文件
  - ✅ 使用统一的API端点配置

  ## 使用方法

  ### 启动不同环境
  新安装执行 npm install

  ```bash
  # 开发环境（默认）
  npm run dev
  npm start
  
  # 测试环境
  npm run dev:test
  npm run start:test
  
  # 生产环境
  npm run dev:prod
  npm run start:prod
  ```

  ### 构建不同环境

  ```bash
  # 开发环境构建
  npm run build
  
  # 测试环境构建
  npm run build:test
  
  # 生产环境构建
  npm run build:prod
  ```

  ### 发布与浏览器缓存

  - 构建已启用内容哈希，入口和页面分包的 JS/CSS 文件名会随内容变化，避免发布后同名文件的新旧版本混用。
  - 每次构建生成北京时间版本号，格式为`YYMMDDHHmmss`，例如`261023235901`。同一包的入口HTML和`dist/version.json`使用同一版本号。
  - 访问地址自动补充`?r=版本号`，保留原筛选参数和锚点；版本号在构建时生成，同一版本内不随访问变化。开发服务器不添加此参数。
  - 已打开的页面每60秒及重新获得焦点时检查静态版本文件；发现更新后提示用户保存内容并点击“刷新到新版本”，不自动刷新正在编辑的页面。
  - 生产发布必须上传同一次 `npm run build:prod` 生成的完整 `dist/`，先上传资源文件，再更新 `index.html`，最后更新 `version.json`。
  - 站点的入口 HTML（包含各业务路由返回的 HTML）应设置 `Cache-Control: no-cache`，如有 CDN，也需同步配置；带内容哈希的静态资源可长期缓存。
  - `/version.json`应设置`Cache-Control: no-store`，版本检查同时使用禁用缓存的请求和时间参数；该文件应作为静态文件返回JSON。
  - 发布时保留上一版本的静态资源一段时间，供尚未刷新的页面继续加载；不要只替换部分 JS 文件，或在上传过程中先删除仍在使用的分包。
  - 从旧的固定文件名版本升级时，发布后清除旧入口和同名资源的 CDN 缓存，并提醒已打开页面的用户强制刷新一次。

  ### 环境变量设置

  ```bash
  # Linux/Mac
  export NODE_ENV=test
  npm run dev
  
  # Windows
  set NODE_ENV=test
  npm run dev
  ```

  ## 配置结构

  ```
  src/config/
  ├── index.ts          # 主配置文件
  ├── constants.ts      # 应用常量
  ├── api.ts           # API配置
  └── test.ts          # 配置测试
  ```

  ## 注意事项

  1. **环境变量优先级最高** - 会覆盖自动检测结果
  2. **开发环境默认启用Mock** - 便于本地开发
  3. **生产环境禁用Mock** - 确保数据真实性
  4. **API超时时间** - 根据环境网络状况调整

  ## 下一步工作

  1. 更新其他服务文件以使用新的配置系统
  2. 添加环境特定的功能开关
  3. 实现配置热重载
  4. 添加配置验证和错误处理

  ## 故障排除

  如果遇到问题，请检查：
  1. 环境变量设置是否正确
  2. 配置文件语法是否正确
  3. 依赖是否已正确安装
  4. 重启开发服务器

  ## 测试配置

  运行配置测试文件来验证配置是否正确：

  ```typescript
  import { testConfig } from '@/config/test';
  console.log(testConfig);
  ```


## 权限
.umirc.ts         节点
src\access.ts     节点权限
