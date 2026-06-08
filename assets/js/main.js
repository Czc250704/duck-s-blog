/**
 * Duck's Blog - 访达风格文件管理器
 * 所有弹窗均为 Mac 风格浮动窗口
 */

// ==================== 全局变量 ====================
let allDocs = [];
let currentCategory = null;
let isMaximized = false;
let originalModalSize = {};

const PASSWORD = '25307jdjs';

// 预览处理器映射
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

// ==================== Mac 风格浮动提示框 ====================
function showPrompt(options) {
    return new Promise((resolve) => {
        const { title = '提示', message, input = false, placeholder = '', confirmText = '确定', cancelText = '取消' } = options;
        
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'floating-prompt';
        
        // 创建弹窗窗口
        const promptWindow = document.createElement('div');
        promptWindow.className = 'prompt-window';
        
        // 标题栏
        const header = document.createElement('div');
        header.className = 'prompt-header';
        header.innerHTML = `
            <div class="prompt-buttons">
                <div class="prompt-close" title="关闭"></div>
            </div>
            <span class="prompt-title">${escapeHtml(title)}</span>
            <div class="prompt-placeholder"></div>
        `;
        
        // 内容区
        const body = document.createElement('div');
        body.className = 'prompt-body';
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'prompt-message';
        msgDiv.innerHTML = escapeHtml(message);
        body.appendChild(msgDiv);
        
        let inputEl = null;
        if (input) {
            inputEl = document.createElement('input');
            inputEl.type = 'password';
            inputEl.className = 'prompt-input';
            inputEl.placeholder = placeholder;
            inputEl.placeholder = '请输入密码';
            body.appendChild(inputEl);
        }
        
        // 底部按钮
        const footer = document.createElement('div');
        footer.className = 'prompt-footer';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'prompt-btn prompt-btn-secondary';
        cancelBtn.textContent = cancelText;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'prompt-btn prompt-btn-primary';
        confirmBtn.textContent = confirmText;
        
        footer.appendChild(cancelBtn);
        footer.appendChild(confirmBtn);
        body.appendChild(footer);
        
        promptWindow.appendChild(header);
        promptWindow.appendChild(body);
        overlay.appendChild(promptWindow);
        document.body.appendChild(overlay);
        
        // 关闭函数
        const close = (result, value) => {
            overlay.remove();
            resolve({ confirmed: result, value });
        };
        
        // 事件绑定
        const closeBtn = header.querySelector('.prompt-close');
        closeBtn.addEventListener('click', () => close(false, null));
        
        cancelBtn.addEventListener('click', () => close(false, null));
        
        confirmBtn.addEventListener('click', () => {
            if (inputEl) {
                close(true, inputEl.value);
            } else {
                close(true, null);
            }
        });
        
        if (inputEl) {
            inputEl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });
            setTimeout(() => inputEl.focus(), 100);
        }
        
        // 点击遮罩层关闭（非弹窗区域）
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close(false, null);
            }
        });
    });
}

function showAlert(message, title = '提示') {
    return showPrompt({ title, message, input: false, confirmText: '确定', cancelText: '' });
}

function showPasswordPrompt() {
    return showPrompt({
        title: '密码验证',
        message: '此分类需要密码才能查看，请输入密码：',
        input: true,
        placeholder: '请输入密码',
        confirmText: '验证',
        cancelText: '取消'
    });
}

// ==================== 启动动画 ====================
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

// ==================== 加载数据 ====================
async function loadData() {
    try {
        const res = await fetch('data/files.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        allDocs = await res.json();
        renderCategories();
    } catch (err) {
        const grid = document.getElementById('categoriesGrid');
        if (grid) {
            grid.innerHTML = '<div class="text-red-500 col-span-full text-center py-10">无法加载 files.json，请检查文件格式</div>';
        }
        console.error(err);
    }
}

// ==================== 分类板块 ====================
function renderCategories() {
    const categories = [...new Set(allDocs.map(doc => doc.category || '未分类'))].sort();
    const container = document.getElementById('categoriesGrid');
    if (!container) return;

    container.innerHTML = categories.map(cat => {
        const count = allDocs.filter(d => (d.category || '未分类') === cat).length;
        return `
            <div class="category-block" data-category="${escapeHtml(cat)}">
                <svg class="category-icon" viewBox="0 0 24 24">
                    <use href="assets/icons/sprite.svg#icon-folder"/>
                </svg>
                <div class="category-name">${escapeHtml(cat)}</div>
                <div class="category-count">${count} 个文件</div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.category-block').forEach(block => {
        block.addEventListener('click', async () => {
            const cat = block.dataset.category;
            if (cat !== '代码') {
                const result = await showPasswordPrompt();
                if (!result.confirmed || result.value !== PASSWORD) {
                    await showAlert('密码错误，无权限访问！', '验证失败');
                    return;
                }
            }
            enterCategory(cat);
        });
    });
}

// ==================== 进入分类文件列表 ====================
function enterCategory(category) {
    currentCategory = category;
    const files = allDocs.filter(doc => (doc.category || '未分类') === category);

    document.getElementById('categoriesView').classList.add('hidden');
    document.getElementById('filesView').classList.remove('hidden');
    document.getElementById('currentCategoryTitle').innerText = category;

    const filesContainer = document.getElementById('filesList');
    filesContainer.innerHTML = files.map((file, idx) => `
        <div class="file-card-sm flex justify-between items-center" data-filename="${file.filename}" data-type="${file.type}">
            <div class="flex items-center gap-3">
                <svg class="w-5 h-5 fill-orange-500" viewBox="0 0 24 24">
                    <use href="assets/icons/sprite.svg#icon-file"/>
                </svg>
                <div>
                    <div class="font-medium text-stone-800">${escapeHtml(file.title)}</div>
                    <div class="text-xs text-stone-400">${file.date} · ${file.type.toUpperCase()}</div>
                </div>
            </div>
            <button class="preview-btn text-orange-500 hover:text-orange-600 text-sm px-3 py-1 rounded-full hover:bg-orange-50 transition">预览</button>
        </div>
    `).join('');

    const sidebarList = document.getElementById('fileSidebarList');
    sidebarList.innerHTML = files.map(file => `
        <li class="sidebar-file-item" data-filename="${file.filename}" data-type="${file.type}">
            <svg class="w-4 h-4 fill-stone-400" viewBox="0 0 24 24">
                <use href="assets/icons/sprite.svg#icon-file"/>
            </svg>
            <span class="truncate flex-1">${escapeHtml(file.title)}</span>
        </li>
    `).join('');

    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.file-card-sm');
            if (card) {
                previewFile(card.dataset.filename, card.dataset.type);
            }
        });
    });

    document.querySelectorAll('.sidebar-file-item').forEach(item => {
        item.addEventListener('click', () => {
            previewFile(item.dataset.filename, item.dataset.type);
            document.querySelectorAll('.sidebar-file-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// ==================== 返回分类板块 ====================
document.getElementById('backToCategories')?.addEventListener('click', () => {
    document.getElementById('filesView').classList.add('hidden');
    document.getElementById('categoriesView').classList.remove('hidden');
    currentCategory = null;
});

// ==================== 预览功能 ====================
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
    return container;
}

function previewFile(filename, type) {
    const handler = PREVIEW_HANDLERS[type.toLowerCase()];
    if (handler) {
        handler(filename);
    } else {
        const container = showPreviewContainer();
        container.innerHTML = '<div class="text-center py-10 text-orange-600">暂不支持此文件类型预览</div>';
    }
}

function previewMarkdown(filename) {
    const container = showPreviewContainer();
    const encodedUrl = encodeURI(`uploads/${filename}`);

    fetch(encodedUrl)
        .then(res => {
            if (!res.ok) throw new Error('文件不存在');
            return res.text();
        })
        .then(text => {
            container.innerHTML = marked.parse(text);
            if (typeof katex !== 'undefined') {
                renderMathInContainer(container);
            }
        })
        .catch(() => {
            container.innerHTML = '<div class="text-center py-10 text-orange-600">MD 文件加载失败，请确认文件存在</div>';
        });
}

function previewOffice(filename) {
    const container = showPreviewContainer();
    let hostname = window.location.hostname;
    let httpsUrl = `https://${hostname}/uploads/${encodeURIComponent(filename)}`;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        httpsUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    }
    
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(httpsUrl)}`;
    container.innerHTML = `<iframe src="${officeUrl}" width="100%" height="600px" frameborder="0" class="rounded-lg shadow-sm"></iframe>`;
}

function previewPdf(filename) {
    const container = showPreviewContainer();
    const fullUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    container.innerHTML = `<iframe src="${fullUrl}" width="100%" height="600px" frameborder="0" class="rounded-lg shadow-sm"></iframe>`;
}

function previewImage(filename) {
    const container = showPreviewContainer();
    const fullUrl = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    container.innerHTML = `<div class="flex justify-center"><img src="${fullUrl}" alt="预览图片" class="max-w-full max-h-[70vh] rounded-lg shadow-lg object-contain"></div>`;
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
                try {
                    return katex.renderToString(formula, { displayMode: true, throwOnError: false });
                } catch (e) {
                    return match;
                }
            });
            newHtml = newHtml.replace(inlineRegex, (match, formula) => {
                hasMath = true;
                try {
                    return katex.renderToString(formula, { displayMode: false, throwOnError: false });
                } catch (e) {
                    return match;
                }
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

// ==================== Mac 风格模态框控制 ====================
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
    return str.replace(/[&<>]/g, (m) => {
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