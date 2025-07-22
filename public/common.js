// common.js

// Função para mostrar pop-ups personalizados
function showCustomPopup(title, message, type = 'info', additionalButtons = []) {
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupTitle = document.getElementById('custom-popup-title');
    const popupMessage = document.getElementById('custom-popup-message');
    const popupActions = document.querySelector('.custom-popup-actions'); // Seleciona a div de ações

    popupTitle.textContent = title;
    popupMessage.textContent = message;

    // Limpa botões existentes (exceto o OK padrão)
    popupActions.innerHTML = ''; 

    // Adiciona botões adicionais primeiro
    additionalButtons.forEach(btnConfig => {
        const btn = document.createElement('button');
        btn.id = btnConfig.id;
        btn.className = btnConfig.className || 'btn-secondary'; // Classe padrão
        btn.textContent = btnConfig.text;
        btn.onclick = () => {
            btnConfig.onClick(); // Executa a função do botão
            // Não ocultamos o popup aqui, a lógica da ação onClick pode decidir ocultar
            // hideCustomPopup(); // Oculta o popup após o clique (ajuste se não quiser ocultar)
        };
        popupActions.appendChild(btn);
    });

    // Adiciona o botão OK padrão por último
    const okButton = document.createElement('button');
    okButton.id = 'custom-popup-close-btn';
    okButton.className = 'btn-primary';
    okButton.textContent = 'OK';
    okButton.onclick = hideCustomPopup;
    popupActions.appendChild(okButton);

    // Adiciona classe de estilo com base no tipo
    popupOverlay.className = 'custom-popup-overlay'; // Reseta classes
    if (type === 'success') {
        popupOverlay.classList.add('success');
    } else if (type === 'error') {
        popupOverlay.classList.add('error');
    } else if (type === 'warning') {
        popupOverlay.classList.add('warning');
    } else {
        popupOverlay.classList.add('info');
    }

    popupOverlay.classList.remove('hidden');
}

// Função para esconder pop-ups
function hideCustomPopup() {
    const popupOverlay = document.getElementById('custom-popup-overlay');
    popupOverlay.classList.add('hidden');
}

// Função para mostrar pop-ups de confirmação
function showCustomConfirm(title, message) {
    return new Promise((resolve) => {
        const confirmOverlay = document.getElementById('custom-confirm-overlay');
        const confirmTitle = document.getElementById('custom-confirm-title');
        const confirmMessage = document.getElementById('custom-confirm-message');
        const confirmYesBtn = document.getElementById('custom-confirm-yes-btn');
        const confirmNoBtn = document.getElementById('custom-confirm-no-btn');

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;

        confirmOverlay.classList.remove('hidden');

        const handleYes = () => {
            confirmOverlay.classList.add('hidden');
            confirmYesBtn.removeEventListener('click', handleYes);
            confirmNoBtn.removeEventListener('click', handleNo);
            resolve(true);
        };

        const handleNo = () => {
            confirmOverlay.classList.add('hidden');
            confirmYesBtn.removeEventListener('click', handleYes);
            confirmNoBtn.removeEventListener('click', handleNo);
            resolve(false);
        };

        confirmYesBtn.addEventListener('click', handleYes);
        confirmNoBtn.addEventListener('click', handleNo);
    });
}

// Lógica para alternar tema (Dark/Light Mode)
document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.body.setAttribute('data-theme', currentTheme);
        themeToggleBtn.innerHTML = currentTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

        themeToggleBtn.addEventListener('click', () => {
            let theme = document.body.getAttribute('data-theme');
            if (theme === 'dark') {
                theme = 'light';
            } else {
                theme = 'dark';
            }
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeToggleBtn.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    // Lógica para notificações (exemplo simples)
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsTab = document.getElementById('notifications-tab');
    const notificationsBadge = document.getElementById('notifications-badge');
    const notificationsList = document.getElementById('notifications-list');
    const clearNotificationsBtn = document.getElementById('clear-notifications-btn');

    let notificationCount = 0;
    let notifications = [];

    // Função para adicionar notificação
    window.addNotification = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        const notification = { message, type, timestamp };
        notifications.unshift(notification); // Adiciona no início
        notificationCount++;
        updateNotificationDisplay();
    };

    // Função para atualizar o display de notificações
    function updateNotificationDisplay() {
        if (notificationsBadge) {
            notificationsBadge.textContent = notificationCount;
            notificationsBadge.classList.toggle('hidden', notificationCount === 0);
        }

        if (notificationsList) {
            notificationsList.innerHTML = '';
            if (notifications.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'Nenhuma notificação.';
                notificationsList.appendChild(li);
            } else {
                notifications.forEach(n => {
                    const li = document.createElement('li');
                    li.className = `notification-item notification-${n.type}`;
                    li.innerHTML = `<span>${n.timestamp}</span> - ${n.message}`;
                    notificationsList.appendChild(li);
                });
            }
        }
    }

    // Exemplo de uso:
    // addNotification('Bem-vindo ao sistema!', 'info');
    // addNotification('Estoque baixo para o produto X!', 'warning');

    if (notificationsBtn) {
        notificationsBtn.addEventListener('click', () => {
            notificationsTab.classList.toggle('hidden');
            if (!notificationsTab.classList.contains('hidden')) {
                // Ao abrir, marcar como lidas (opcional)
                notificationCount = 0;
                updateNotificationDisplay();
            }
        });
    }

    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', () => {
            notifications = [];
            notificationCount = 0;
            updateNotificationDisplay();
            showCustomPopup('Notificações', 'Todas as notificações foram limpas.', 'info');
        });
    }

    // Exemplo de notificação de estoque baixo (pode ser chamada de venda.js)
    window.atualizarNotificacoesComuns = () => {
        // Esta função seria chamada de venda.js ou estoque.js
        // para adicionar notificações de estoque baixo, por exemplo.
        // Por enquanto, é apenas um placeholder.
    };
});