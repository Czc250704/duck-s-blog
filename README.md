# 🍊 橘光博客 · 纯静态文档预览站

基于 Tailwind CSS + 橘色主题，完全静态，支持 .md / .pptx / .docx 只读预览。

## 快速开始

1. 下载本仓库。
2. 将你的 `.md` / `.pptx` / `.docx` 文件放入 `/uploads/` 文件夹。
3. 编辑 `/data/files.json`，按照示例格式添加每个文件的标题、文件名、类型、日期、描述、分类。
4. 下载 `marked.min.js` 放入 `/assets/libs/`（[点击下载](https://cdn.jsdelivr.net/npm/marked/marked.min.js)）。
5. 部署到任意静态服务器（GitHub Pages、Vercel 等）。

## 功能

- 📝 **Markdown 预览**：渲染为仿 DeepSeek 风格，代码高亮、表格、引用。
