// public/common.js
// Lógica de verificação de login, logout e notificações (compartilhada entre todas as páginas)

// --- VERIFICAÇÃO DE LOGIN ---
if (!localStorage.getItem('usuarioLogado')) {
    window.location.href = 'index.html';
}

// --- ELEMENTOS DO DOM (comuns) ---
const notificationsBtn = document.getElementById('notifications-btn');
const notificationsTab = document.getElementById('notifications-tab');
const notificationsList = document.getElementById('notifications-list');
const notificationsBadge = document.getElementById('notifications-badge');
const clearNotificationsBtn = document.getElementById('clear-notifications-btn');
const logoutBtn = document.getElementById('logout-btn');

// --- FUNÇÕES COMUNS ---

// Função para renderizar notificações (agora buscará produtos de qualquer página)
function renderizarNotificacoesComuns() {
    let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
    let notifications = [];

    produtos.forEach(produto => {
        if (produto.quantidade < produto.min_quantidade) {
            const notificationText = `<strong>${produto.nome}</strong> está com estoque baixo! (${produto.quantidade} de ${produto.min_quantidade})`;
            notifications.push(notificationText);
        }
    });

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

function logout() {
    localStorage.removeItem('usuarioLogado');
    window.location.href = 'index.html';
}

// --- EVENT LISTENERS COMUNS ---

// Alterna a visibilidade do painel de notificações
notificationsBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Impede que o clique no botão se propague para o document e feche imediatamente
    notificationsTab.classList.toggle('hidden');
});

// Adiciona um event listener para impedir a propagação de cliques dentro do painel de notificação
notificationsTab.addEventListener('click', (e) => {
    e.stopPropagation();
});

clearNotificationsBtn.addEventListener('click', () => {
    notificationsList.innerHTML = '<li>Nenhuma notificação.</li>';
    notificationsBadge.classList.add('hidden');
});

// Fecha a notificação se clicar em qualquer lugar FORA do painel de notificação e FORA do botão de notificação
document.addEventListener('click', (e) => {
    // Se o painel de notificação estiver visível
    if (!notificationsTab.classList.contains('hidden')) {
        // E o clique não foi dentro do painel de notificação E o clique não foi dentro do botão de notificação
        // Com o stopPropagation no notificationsTab, este `if` será true apenas se o clique for fora de ambos.
        if (!notificationsTab.contains(e.target) && !notificationsBtn.contains(e.target)) {
            notificationsTab.classList.add('hidden');
        }
    }
});


logoutBtn.addEventListener('click', logout);

// --- INICIALIZAÇÃO COMUM ---
document.addEventListener('DOMContentLoaded', renderizarNotificacoesComuns);