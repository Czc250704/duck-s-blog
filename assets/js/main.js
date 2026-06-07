// ==================== 全局变量 ====================
let allDocs = [];

// ==================== 加载并渲染文档列表 ====================
fetch('data/files.json')
    .then(res => res.json())
    .then(files => {
        allDocs = files;
        renderDocs(allDocs);
        renderSidebar(allDocs);
        bindSearch();
    })
    .catch(err => {
        document.getElementById('docsList').innerHTML = `<div class="bg-white rounded-2xl border border-orange-100 p-6 text-red-500">⚠️ 无法加载 files.json，请检查文件是否存在。</div>`;
        console.error(err);
    });

// 渲染卡片列表
function renderDocs(docs) {
    const container = document.getElementById('docsList');
    if (!docs.length) {
        container.innerHTML = `<div class="bg-white rounded-2xl border border-orange-100 p-6 text-center text-stone-500">暂无文档，请将文件放入 uploads/ 并修改 data/files.json</div>`;
        return;
    }
    container.innerHTML = docs.map((doc, index) => `
        <div class="bg-white rounded-2xl border border-orange-100 p-6 mb-6 transition card-hover animate-fadeInUp" style="animation-delay: ${index * 0.05}s;">
            <h2 class="text-xl font-bold text-stone-800 mb-1">${escapeHtml(doc.title)}</h2>
            <div class="flex gap-4 text-sm text-stone-500 mb-3">
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#icon-calendar"/></svg> ${doc.date}</span>
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#icon-file"/></svg> ${doc.type.toUpperCase()}</span>
            </div>
            <p class="text-stone-600 mb-4">${escapeHtml(doc.description)}</p>
            <button class="preview-btn bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium py-2 px-5 rounded-full border border-orange-200 transition btn-pulse flex items-center gap-2" data-filename="${doc.filename}" data-type="${doc.type}">
                <svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#icon-eye"/></svg>
                预览
            </button>
        </div>
    `).join('');

    // 绑定预览按钮
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filename = btn.dataset.filename;
            const type = btn.dataset.type;
            previewFile(filename, type);
        });
    });
}

// 侧边栏：最新文章 & 分类统计
function renderSidebar(docs) {
    // 最新5篇
    const sorted = [...docs].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recentHtml = sorted.slice(0,5).map(doc => `
        <li class="flex justify-between text-stone-600">
            <span>${escapeHtml(doc.title)}</span>
            <span class="text-xs text-stone-400">${doc.date}</span>
        </li>
    `).join('');
    document.getElementById('recentList').innerHTML = recentHtml || '<li>暂无</li>';

    // 分类统计
    const catMap = new Map();
    docs.forEach(doc => {
        const cat = doc.category || '未分类';
        catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    const catHtml = Array.from(catMap.entries()).map(([cat, cnt]) => `
        <li class="flex justify-between text-stone-600">
            <span>${escapeHtml(cat)}</span>
            <span class="text-xs text-stone-400">${cnt}</span>
        </li>
    `).join('');
    document.getElementById('categoryList').innerHTML = catHtml || '<li>暂无分类</li>';
}

// ==================== 预览核心函数 ====================
function previewFile(filename, type) {
    const fileUrl = `uploads/${filename}`;
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');

    // 显示模态框
    modal.classList.add('flex');
    modal.classList.remove('hidden');

    // 重新触发弹出动画
    const modalContent = modal.querySelector('.bg-white');
    if (modalContent) {
        modalContent.classList.remove('modal-content');
        void modalContent.offsetWidth;
        modalContent.classList.add('modal-content');
    }

    container.innerHTML = '<div class="text-center text-stone-400 py-10">加载中...</div>';

    // 处理 Markdown 文件
    if (type === 'md') {
        const encodedUrl = encodeURI(fileUrl);
        fetch(encodedUrl)
            .then(res => {
                if (!res.ok) throw new Error('MD文件不存在');
                return res.text();
            })
            .then(mdText => {
                // 1. 使用 marked 将 Markdown 转为 HTML
                let html = marked.parse(mdText);
                container.innerHTML = html;

                // 2. 使用 KaTeX 渲染数学公式
                if (typeof katex !== 'undefined') {
                    renderMathInContainer(container);
                } else {
                    console.error('KaTeX 未加载！请检查 index.html 中是否正确引入 katex.min.js');
                    container.innerHTML += '<p class="text-red-500 mt-4">⚠️ KaTeX 未加载，公式将以源代码显示。</p>';
                }
            })
            .catch(err => {
                console.error('MD加载失败:', err);
                container.innerHTML = '<p class="text-orange-600">❌ MD 文件加载失败，请确认 uploads/ 下有该文件。</p>';
            });
    }
    // 处理 PPTX / DOCX 文件
    else if (type === 'pptx' || type === 'docx') {
        // 对完整路径进行编码，支持中文文件名
        const fullUrl = window.location.origin + '/' + encodeURI(fileUrl);
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
        container.innerHTML = `<iframe src="${officeUrl}" width="100%" height="650px" frameborder="0" class="rounded-xl"></iframe>`;
    }
    else {
        container.innerHTML = '<p>暂不支持此文件类型预览</p>';
    }
}

// ==================== 手动渲染数学公式（不依赖 auto-render） ====================
function renderMathInContainer(element) {
    if (typeof katex === 'undefined') {
        console.warn('KaTeX 未定义，无法渲染公式');
        return;
    }

    // 正则匹配行内公式 \( ... \) 和块级公式 \[ ... \]
    const inlineRegex = /\\\(([\s\S]+?)\\\)/g;
    const displayRegex = /\\\[([\s\S]+?)\\\]/g;

    // 递归遍历 DOM 树，替换文本节点中的公式
    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let hasMath = false;
            let newHtml = text;

            // 先处理块级公式（display mode）
            newHtml = newHtml.replace(displayRegex, (match, formula) => {
                hasMath = true;
                try {
                    return katex.renderToString(formula, { displayMode: true, throwOnError: false });
                } catch (e) {
                    console.warn('块级公式渲染失败:', formula, e);
                    return match;
                }
            });
            // 再处理行内公式（inline mode）
            newHtml = newHtml.replace(inlineRegex, (match, formula) => {
                hasMath = true;
                try {
                    return katex.renderToString(formula, { displayMode: false, throwOnError: false });
                } catch (e) {
                    console.warn('行内公式渲染失败:', formula, e);
                    return match;
                }
            });

            if (hasMath) {
                const span = document.createElement('span');
                span.innerHTML = newHtml;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.tagName)) {
            // 跳过脚本、样式、代码块，避免破坏已有结构
            Array.from(node.childNodes).forEach(walk);
        }
    }

    walk(element);
}

// ==================== 搜索功能（实时过滤） ====================
function bindSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const doSearch = () => {
        const keyword = searchInput.value.trim().toLowerCase();
        if (!keyword) {
            renderDocs(allDocs);
        } else {
            const filtered = allDocs.filter(doc =>
                doc.title.toLowerCase().includes(keyword) ||
                doc.description.toLowerCase().includes(keyword)
            );
            renderDocs(filtered);
        }
    };

    searchInput.addEventListener('input', doSearch);
}

// ==================== 模态框关闭逻辑 ====================
document.getElementById('closeModalBtn').onclick = () => {
    const modal = document.getElementById('previewModal');
    modal.classList.remove('flex');
    modal.classList.add('hidden');
    document.getElementById('previewContainer').innerHTML = '';
};
window.onclick = (e) => {
    const modal = document.getElementById('previewModal');
    if (e.target === modal) {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        document.getElementById('previewContainer').innerHTML = '';
    }
};

// ===================== 辅助函数 =====================
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}