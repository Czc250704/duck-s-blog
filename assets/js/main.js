// 全局文档数据
let allDocs = [];

// 加载 files.json 并渲染
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

// 渲染文档卡片列表（带入场动画、悬停效果、按钮脉冲）
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

    // 绑定预览按钮事件
    document.querySelectorAll('.preview-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filename = btn.dataset.filename;
            const type = btn.dataset.type;
            previewFile(filename, type);
        });
    });
}

// 渲染侧边栏（最新文章、分类）
function renderSidebar(docs) {
    // 最新文章（按日期倒序取前5）
    const sorted = [...docs].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recentHtml = sorted.slice(0,5).map(doc => `
        <li class="flex justify-between text-stone-600">
            <span>${escapeHtml(doc.title)}</span>
            <span class="text-xs text-stone-400">${doc.date}</span>
        </li>
    `).join('');
    document.getElementById('recentList').innerHTML = recentHtml || '<li>暂无</li>';

    // 分类统计
    const categoryMap = new Map();
    docs.forEach(doc => {
        const cat = doc.category || '未分类';
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    });
    const categoryHtml = Array.from(categoryMap.entries()).map(([cat, count]) => `
        <li class="flex justify-between text-stone-600">
            <span>${escapeHtml(cat)}</span>
            <span class="text-xs text-stone-400">${count}</span>
        </li>
    `).join('');
    document.getElementById('categoryList').innerHTML = categoryHtml || '<li>暂无分类</li>';
}

// 预览文件（打开模态框并添加弹出动画）
// 预览文件（支持 MD 公式渲染 + Office 文档预览）
function previewFile(filename, type) {
    const fileUrl = `uploads/${filename}`;
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');

    // 显示模态框
    modal.classList.add('flex');
    modal.classList.remove('hidden');

    // 重新触发模态框弹出动画
    const modalContent = modal.querySelector('.bg-white');
    if (modalContent) {
        modalContent.classList.remove('modal-content');
        void modalContent.offsetWidth; // 强制重绘
        modalContent.classList.add('modal-content');
    }

    // 清空旧内容
    container.innerHTML = '<div class="text-center text-stone-400 py-10">加载中...</div>';

    if (type === 'md') {
        // 对中文文件名进行 URL 编码
        const encodedUrl = encodeURI(fileUrl);
        fetch(encodedUrl)
            .then(res => {
                if (!res.ok) throw new Error('MD文件不存在');
                return res.text();
            })
            .then(text => {
                // 使用 marked 解析 Markdown
                let html = marked.parse(text);
                container.innerHTML = html;

                // 如果页面已加载 MathJax，则渲染公式
                if (window.MathJax) {
                    MathJax.typesetPromise([container]).catch(err => {
                        console.warn('MathJax 渲染失败:', err);
                    });
                } else {
                    // 若 MathJax 尚未加载（极少情况），等待加载完成后再渲染
                    const waitForMathJax = setInterval(() => {
                        if (window.MathJax) {
                            clearInterval(waitForMathJax);
                            MathJax.typesetPromise([container]).catch(e => console.warn(e));
                        }
                    }, 100);
                    setTimeout(() => clearInterval(waitForMathJax), 5000);
                }
            })
            .catch(err => {
                console.error('MD加载失败:', err);
                container.innerHTML = '<p class="text-orange-600">❌ MD 文件加载失败，请确认 uploads/ 下有该文件。</p>';
            });
    }
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

// 搜索功能（实时输入搜索，无需按钮）
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
    
    // 使用 input 事件实时搜索
    searchInput.addEventListener('input', doSearch);
}

// 关闭模态框
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

// HTML 转义函数
function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
