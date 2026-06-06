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

// 渲染文档卡片列表
function renderDocs(docs) {
    const container = document.getElementById('docsList');
    if (!docs.length) {
        container.innerHTML = `<div class="bg-white rounded-2xl border border-orange-100 p-6 text-center text-stone-500">暂无文档，请将文件放入 uploads/ 并修改 data/files.json</div>`;
        return;
    }
    container.innerHTML = docs.map(doc => `
        <div class="bg-white rounded-2xl border border-orange-100 p-6 mb-6 transition hover:shadow-md">
            <h2 class="text-xl font-bold text-stone-800 mb-1">${escapeHtml(doc.title)}</h2>
            <div class="flex gap-4 text-sm text-stone-500 mb-3">
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#icon-calendar"/></svg> ${doc.date}</span>
                <span class="flex items-center gap-1"><svg class="w-4 h-4 fill-current"><use href="assets/icons/sprite.svg#icon-file"/></svg> ${doc.type.toUpperCase()}</span>
            </div>
            <p class="text-stone-600 mb-4">${escapeHtml(doc.description)}</p>
            <button class="preview-btn bg-orange-50 hover:bg-orange-100 text-orange-600 font-medium py-2 px-5 rounded-full border border-orange-200 transition flex items-center gap-2" data-filename="${doc.filename}" data-type="${doc.type}">
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

// 预览文件
function previewFile(filename, type) {
    const fileUrl = `uploads/${filename}`;
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');
    modal.classList.add('flex');
    modal.classList.remove('hidden');

    if (type === 'md') {
        fetch(fileUrl)
            .then(res => {
                if (!res.ok) throw new Error('MD文件不存在');
                return res.text();
            })
            .then(text => {
                container.innerHTML = marked.parse(text);
            })
            .catch(() => {
                container.innerHTML = '<p class="text-orange-600">❌ MD 文件加载失败，请确认 uploads/ 下有该文件。</p>';
            });
    }
    else if (type === 'pptx' || type === 'docx') {
        const fullUrl = window.location.origin + '/' + fileUrl;
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`;
        container.innerHTML = `<iframe src="${officeUrl}" width="100%" height="650px" frameborder="0" class="rounded-xl"></iframe>`;
    }
    else {
        container.innerHTML = '<p>暂不支持此文件类型预览</p>';
    }
}

// 搜索功能（前端过滤）
function bindSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
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
    searchBtn.addEventListener('click', doSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') doSearch();
    });
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

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}