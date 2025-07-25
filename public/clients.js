// public/clients.js

document.addEventListener('DOMContentLoaded', async () => {
    // ==== Seleção de Elementos do DOM ====
    // Referências para o novo modal de edição de clientes
    const editClientModalOverlay = document.getElementById('edit-client-modal-overlay');
    const clientFormModal = document.getElementById('client-form-modal'); // Referência ao formulário dentro do modal

    const clientIdInput = document.getElementById('client-id');
    const clientNameInput = document.getElementById('client-name');
    const clientPhoneInput = document.getElementById('client-phone');
    const clientAddressInput = document.getElementById('client-address');
    const clientCpfInput = document.getElementById('client-cpf');
    const saveClientBtn = document.getElementById('save-client-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const clientsTableBody = document.getElementById('clients-table-body');

    // Funções de utilidade para popups (assumindo que common.js as fornece ou as duplique aqui)
    // Usando as funções showCustomPopup e showCustomConfirm do common.js
    // Certifique-se de que common.js carrega antes de clients.js no HTML.
    // function showPopup, showConfirm, formatPhone, formatCpf
    // Já que common.js define showCustomPopup e showCustomConfirm, vou remover as duplicatas daqui para evitar conflito.

    // ==== Funções de Utilidade (se não estiverem em common.js, elas devem ser mantidas) ====
    // Verifique se showCustomPopup e showCustomConfirm estão realmente em common.js.
    // Se não, você precisará ter essas definições ou incluir common.js primeiro.

    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
        if (match) {
            return `(${match[1]})${match[2]}-${match[3]}`;
        }
        return phone;
    }

    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = ('' + cpf).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
        if (match) {
            return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
        }
        return cpf;
    }

    // ==== Funções de Controle de Modal (similar ao estoque.js) ====
    const openModal = (overlay) => {
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex'; // Garante que o display é flex para centralizar
    };

    const closeModal = (overlay) => {
        overlay.classList.add('hidden');
        overlay.style.display = 'none'; // Esconde completamente o modal
        clientFormModal.reset(); // Limpa o formulário quando o modal é fechado
    };


    // ==== Funções de API ====

    async function fetchClients() {
        clientsTableBody.innerHTML = '<tr><td colspan="5">Carregando clientes...</td></tr>';
        try {
            const response = await fetch('/api/clients');
            if (!response.ok) {
                // Usando showCustomPopup do common.js
                throw new Error('Erro ao buscar clientes.');
            }
            const clients = await response.json();
            renderClients(clients);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            clientsTableBody.innerHTML = `<tr><td colspan="5" style="color: var(--color-danger);">Erro ao carregar clientes: ${error.message}</td></tr>`;
            if (typeof showCustomPopup === 'function') { // Verifica se showCustomPopup está disponível
                showCustomPopup('Erro ao Carregar', error.message, 'error');
            }
        }
    }

    async function saveClient() {
        const id = clientIdInput.value;
        const name = clientNameInput.value.trim();
        const phone = clientPhoneInput.value.trim();
        const address = clientAddressInput.value.trim();
        const cpf = clientCpfInput.value.trim(); // CPF não é salvo como hash aqui, mas enviado para o backend

        if (!name || (!id && !cpf)) { // CPF é obrigatório apenas para novas criações
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro de Cadastro', 'Nome e CPF são obrigatórios para novos clientes. Nome é obrigatório para atualização.', 'error');
            }
            return;
        }

        const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
        if (phone && !phoneRegex.test(phone)) {
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro de Cadastro', 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.', 'error');
            }
            return;
        }

        const clientData = { name, phone, address };
        let url = '/api/clients';
        let method = 'POST';

        if (id) { // Se houver um ID, é uma edição (PUT)
            url = `/api/clients?id=${id}`; // O ID É ENVIADO COMO PARÂMETRO DE CONSULTA PARA O BACKEND
            method = 'PUT';
            // Para PUT, o CPF não deve ser enviado pois ele é o que o hash foi feito com base
            // Se precisar editar CPF, seria um caso mais complexo de "alterar CPF" no backend
            // delete clientData.cpf; // Não precisamos deletar se nunca adicionamos
        } else { // Se não houver ID, é uma nova criação (POST)
            clientData.cpf = cpf; // Adiciona CPF apenas para criação
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erro ao ${id ? 'atualizar' : 'adicionar'} cliente.`);
            }

            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Sucesso', `Cliente ${id ? 'atualizado' : 'adicionado'} com sucesso!`, 'success', () => {
                    closeModal(editClientModalOverlay); // Fecha o modal
                    fetchClients(); // Recarrega a lista
                });
            } else {
                 closeModal(editClientModalOverlay); // Fecha o modal mesmo sem popup
                 fetchClients();
            }


        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro ao Salvar Cliente', error.message, 'error');
            }
        }
    }

    async function deleteClient(id) {
        if (typeof showCustomConfirm === 'function') {
            const confirm = await showCustomConfirm('Confirmar Exclusão', 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
            if (!confirm) return;
        } else {
             if (!confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) return;
        }

        try {
            const response = await fetch(`/api/clients?id=${id}`, { // ID enviado como query parameter
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao excluir cliente.');
            }

            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Sucesso', 'Cliente excluído com sucesso!', 'success', fetchClients); // Recarrega a lista
            } else {
                fetchClients(); // Recarrega mesmo sem popup
            }

        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro ao Excluir Cliente', error.message, 'error');
            }
        }
    }

    // ==== Funções de UI ====

    function renderClients(clients) {
        clientsTableBody.innerHTML = '';
        if (clients.length === 0) {
            clientsTableBody.innerHTML = '<tr><td colspan="5">Nenhum cliente cadastrado.</td></tr>';
            return;
        }

        clients.forEach(client => {
            const row = clientsTableBody.insertRow();
            row.innerHTML = `
                <td>${client.id}</td>
                <td>${client.name}</td>
                <td>${formatPhone(client.phone) || 'N/A'}</td>
                <td>${client.address || 'N/A'}</td>
                <td class="client-actions">
                    <button class="btn-icon btn-edit-client" data-id="${client.id}" data-name="${client.name}" data-phone="${client.phone || ''}" data-address="${client.address || ''}" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-delete-client" data-id="${client.id}" title="Excluir Cliente"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
    }

    function editClient(client) {
        clientIdInput.value = client.id;
        clientNameInput.value = client.name;
        clientPhoneInput.value = client.phone;
        clientAddressInput.value = client.address;
        clientCpfInput.value = ''; // CPF não é editável diretamente aqui por segurança (hash)
        clientCpfInput.disabled = true; // Desabilita o campo CPF na edição
        saveClientBtn.textContent = 'Atualizar Cliente';
        // O botão cancelar não precisa mais ser explicitamente escondido/mostrado, pois o modal lida com isso.
        // cancelEditBtn.classList.remove('hidden'); // Removido: o modal controla a visibilidade

        openModal(editClientModalOverlay); // Abre o modal de edição
    }

    function clearForm() {
        clientIdInput.value = '';
        clientNameInput.value = '';
        clientPhoneInput.value = '';
        clientAddressInput.value = '';
        clientCpfInput.value = '';
        clientCpfInput.disabled = false; // Habilita o campo CPF para nova criação
        saveClientBtn.textContent = 'Salvar Cliente';
        // cancelEditBtn.classList.add('hidden'); // Removido: o modal controla a visibilidade
        clientFormModal.reset(); // Garante que o formulário é resetado
    }

    // ==== Listeners de Eventos ====
    // O formulário do modal agora tem o ID client-form-modal
    clientFormModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveClient();
    });

    cancelEditBtn.addEventListener('click', () => {
        clearForm();
        closeModal(editClientModalOverlay); // Fecha o modal ao cancelar
    });

    // Listener para abrir o modal para adicionar um NOVO cliente (opcional, adicione um botão no HTML se quiser)
    // Se você tiver um botão "Adicionar Novo Cliente" no HTML, pode adicionar um listener aqui:
    /*
    const addNewClientBtn = document.getElementById('add-new-client-btn'); // Adicione este ID no seu HTML
    if (addNewClientBtn) {
        addNewClientBtn.addEventListener('click', () => {
            clearForm();
            openModal(editClientModalOverlay);
            saveClientBtn.textContent = 'Adicionar Cliente'; // Certifica que o texto está correto para adicionar
        });
    }
    */

    clientsTableBody.addEventListener('click', (event) => {
        if (event.target.closest('.btn-edit-client')) {
            const btn = event.target.closest('.btn-edit-client');
            const clientData = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                phone: btn.dataset.phone,
                address: btn.dataset.address
            };
            editClient(clientData);
        } else if (event.target.closest('.btn-delete-client')) {
            const id = event.target.closest('.btn-delete-client').dataset.id;
            deleteClient(id);
        }
    });

    // Fechar modal ao clicar fora dele
    editClientModalOverlay.addEventListener('click', (e) => {
        if (e.target === editClientModalOverlay) {
            clearForm(); // Limpa o formulário se fechar clicando fora
            closeModal(editClientModalOverlay);
        }
    });


    // Masks para telefone e CPF
    clientPhoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
        if (value.length > 0) {
            value = '(' + value;
            if (value.length > 3) {
                value = value.substring(0, 3) + ')' + value.substring(3);
            }
            if (value.length > 9) { // Para 5 dígitos no meio (99999)
                value = value.substring(0, 9) + '-' + value.substring(9);
            } else if (value.length > 8 && value.length < 10) { // Para 4 dígitos no meio (9999)
                 value = value.substring(0, 8) + '-' + value.substring(8);
            }
            if (value.length > 14) { // Limita o tamanho total (ex: (99)99999-9999)
                value = value.substring(0, 14);
            }
        }
        e.target.value = value;
    });

    clientCpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove não-dígitos
        if (value.length > 0) {
            if (value.length > 3) {
                value = value.substring(0, 3) + '.' + value.substring(3);
            }
            if (value.length > 7) {
                value = value.substring(0, 7) + '.' + value.substring(7);
            }
            if (value.length > 11) {
                value = value.substring(0, 11) + '-' + value.substring(11);
            }
            if (value.length > 14) { // Limita o tamanho total (ex: 999.999.999-99)
                value = value.substring(0, 14);
            }
        }
        e.target.value = value;
    });

    // ==== Inicialização ====
    fetchClients(); // Carrega a lista de clientes ao carregar a página
    clearForm(); // Limpa o formulário e configura o estado inicial
});