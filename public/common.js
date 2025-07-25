// public/common.js
// Lógica de verificação de login, logout e notificações (compartilhada entre todas as páginas)

// --- ELEMENTOS DO DOM (comuns) ---
// Declaração de elementos DOM deve vir antes de seu uso em funções.
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsTab = document.getElementById('notifications-tab');
const notificationsList = document.getElementById('notifications-list');
const notificationsBadge = document.getElementById('notifications-badge');
const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
const logoutBtn = document.getElementById('logout-btn');

// Elementos de pop-up (declarados globalmente para showCustomPopup e showCustomConfirm)
const customPopupOverlay = document.getElementById('custom-popup-overlay');
const customPopupTitle = document.getElementById('custom-popup-title');
const customPopupMessage = document.getElementById('custom-popup-message');
const customPopupCloseBtn = document.getElementById('custom-popup-close-btn');

const customConfirmOverlay = document.getElementById('custom-confirm-overlay');
const customConfirmTitle = document.getElementById('custom-confirm-title');
const customConfirmMessage = document.getElementById('custom-confirm-message');
const customConfirmYesBtn = document.getElementById('custom-confirm-yes-btn');
const customConfirmNoBtn = document.getElementById('custom-confirm-no-btn');


// --- FUNÇÕES COMUNS ---

// Função para renderizar notificações (agora aceita produtosArray como parâmetro)
// Esta função é chamada como 'atualizarNotificacoesComuns' em outros scripts.
function atualizarNotificacoesComuns(produtosArray) {
    let notifications = [];

    // Se produtosArray não for fornecido (fallback ou chamada sem parâmetro),
    // tenta carregar de localStorage como último recurso, embora o ideal seja passar da API.
    const produtos = produtosArray || JSON.parse(localStorage.getItem('produtos')) || [];

    produtos.forEach(produto => {
        if (produto.quantidade < produto.min_quantidade) {
            const notificationText = `<strong>${produto.nome}</strong> está com estoque baixo! (${produto.quantidade} de ${produto.min_quantidade})`;
            notifications.push(notificationText);
        }
    });

    if (notificationsList) { // Verifica se o elemento existe antes de manipular
        notificationsList.innerHTML = '';
        if (notifications.length > 0) {
            notifications.forEach(notificacao => {
                const li = document.createElement('li');
                li.innerHTML = notificacao;
                notificationsList.appendChild(li);
            });
            notificationsBadge.textContent = notifications.length;
            notificationsBadge.classList.remove('hidden');
        } else {
            notificationsList.innerHTML = '<li>Nenhuma notificação.</li>';
            notificationsBadge.classList.add('hidden');
        }
    }
}

// Função de Logout (MODIFICADA: remove também o role do armazenamento)
function logout() {
    localStorage.removeItem('usuarioLogado');
    sessionStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuarioRole'); // Remove o role
    sessionStorage.removeItem('usuarioRole'); // Remove o role
    // Em uma aplicação real com DB, você faria uma chamada à API para invalidar a sessão no backend
    showCustomPopup('Logout', 'Você foi desconectado.', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Função para exibir um pop-up customizado (substitui alert())
function showCustomPopup(title, message, type = 'info') {
    if (!customPopupOverlay) return; // Garante que os elementos do pop-up existem

    customPopupTitle.textContent = title;
    customPopupMessage.textContent = message;

    customPopupTitle.classList.remove('success', 'error', 'warning');
    if (type === 'error') {
        customPopupTitle.style.color = 'var(--danger-color)';
    } else if (type === 'success') {
        customPopupTitle.style.color = 'var(--success-color)';
    } else if (type === 'warning') {
        customPopupTitle.style.color = 'var(--warning-color)';
    } else {
        customPopupTitle.style.color = 'var(--primary-color)';
    }

    customPopupOverlay.classList.remove('hidden');

    const closePopup = () => {
        customPopupOverlay.classList.add('hidden');
        customPopupCloseBtn.removeEventListener('click', closePopup);
        customPopupOverlay.removeEventListener('click', handleOverlayClick);
    };

    const handleOverlayClick = (e) => {
        if (e.target === customPopupOverlay) {
            closePopup();
        }
    };

    customPopupCloseBtn.addEventListener('click', closePopup);
    customPopupOverlay.addEventListener('click', handleOverlayClick);
}

// Função para exibir um pop-up de confirmação customizado (substitui confirm())
function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        if (!customConfirmOverlay) { // Garante que os elementos do pop-up existem
            resolve(false); // Retorna falso se o overlay não estiver pronto
            return;
        }

        customConfirmTitle.textContent = title;
        customConfirmMessage.textContent = message;
        customConfirmTitle.style.color = 'var(--warning-color)';

        customConfirmOverlay.classList.remove('hidden');

        const cleanup = () => {
            customConfirmOverlay.classList.add('hidden');
            customConfirmYesBtn.removeEventListener('click', onYes);
            customConfirmNoBtn.removeEventListener('click', onNo);
            customConfirmOverlay.removeEventListener('click', handleConfirmOverlayClick);
        };

        const onYes = () => {
            cleanup();
            resolve(true);
        };

        const onNo = () => {
            cleanup();
            resolve(false);
        };

        const handleConfirmOverlayClick = (e) => {
            if (e.target === customConfirmOverlay) {
                cleanup();
                resolve(false);
            }
        };

        customConfirmYesBtn.addEventListener('click', onYes);
        customConfirmNoBtn.addEventListener('click', onNo);
        customConfirmOverlay.addEventListener('click', handleConfirmOverlayClick);
    });
}

// --- VERIFICAÇÃO DE LOGIN (MODIFICADA: agora considera o role do usuário) ---
function checkLoginStatus() {
    let usuarioLogado = sessionStorage.getItem('usuarioLogado');
    let usuarioRole = sessionStorage.getItem('usuarioRole'); // Pega o role do sessionStorage

    if (!usuarioLogado) {
        usuarioLogado = localStorage.getItem('usuarioLogado');
        usuarioRole = localStorage.getItem('usuarioRole'); // Pega o role do localStorage
        if (usuarioLogado) {
            sessionStorage.setItem('usuarioLogado', usuarioLogado);
            sessionStorage.setItem('usuarioRole', usuarioRole); // Move o role para sessionStorage
        }
    }

    // Se o usuário não está logado E a página atual NÃO é a de login (index.html)
    if (!usuarioLogado && (window.location.pathname !== '/' && !window.location.pathname.includes('index.html'))) {
        window.location.href = 'index.html'; // Redireciona para a tela de login
        return false;
    }
    // Se o usuário está logado E a página atual É a de login, redireciona para a página de venda
    if (usuarioLogado && (window.location.pathname === '/' || window.location.pathname.includes('index.html'))) {
        window.location.href = 'venda.html';
        return true;
    }
    return !!usuarioLogado; // Retorna true se logado, false caso contrário
}

// NOVA FUNÇÃO: para verificar se o usuário logado é admin
function isUserAdmin() {
    const usuarioRole = sessionStorage.getItem('usuarioRole') || localStorage.getItem('usuarioRole');
    return usuarioRole === 'admin';
}

// --- LÓGICA DE TEMA CLARO/ESCURO ---
const themeToggleBtn = document.getElementById('theme-toggle-btn');

function applyTheme(theme) {
    document.body.classList.toggle('light-mode', theme === 'light');
    // Atualiza o ícone do botão com base no tema
    if (themeToggleBtn) {
        themeToggleBtn.querySelector('i').classList.toggle('fa-sun', theme === 'dark');
        themeToggleBtn.querySelector('i').classList.toggle('fa-moon', theme === 'light');
    }
}

function loadUserThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        // Padrão para tema escuro se não houver preferência salva
        applyTheme('dark'); 
    }
}

function toggleTheme() {
    const isLightMode = document.body.classList.contains('light-mode');
    const newTheme = isLightMode ? 'dark' : 'light';
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

// --- EVENT LISTENERS COMUNS (adicionados apenas após o DOM estar carregado) ---
document.addEventListener('DOMContentLoaded', () => {
    // Adiciona listener para o botão de alternar tema
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Carrega a preferência de tema do usuário ao carregar a página
    loadUserThemePreference();

    // Garante que os elementos do cabeçalho existem antes de adicionar listeners
    if (notificationsBtn && notificationsTab && notificationsList && notificationsBadge && clearNotificationsBtn && logoutBtn) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationsTab.classList.toggle('hidden');
        });

        notificationsTab.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        clearNotificationsBtn.addEventListener('click', () => {
            notificationsList.innerHTML = '<li>Nenhuma notificação.</li>';
            notificationsBadge.classList.add('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!notificationsTab.classList.contains('hidden')) {
                if (!notificationsTab.contains(e.target) && !notificationsBtn.contains(e.target)) {
                    notificationsTab.classList.add('hidden');
                }
            }
        });

        logoutBtn.addEventListener('click', logout);
    }
    
    // Adicione a verificação e exibição da seção de admin, se necessário
    const adminSectionLink = document.getElementById('admin-section-link'); // Ex: um link no menu
    if (adminSectionLink) {
        if (isUserAdmin()) {
            adminSectionLink.classList.remove('hidden'); // Mostra o link para admins
        } else {
            adminSectionLink.classList.add('hidden'); // Esconde para não-admins
        }
    }

    // Chama a verificação de login uma vez que o DOM esteja carregado
    checkLoginStatus();

    // NOTA: atualizarNotificacoesComuns será chamada por cada script de página (venda.js, estoque.js, controle.js)
    // após eles carregarem seus próprios dados de produtos da API.
});