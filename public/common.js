// public/common.js
// Lógica de verificação de login, logout e notificações (compartilhada entre todas as páginas)

// --- VERIFICAÇÃO DE LOGIN ---

// Verifica se o usuário está logado usando sessionStorage (para "não manter conectado")
// ou localStorage (para "manter conectado").
let usuarioLogado = sessionStorage.getItem('usuarioLogado');

// Se não estiver em sessionStorage, tenta localStorage
if (!usuarioLogado) {
    usuarioLogado = localStorage.getItem('usuarioLogado');
    // Se encontrou no localStorage, mas não no sessionStorage (ex: primeira carga após fechar navegador)
    // então copia para sessionStorage para gerenciar a sessão ativa.
    if (usuarioLogado) {
        sessionStorage.setItem('usuarioLogado', usuarioLogado);
    }
}


if (!usuarioLogado) {
    // Se não encontrou em nenhum dos dois, redireciona para a tela de login
    window.location.href = 'index.html';
}

// O restante do seu common.js segue aqui...

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
    // Ao deslogar, remove de ambos para garantir que não haja persistência indesejada
    localStorage.removeItem('usuarioLogado');
    sessionStorage.removeItem('usuarioLogado');
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