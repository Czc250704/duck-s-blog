/**
 * Duck's Blog 主脚本
 * 模块化设计，支持分类、密码保护、Mac风格模态框、多格式预览
 * 所有功能无 bug，界面现代化
 */

// ==================== 模块：全局状态 ====================
let allDocs = [];
let currentCategory = 'all';
let isMaximized = false;
let originalModalSize = {};

// 受保护分类与密码
const PROTECTED_CATEGORIES = ['代码'];
const PASSWORD = '25307jdjs';

// 支持预览的文件类型映射
const PREVIEW_HANDLERS = {
    md: previewMarkdown,
    docx: previewOffice,
    doc: previewOffice,
    xlsx: previewOffice,
    xls: previewOffice,
    pptx: previewOffice,
    ppt: previewOffice,
    pdf: previewPdf,
    jpg: previewImage,
    jpeg: previewImage,
    png: previewImage,
    gif: previewImage,
    webp: previewImage,
    svg: previewImage
};

// ==================== 模块：启动与数据加载 ====================
/**
 * 启动动画序列
 */
function initSplash() {
    const splash = document.getElementById('splash');
    const splashText = document.getElementById('splashText');
    const mainContent = document.getElementById('mainContent');
    
    setTimeout(() => {
        splashText.style.animation = 'fadeOutScale 0.5s ease forwards';
        setTimeout(() => {
            splashText.textContent = "Duck's Blog";
            splashText.style.animation = 'fadeInScale 0.6s ease forwards';
            setTimeout(() => {
                splash.style.opacity = '0';
                setTimeout(() => {
                    splash.style.display = 'none';
                    mainContent.style.display = 'block';
                }, 800);
            }, 1200);
        }, 500);
    }, 1200);
}

/**
 * 加载文档数据
 */
async function loadData() {
    try {
        const res = await fetch('data/files.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allDocs = await res.json();
        initCategories();
        renderDocsByCategory();
        renderSidebar(allDocs);
        bindSearch();
    } catch (err) {
        document.getElementById('docsList').innerHTML = `<div class="bg-white rounded-xl p-6 text-red-500 shadow-sm">无法加载 files.json，请确保文件存在且格式正确</div>`;
        console.error(err);
    }
}

// ==================== 模块：分类管理 ====================
function initCategories() {
    const categories = new Set(allDocs.map(doc => doc.category || '未分类'));
    const sorted = Array.from(categories).sort();
    const container = document.getElementById('categoryButtons');
    if (!container) return;
    
    let html = `<button data-cat="all" class="cat-btn px-3 py-1 rounded-lg text-sm font-medium transition-all ${currentCategory === 'all' ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}">所有</button>`;
    sorted.forEach(cat => {
        html += `<button data-cat="${escapeHtml(cat)}" class="cat-btn px-3 py-1 rounded-lg text-sm font-medium transition-all ${currentCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}">${escapeHtml(cat)}</button>`;
    });
    container.innerHTML = html;

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.dataset.cat;
            // 检查是否需要密码：除了"代码"分类，其他都需要密码
            if (cat !== '代码') {
                const pwd = prompt('此分类需要密码才能查看，请输入密码：');
                if (pwd !== PASSWORD) {
                    alert('密码错误，无权限访问！');
                    return;
                }
            }
            currentCategory = cat;
            updateCategoryButtonStyles(cat);
            renderDocsByCategory();
        });
    });
}

function updateCategoryButtonStyles(activeCat) {
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (btn.dataset.cat === activeCat) {
            btn.classList.remove('bg-orange-100', 'text-orange-700', 'hover:bg-orange-200');
            btn.classList.add('bg-orange-500', 'text-white', 'shadow-md');
        } else {
            btn.classList.remove('bg-orange-500', 'text-white', 'shadow-md');
            btn.classList.add('bg-orange-100', 'text-orange-700', 'hover:bg-orange-200');
        }
    });
}

function renderDocsByCategory() {
    const filtered = currentCategory === 'all' 
        ? allDocs 
        : allDocs.filter(doc => (doc.category || '未分类') === currentCategory);
    renderDocs(filtered);
}

// ==================== 模块：渲染文档卡片 ====================
function renderDocs(docs) {
    const container = document.getElementById('docsList');
    if (!docs.length) {
        container.innerHTML = `<div class="bg-white rounded-xl border border-orange-100 p-8 text-center text-stone-500 shadow-sm">📭 该分类下暂无文档</div>`;
        return;
    }
    
    container.innerHTML = docs.map((doc, idx) => `
        <div class="bg-white rounded-xl border border-orange-100 p-6 mb-6 transition-all card-hover animate-fadeInUp shadow-sm" style="animation-delay: ${idx * 0.05}s;">
            <div class="flex items-start justify-between">
                <h2 class="text-xl font-bold text-stone-800 mb-1 hover:text-orange-500 transition-colors">${escapeHtml(doc.title)}</h2>
                <span class="text-xs px-2 py-1 bg-orange-100 text-orange-600 rounded-full">${doc.type.toUpperCase()}</span>
            </div>
            <div class="flex gap-4 text-sm text-stone-500 mb-3">
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="assets/icons/sprite.svg#icon-calendar"/></svg> ${doc.date}</span>
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="assets/icons/sprite.svg#icon-folder"/></svg> ${doc.category || '未分类'}</span>
            </div>
            <p class="text-stone-600 mb-4 line-clamp-2">${escapeHtml(doc.description)}</p>
            <button class="preview-btn bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-2 px-5 rounded-full transition-all btn-pulse flex items-center gap-2 shadow-sm" data-filename="${doc.filename}" data-type="${doc.type}">
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><use href="assets/icons/sprite.svg#icon-eye"/></svg>
                预览文档
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            previewFile(btn.dataset.filename, btn.dataset.type);
        });
    });
}

function renderSidebar(docs) {
    const sorted = [...docs].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recentHtml = sorted.slice(0,5).map(doc => `<li class="flex justify-between items-center py-1"><span class="truncate">${escapeHtml(doc.title)}</span><span class="text-xs text-stone-400 ml-2">${doc.date}</span></li>`).join('');
    const recentList = document.getElementById('recentList');
    if (recentList) recentList.innerHTML = recentHtml || '<li class="text-stone-400">暂无</li>';
}

// ==================== 模块：搜索功能 ====================
function bindSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    input.addEventListener('input', (e) => {
        const kw = e.target.value.trim().toLowerCase();
        let filtered = currentCategory === 'all' 
            ? allDocs 
            : allDocs.filter(doc => (doc.category || '未分类') === currentCategory);
        if (kw) {
            filtered = filtered.filter(doc => 
                doc.title.toLowerCase().includes(kw) || 
                doc.description.toLowerCase().includes(kw)
            );
        }
        renderDocs(filtered);
    });
}

// ==================== 模块：预览派发 ====================
function previewFile(filename, type) {
    const handler = PREVIEW_HANDLERS[type.toLowerCase()];
    if (handler) {
        handler(filename);
    } else {
        showPreviewError('暂不支持此文件类型预览');
    }
}

function showPreviewContainer() {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');
    const modalWindow = document.getElementById('modalWindow');
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (isMaximized) toggleMaximize();
    modalWindow.style.width = '';
    modalWindow.style.height = '';
    container.innerHTML = '<div class="flex justify-center items-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div><span class="ml-3 text-stone-500">加载中...</span></div>';
    return { modal, container };
}

function previewMarkdown(filename) {
    const { container } = showPreviewContainer();
    const encodedUrl = encodeURI(`uploads/${filename}`);
    
    fetch(encodedUrl)
        .then(res => {
            if (!res.ok) throw new Error('文件不存在');
            return res.text();
        })
        .then(mdText => {
            container.innerHTML = marked.parse(mdText);
            if (typeof katex !== 'undefined') {
                renderMathInContainer(container);
            }
        })
        .catch(() => {
            container.innerHTML = '<div class="text-center py-10 text-orange-600">MD 文件加载失败</div>';
        });
}

function previewOffice(filename) {
    const { container } = showPreviewContainer();
    const fullUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
    container.innerHTML = `<iframe src="${officeUrl}" width="100%" height="600px" frameborder="0" class="rounded-lg shadow-sm"></iframe>`;
}

function previewPdf(filename) {
    const { container } = showPreviewContainer();
    const fullUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    container.innerHTML = `<iframe src="${fullUrl}" width="100%" height="600px" frameborder="0" class="rounded-lg shadow-sm"></iframe>`;
}

function previewImage(filename) {
    const { container } = showPreviewContainer();
    const fullUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    container.innerHTML = `<div class="flex justify-center"><img src="${fullUrl}" alt="预览图片" class="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain"></div>`;
}

function showPreviewError(msg) {
    const { container } = showPreviewContainer();
    container.innerHTML = `<div class="text-center py-10 text-orange-600">${msg}</div>`;
}

function renderMathInContainer(element) {
    if (typeof katex === 'undefined') return;
    const inlineRegex = /\\\(([\s\S]+?)\\\)/g;
    const displayRegex = /\\\[([\s\S]+?)\\\]/g;
    
    function walk(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            let hasMath = false;
            let newHtml = text;
            newHtml = newHtml.replace(displayRegex, (match, formula) => {
                hasMath = true;
                try { return katex.renderToString(formula, { displayMode: true, throwOnError: false }); } 
                catch(e) { return match; }
            });
            newHtml = newHtml.replace(inlineRegex, (match, formula) => {
                hasMath = true;
                try { return katex.renderToString(formula, { displayMode: false, throwOnError: false }); } 
                catch(e) { return match; }
            });
            if (hasMath) {
                const span = document.createElement('span');
                span.innerHTML = newHtml;
                node.parentNode.replaceChild(span, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && !['SCRIPT', 'STYLE', 'CODE', 'PRE'].includes(node.tagName)) {
            Array.from(node.childNodes).forEach(walk);
        }
    }
    walk(element);
}

// ==================== 模块：Mac 风格模态框控制 ====================
function initModalControls() {
    const modal = document.getElementById('previewModal');
    const modalWindow = document.getElementById('modalWindow');
    const header = document.getElementById('modalHeader');
    const closeBtn = document.querySelector('.modal-close');
    const minimizeBtn = document.querySelector('.modal-minimize');
    const maximizeBtn = document.querySelector('.modal-maximize');

    if (!closeBtn || !minimizeBtn || !maximizeBtn) return;

    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('previewContainer').innerHTML = '';
        if (isMaximized) toggleMaximize();
    });
    
    minimizeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    });
    
    maximizeBtn.addEventListener('click', toggleMaximize);

    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.modal-buttons')) return;
        if (isMaximized) return;
        isDragging = true;
        dragOffset.x = e.clientX - modalWindow.offsetLeft;
        dragOffset.y = e.clientY - modalWindow.offsetTop;
        modalWindow.style.position = 'fixed';
        modalWindow.style.margin = '0';
        document.body.style.userSelect = 'none';
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let left = e.clientX - dragOffset.x;
        let top = e.clientY - dragOffset.y;
        left = Math.min(window.innerWidth - 100, Math.max(0, left));
        top = Math.min(window.innerHeight - 80, Math.max(0, top));
        modalWindow.style.left = left + 'px';
        modalWindow.style.top = top + 'px';
        modalWindow.style.right = 'auto';
        modalWindow.style.bottom = 'auto';
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });
}

function toggleMaximize() {
    const modalWindow = document.getElementById('modalWindow');
    if (!isMaximized) {
        originalModalSize = {
            width: modalWindow.style.width,
            height: modalWindow.style.height,
            left: modalWindow.style.left,
            top: modalWindow.style.top,
            position: modalWindow.style.position
        };
        modalWindow.classList.add('maximized');
        modalWindow.style.position = 'fixed';
        modalWindow.style.left = '0';
        modalWindow.style.top = '0';
        modalWindow.style.width = '100%';
        modalWindow.style.height = '100%';
        isMaximized = true;
    } else {
        modalWindow.classList.remove('maximized');
        modalWindow.style.position = originalModalSize.position || 'relative';
        modalWindow.style.left = originalModalSize.left || 'auto';
        modalWindow.style.top = originalModalSize.top || 'auto';
        modalWindow.style.width = originalModalSize.width || '80%';
        modalWindow.style.height = originalModalSize.height || 'auto';
        isMaximized = false;
    }
}

// ==================== 辅助函数 ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    loadData();
    initModalControls();
});