/**
 * Public Studio - 模块化内容管理系统
 * 支持访客浏览、管理员登录、文件上传审核、分类管理
 */

// ==================== 模块：安全防护 ====================
(function() {
    // 禁用右键菜单
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    // 禁用 F12 等开发者工具快捷键
    document.addEventListener('keydown', function(e) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && e.key === 'U')) {
            e.preventDefault();
            return false;
        }
    });
})();

// ==================== 模块：全局变量 ====================
let allDocs = [];               // 已发布文件
let categories = [];            // 分类列表
let currentCategory = null;
let currentUser = null;         // 当前登录用户 { username, role }
let pendingFiles = [];          // 待审批文件

// 密码常量
const CATEGORY_PASSWORD = '25307jdjs';
// 管理员账号
const ADMINS = {
    duck: { password: '250901', role: 'super' },
    admin1: { password: '123123', role: 'admin' },
    admin2: { password: '123123', role: 'admin' },
    admin3: { password: '123123', role: 'admin' },
    admin4: { password: '123123', role: 'admin' }
};

// GitHub 配置（需用户填写）
const GITHUB_TOKEN = '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';      // 替换为实际 token
const REPO_OWNER = 'Czc250704';
const REPO_NAME = 'duck-s-blog';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`;

// 预览处理器
const PREVIEW_HANDLERS = {
    md: previewMarkdown, txt: previewText,
    docx: previewOffice, doc: previewOffice,
    xlsx: previewOffice, xls: previewOffice,
    pptx: previewOffice, ppt: previewOffice,
    pdf: previewPdf,
    jpg: previewImage, jpeg: previewImage, png: previewImage, gif: previewImage, webp: previewImage, svg: previewImage
};

// ==================== 模块：辅助函数 ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, (m) => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showMessage(msg, isError = false) {
    // 简单 alert，可替换为自定义浮动提示
    alert(msg);
}

// ==================== 模块：GitHub API 操作 ====================
async function githubGetFile(path) {
    const url = `${API_BASE}/${path}`;
    const res = await fetch(url, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    if (!res.ok) throw new Error(`Failed to get ${path}`);
    const data = await res.json();
    return {
        content: atob(data.content),
        sha: data.sha
    };
}

async function githubUpdateFile(path, content, sha = null) {
    const url = `${API_BASE}/${path}`;
    const body = {
        message: `Update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main'
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Failed to update ${path}`);
    return await res.json();
}

async function githubUploadFile(filePath, fileContent, message) {
    const url = `${API_BASE}/${filePath}`;
    const body = {
        message: message,
        content: btoa(unescape(encodeURIComponent(fileContent))),
        branch: 'main'
    };
    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Failed to upload ${filePath}`);
    return await res.json();
}

// ==================== 模块：数据加载 ====================
async function loadData() {
    try {
        // 加载已发布文件
        const filesRes = await fetch('data/files.json');
        allDocs = await filesRes.json();
        // 加载分类列表
        const catRes = await fetch('data/categories.json');
        categories = await catRes.json();
        // 加载待审批文件（仅主管理员需要，但先加载）
        try {
            const pendingRes = await fetch('data/pending.json');
            pendingFiles = await pendingRes.json();
        } catch(e) { pendingFiles = []; }
        renderCategories();
        renderRecentUploads();
    } catch (err) {
        console.error(err);
        showMessage('数据加载失败，请刷新页面重试', true);
    }
}

// ==================== 模块：界面渲染 ====================
function renderCategories() {
    const container = document.getElementById('categoriesGrid');
    if (!container) return;
    container.innerHTML = categories.map(cat => {
        const count = allDocs.filter(d => d.category === cat).length;
        return `
            <div class="category-block" data-category="${escapeHtml(cat)}">
                <svg class="category-icon" viewBox="0 0 24 24"><use href="assets/icons/sprite.svg#icon-folder"/></svg>
                <div class="category-name">${escapeHtml(cat)}</div>
                <div class="category-count">${count} 个文件</div>
            </div>
        `;
    }).join('');
    document.querySelectorAll('.category-block').forEach(block => {
        block.addEventListener('click', async () => {
            const cat = block.dataset.category;
            if (cat !== '代码') {
                const pwd = prompt('此分类需要密码才能查看，请输入密码：');
                if (pwd !== CATEGORY_PASSWORD) {
                    alert('密码错误');
                    return;
                }
            }
            enterCategory(cat);
        });
    });
}

function enterCategory(category) {
    currentCategory = category;
    const files = allDocs.filter(d => d.category === category);
    document.getElementById('categoriesView').classList.add('hidden');
    document.getElementById('filesView').classList.remove('hidden');
    document.getElementById('currentCategoryTitle').innerText = category;
    const filesContainer = document.getElementById('filesList');
    filesContainer.innerHTML = files.map(file => `
        <div class="file-card-sm" data-filename="${file.filename}" data-type="${file.type}">
            <div class="file-info">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
                <div>
                    <div class="file-title">${escapeHtml(file.title)}</div>
                    <div class="file-meta">${file.date} · ${file.type.toUpperCase()}</div>
                    <div class="file-creator">上传者：${escapeHtml(file.creator || '系统')}</div>
                </div>
            </div>
            <button class="preview-btn">预览</button>
        </div>
    `).join('');
    document.querySelectorAll('.file-card-sm').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('preview-btn')) {
                previewFile(card.dataset.filename, card.dataset.type);
            }
        });
        card.querySelector('.preview-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            previewFile(card.dataset.filename, card.dataset.type);
        });
    });
    // 显示上传面板（如果已登录且是管理员）
    const uploadPanel = document.getElementById('uploadPanel');
    if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super')) {
        uploadPanel.classList.remove('hidden');
    } else {
        uploadPanel.classList.add('hidden');
    }
    // 显示删除分类按钮（仅主管理员）
    const delBtn = document.getElementById('deleteCategoryBtn');
    if (currentUser && currentUser.role === 'super') {
        delBtn.classList.remove('hidden');
        delBtn.onclick = () => deleteCategory(category);
    } else {
        delBtn.classList.add('hidden');
    }
}

function renderRecentUploads() {
    const sorted = [...allDocs].sort((a,b) => new Date(b.date) - new Date(a.date));
    const recent = sorted.slice(0,5);
    const container = document.getElementById('recentUploadsList');
    if (!container) return;
    container.innerHTML = recent.map(doc => `<li class="recent-item">${escapeHtml(doc.title)}<span class="recent-date">${doc.date}</span></li>`).join('');
}

function renderApprovalPanel() {
    const panel = document.getElementById('approvalPanel');
    const listContainer = document.getElementById('pendingList');
    if (!currentUser || currentUser.role !== 'super') {
        panel.classList.add('hidden');
        return;
    }
    panel.classList.remove('hidden');
    listContainer.innerHTML = pendingFiles.map((p, idx) => `
        <div class="pending-item" data-idx="${idx}">
            <div class="pending-info">
                <strong>${escapeHtml(p.title)}</strong><br>
                类型: ${p.type} | 上传者: ${p.uploader} | 日期: ${p.date}
            </div>
            <div class="pending-actions">
                <button class="approve-btn" data-idx="${idx}">批准</button>
                <button class="reject-btn" data-idx="${idx}">拒绝</button>
            </div>
        </div>
    `).join('');
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', () => approveFile(parseInt(btn.dataset.idx)));
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', () => rejectFile(parseInt(btn.dataset.idx)));
    });
}

// ==================== 模块：分类管理 ====================
async function createCategory() {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super')) {
        alert('无权限');
        return;
    }
    const newCat = prompt('请输入新分类名称：');
    if (!newCat || categories.includes(newCat)) {
        alert('分类已存在或无效');
        return;
    }
    categories.push(newCat);
    await githubUpdateFile('data/categories.json', JSON.stringify(categories, null, 2));
    renderCategories();
}

async function deleteCategory(cat) {
    if (!currentUser || currentUser.role !== 'super') return;
    if (!confirm(`确定要删除分类“${cat}”及其下所有文件吗？`)) return;
    // 删除该分类下的所有文件（需从 allDocs 移除并更新 GitHub）
    const filesToDelete = allDocs.filter(d => d.category === cat);
    for (const file of filesToDelete) {
        // 从 GitHub 删除文件（需要先获取 sha）
        try {
            const filePath = `uploads/${file.filename}`;
            const fileInfo = await githubGetFile(filePath);
            const url = `${API_BASE}/${filePath}`;
            await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
                body: JSON.stringify({ message: `Delete ${file.filename}`, sha: fileInfo.sha, branch: 'main' })
            });
        } catch(e) { console.warn(e); }
    }
    // 更新 allDocs
    allDocs = allDocs.filter(d => d.category !== cat);
    await githubUpdateFile('data/files.json', JSON.stringify(allDocs, null, 2));
    // 更新分类列表
    categories = categories.filter(c => c !== cat);
    await githubUpdateFile('data/categories.json', JSON.stringify(categories, null, 2));
    // 重新渲染
    renderCategories();
    document.getElementById('filesView').classList.add('hidden');
    document.getElementById('categoriesView').classList.remove('hidden');
    showMessage('分类已删除');
}

// ==================== 模块：文件上传与审核 ====================
async function submitUpload() {
    if (!currentUser) {
        alert('请先登录');
        return;
    }
    const fileInput = document.getElementById('fileInput');
    const title = document.getElementById('fileTitle').value.trim();
    const desc = document.getElementById('fileDesc').value.trim();
    if (!fileInput.files.length || !title) {
        alert('请选择文件并填写标题');
        return;
    }
    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['md','txt','ppt','pptx','doc','docx','xls','xlsx','pdf','jpg','jpeg','png','gif'];
    if (!allowed.includes(ext)) {
        alert('不支持的文件类型');
        return;
    }
    const reader = new FileReader();
    reader.onload = async function(e) {
        const content = e.target.result;
        // 生成临时文件名
        const tempFilename = `pending_${Date.now()}_${file.name}`;
        const pendingItem = {
            id: Date.now(),
            title: title,
            description: desc,
            filename: tempFilename,
            originalName: file.name,
            type: ext,
            content: content,  // base64 或文本
            uploader: currentUser.username,
            date: new Date().toISOString().slice(0,10),
            category: currentCategory
        };
        pendingFiles.push(pendingItem);
        // 保存 pending.json 到 GitHub
        await githubUpdateFile('data/pending.json', JSON.stringify(pendingFiles, null, 2));
        // 同时上传文件内容到 uploads 临时目录（实际可以等到审批通过后再上传，这里简化：暂存到 pending，审批时再写入）
        showMessage('已提交审核，等待主管理员批准');
        // 清空表单
        document.getElementById('fileTitle').value = '';
        document.getElementById('fileDesc').value = '';
        fileInput.value = '';
    };
    reader.readAsDataURL(file); // 简单处理，实际应读取二进制
}

async function approveFile(idx) {
    const item = pendingFiles[idx];
    if (!item) return;
    // 确定最终文件名
    const finalFilename = `${Date.now()}_${item.originalName}`;
    // 将文件内容写入 uploads
    // 注意：content 是 dataURL，需要转换
    const base64Content = item.content.split(',')[1];
    await githubUploadFile(`uploads/${finalFilename}`, base64Content, `Add file ${finalFilename}`);
    // 更新 files.json
    const newFile = {
        title: item.title,
        filename: finalFilename,
        type: item.type,
        date: item.date,
        description: item.description,
        category: item.category,
        creator: item.uploader
    };
    allDocs.push(newFile);
    await githubUpdateFile('data/files.json', JSON.stringify(allDocs, null, 2));
    // 从 pending 中移除
    pendingFiles.splice(idx, 1);
    await githubUpdateFile('data/pending.json', JSON.stringify(pendingFiles, null, 2));
    // 刷新界面
    renderCategories();
    renderRecentUploads();
    renderApprovalPanel();
    showMessage('文件已批准并发布');
}

async function rejectFile(idx) {
    if (!confirm('确定拒绝该文件？')) return;
    pendingFiles.splice(idx, 1);
    await githubUpdateFile('data/pending.json', JSON.stringify(pendingFiles, null, 2));
    renderApprovalPanel();
    showMessage('已拒绝');
}

// ==================== 模块：登录/登出 ====================
function showLoginModal() {
    const username = prompt('用户名：');
    const password = prompt('密码：');
    if (!username || !password) return;
    const user = ADMINS[username];
    if (user && user.password === password) {
        currentUser = { username, role: user.role };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUIForUser();
        showMessage(`欢迎，${username}`);
        // 刷新上传面板可见性
        if (currentCategory) {
            const uploadPanel = document.getElementById('uploadPanel');
            if (uploadPanel) uploadPanel.classList.toggle('hidden', !(currentUser.role === 'admin' || currentUser.role === 'super'));
        }
        renderApprovalPanel();
    } else {
        alert('用户名或密码错误');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateUIForUser();
    // 隐藏上传面板和审批面板
    const uploadPanel = document.getElementById('uploadPanel');
    if (uploadPanel) uploadPanel.classList.add('hidden');
    const approvalPanel = document.getElementById('approvalPanel');
    if (approvalPanel) approvalPanel.classList.add('hidden');
    showMessage('已登出');
}

function updateUIForUser() {
    const roleBadge = document.getElementById('userRoleBadge');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginBtn = document.getElementById('loginBtn');
    const newCatBtn = document.getElementById('newCategoryBtn');
    if (currentUser) {
        roleBadge.textContent = currentUser.role === 'super' ? '主管理员' : '二级管理员';
        logoutBtn.classList.remove('hidden');
        loginBtn.classList.add('hidden');
        if (currentUser.role === 'admin' || currentUser.role === 'super') {
            newCatBtn.classList.remove('hidden');
            newCatBtn.onclick = createCategory;
        } else {
            newCatBtn.classList.add('hidden');
        }
    } else {
        roleBadge.textContent = '访客';
        logoutBtn.classList.add('hidden');
        loginBtn.classList.remove('hidden');
        newCatBtn.classList.add('hidden');
    }
}

// ==================== 模块：预览功能 ====================
function showPreviewContainer() {
    const modal = document.getElementById('previewModal');
    const container = document.getElementById('previewContainer');
    const modalWindow = document.getElementById('modalWindow');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.isMaximized) toggleMaximize();
    modalWindow.style.width = '';
    modalWindow.style.height = '';
    container.innerHTML = '<div class="flex justify-center items-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div><div class="ml-3">加载中...</div></div>';
    return container;
}

function previewFile(filename, type) {
    const handler = PREVIEW_HANDLERS[type.toLowerCase()];
    if (handler) handler(filename);
    else showPreviewError('暂不支持预览');
}

function previewMarkdown(filename) {
    const container = showPreviewContainer();
    fetch(encodeURI(`uploads/${filename}`))
        .then(res => res.text())
        .then(text => {
            let processed = text;
            processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (m, f) => {
                try { return katex.renderToString(f, { displayMode: true }); } catch(e) { return m; }
            });
            processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (m, f) => {
                try { return katex.renderToString(f, { displayMode: false }); } catch(e) { return m; }
            });
            container.innerHTML = marked.parse(processed);
        })
        .catch(() => container.innerHTML = '<div class="text-center py-10">加载失败</div>');
}

function previewOffice(filename) {
    const container = showPreviewContainer();
    const url = `${window.location.origin}/uploads/${encodeURIComponent(filename)}`;
    container.innerHTML = `<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}" width="100%" height="600px"></iframe>`;
}

function previewPdf(filename) {
    const container = showPreviewContainer();
    container.innerHTML = `<iframe src="${window.location.origin}/uploads/${encodeURIComponent(filename)}" width="100%" height="600px"></iframe>`;
}

function previewImage(filename) {
    const container = showPreviewContainer();
    container.innerHTML = `<img src="${window.location.origin}/uploads/${encodeURIComponent(filename)}" class="max-w-full max-h-[70vh] mx-auto rounded-lg">`;
}

function previewText(filename) {
    const container = showPreviewContainer();
    fetch(encodeURI(`uploads/${filename}`))
        .then(res => res.text())
        .then(text => container.innerHTML = `<pre style="white-space:pre-wrap">${escapeHtml(text)}</pre>`)
        .catch(() => container.innerHTML = '<div>加载失败</div>');
}

function showPreviewError(msg) {
    const container = showPreviewContainer();
    container.innerHTML = `<div class="text-center py-10 text-orange-600">${msg}</div>`;
}

// ==================== 模块：评论区 ====================
let comments = [];
function loadComments() {
    const stored = localStorage.getItem('blog_comments');
    if (stored) comments = JSON.parse(stored);
    else comments = [{ author: '系统', text: '欢迎来到 Public Studio', time: new Date().toLocaleString(), avatar: 'S' }];
    renderComments();
}
function renderComments() {
    const container = document.getElementById('commentsList');
    if (!container) return;
    container.innerHTML = comments.map(c => `
        <div class="comment-item">
            <div class="comment-avatar">${escapeHtml(c.avatar || c.author.charAt(0))}</div>
            <div class="comment-content">
                <div class="comment-author">${escapeHtml(c.author)}</div>
                <div class="comment-text">${escapeHtml(c.text)}</div>
                <div class="comment-time">${escapeHtml(c.time)}</div>
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}
function addComment(text) {
    if (!text.trim()) return;
    comments.unshift({ author: '访客', text: text.trim(), time: new Date().toLocaleString(), avatar: '访' });
    localStorage.setItem('blog_comments', JSON.stringify(comments));
    renderComments();
}
function initComments() {
    const submit = document.getElementById('submitComment');
    const input = document.getElementById('commentInput');
    if (submit) submit.addEventListener('click', () => { addComment(input.value); input.value = ''; });
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { addComment(input.value); input.value = ''; } });
    loadComments();
}

// ==================== 模块：音乐播放器 ====================
let musicList = [], currentMusicIndex = -1, isPlaying = false;
async function loadMusic() {
    try {
        const res = await fetch('data/music.json');
        if (res.ok) musicList = await res.json();
        else musicList = [];
        renderPlaylist();
    } catch(e) { musicList = []; }
}
function renderPlaylist() {
    const playlistEl = document.getElementById('playlist');
    if (!playlistEl) return;
    playlistEl.innerHTML = musicList.map((t, i) => `<div class="playlist-item ${i===currentMusicIndex?'active':''}" data-index="${i}">${escapeHtml(t.name)}</div>`).join('');
    document.querySelectorAll('.playlist-item').forEach(item => {
        item.addEventListener('click', () => playMusic(parseInt(item.dataset.index)));
    });
}
function playMusic(index) {
    if (!musicList[index] || !musicList[index].url) return;
    currentMusicIndex = index;
    const audio = document.getElementById('audioPlayer');
    audio.src = musicList[index].url;
    audio.play();
    isPlaying = true;
    updatePlayerUI();
    renderPlaylist();
}
function togglePlayPause() {
    const audio = document.getElementById('audioPlayer');
    if (!audio.src) { if(musicList.length) playMusic(0); return; }
    if (isPlaying) { audio.pause(); isPlaying=false; }
    else { audio.play(); isPlaying=true; }
    updatePlayerUI();
}
function nextTrack() { if(musicList.length) playMusic((currentMusicIndex+1)%musicList.length); }
function prevTrack() { if(musicList.length) playMusic((currentMusicIndex-1+musicList.length)%musicList.length); }
function updatePlayerUI() {
    const currentTrackEl = document.getElementById('currentTrack');
    const playPauseBtn = document.getElementById('playPause');
    if (currentMusicIndex>=0 && musicList[currentMusicIndex]) currentTrackEl.textContent = musicList[currentMusicIndex].name;
    else currentTrackEl.textContent = '未选择歌曲';
    if (playPauseBtn) playPauseBtn.innerHTML = isPlaying ? '⏸' : '▶';
}
function initMusicPlayer() {
    const audio = document.getElementById('audioPlayer');
    const playPause = document.getElementById('playPause');
    const prev = document.getElementById('prevTrack');
    const next = document.getElementById('nextTrack');
    if (playPause) playPause.addEventListener('click', togglePlayPause);
    if (prev) prev.addEventListener('click', prevTrack);
    if (next) next.addEventListener('click', nextTrack);
    if (audio) audio.addEventListener('ended', nextTrack);
    loadMusic();
}

// ==================== 模块：模态框控制 ====================
let isMaximized = false, originalSize = {};
function initModalControls() {
    const modal = document.getElementById('previewModal');
    const win = document.getElementById('modalWindow');
    const header = document.getElementById('modalHeader');
    const close = document.querySelector('.modal-close');
    const minimize = document.querySelector('.modal-minimize');
    const maximize = document.querySelector('.modal-maximize');
    if (close) close.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); if(isMaximized) toggleMaximize(); };
    if (minimize) minimize.onclick = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); };
    if (maximize) maximize.onclick = toggleMaximize;
    let dragging = false, offX, offY;
    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.modal-buttons') || isMaximized) return;
        dragging = true; offX = e.clientX - win.offsetLeft; offY = e.clientY - win.offsetTop;
        win.style.position = 'fixed'; win.style.margin = '0'; document.body.style.userSelect = 'none';
    });
    window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        let left = e.clientX - offX, top = e.clientY - offY;
        left = Math.min(window.innerWidth-100, Math.max(0, left)); top = Math.min(window.innerHeight-80, Math.max(0, top));
        win.style.left = left+'px'; win.style.top = top+'px'; win.style.right = 'auto'; win.style.bottom = 'auto';
    });
    window.addEventListener('mouseup', () => { dragging = false; document.body.style.userSelect = ''; });
}
function toggleMaximize() {
    const win = document.getElementById('modalWindow');
    if (!isMaximized) {
        originalSize = { width: win.style.width, height: win.style.height, left: win.style.left, top: win.style.top };
        win.classList.add('maximized'); win.style.position = 'fixed'; win.style.left = '0'; win.style.top = '0';
        win.style.width = '100%'; win.style.height = '100%'; isMaximized = true;
    } else {
        win.classList.remove('maximized'); win.style.position = originalSize.position || 'relative';
        win.style.left = originalSize.left || 'auto'; win.style.top = originalSize.top || 'auto';
        win.style.width = originalSize.width || '80%'; win.style.height = originalSize.height || 'auto'; isMaximized = false;
    }
}

// ==================== 启动动画与初始化 ====================
function initSplash() {
    const splash = document.getElementById('splashLayer');
    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
        }, 800);
    }, 1800);
}

document.addEventListener('DOMContentLoaded', () => {
    initSplash();
    loadData().then(() => {
        // 检查本地存储的登录状态
        const saved = localStorage.getItem('currentUser');
        if (saved) {
            try {
                currentUser = JSON.parse(saved);
                if (!ADMINS[currentUser.username] || ADMINS[currentUser.username].password !== (currentUser.password||'')) currentUser = null;
                else updateUIForUser();
            } catch(e) { currentUser = null; }
        }
        updateUIForUser();
        initComments();
        initMusicPlayer();
        initModalControls();
        document.getElementById('loginBtn').addEventListener('click', showLoginModal);
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('backToCategories').addEventListener('click', () => {
            document.getElementById('filesView').classList.add('hidden');
            document.getElementById('categoriesView').classList.remove('hidden');
        });
        document.getElementById('uploadSubmit').addEventListener('click', submitUpload);
        // 如果当前用户是主管理员，加载审批面板
        if (currentUser && currentUser.role === 'super') renderApprovalPanel();
    });
});