// public/clients.js

document.addEventListener('DOMContentLoaded', async () => {
    // ==== Seleção de Elementos do DOM ====
    const clientIdInput = document.getElementById('client-id');
    const clientNameInput = document.getElementById('client-name');
    const clientPhoneInput = document.getElementById('client-phone');
    const clientAddressInput = document.getElementById('client-address');
    const clientCpfInput = document.getElementById('client-cpf');
    const saveClientBtn = document.getElementById('save-client-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const clientsTableBody = document.getElementById('clients-table-body');

    // Funções de utilidade para popups (assumindo que common.js as fornece ou as duplique aqui)
    function showPopup(title, message, isError = false, callback = null) {
        const popupOverlay = document.getElementById('custom-popup-overlay');
        const popupTitle = document.getElementById('custom-popup-title');
        const popupMessage = document.getElementById('custom-popup-message');
        const popupCloseBtn = document.getElementById('custom-popup-close-btn');

        popupTitle.textContent = title;
        popupMessage.textContent = message;
        popupOverlay.classList.remove('hidden');

        if (isError) {
            popupTitle.style.color = 'var(--color-danger)';
        } else {
            popupTitle.style.color = '';
        }

        popupCloseBtn.onclick = () => {
            popupOverlay.classList.add('hidden');
            if (callback) callback();
        };
    }

    function showConfirm(title, message, onConfirm, onCancel = null) {
        const confirmOverlay = document.getElementById('custom-confirm-overlay');
        const confirmTitle = document.getElementById('custom-confirm-title');
        const confirmMessage = document.getElementById('custom-confirm-message');
        const confirmYesBtn = document.getElementById('custom-confirm-yes-btn');
        const confirmNoBtn = document.getElementById('custom-confirm-no-btn');

        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmOverlay.classList.remove('hidden');

        confirmYesBtn.onclick = () => {
            confirmOverlay.classList.add('hidden');
            onConfirm();
        };
        confirmNoBtn.onclick = () => {
            confirmOverlay.classList.add('hidden');
            if (onCancel) onCancel();
        };
    }

    // Função para formatar telefone (repetida para garantir funcionamento independente)
    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
        if (match) {
            return `(${match[1]})${match[2]}-${match[3]}`;
        }
        return phone;
    }

    // Função para formatar CPF (repetida para garantir funcionamento independente)
    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = ('' + cpf).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
        if (match) {
            return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
        }
        return cpf;
    }


    // ==== Funções de API ====

    async function fetchClients() {
        clientsTableBody.innerHTML = '<tr><td colspan="5">Carregando clientes...</td></tr>';
        try {
            const response = await fetch('/api/clients');
            if (!response.ok) {
                throw new Error('Erro ao buscar clientes.');
            }
            const clients = await response.json();
            renderClients(clients);
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            clientsTableBody.innerHTML = `<tr><td colspan="5" style="color: var(--color-danger);">Erro ao carregar clientes: ${error.message}</td></tr>`;
        }
    }

    async function saveClient() {
        const id = clientIdInput.value;
        const name = clientNameInput.value.trim();
        const phone = clientPhoneInput.value.trim();
        const address = clientAddressInput.value.trim();
        const cpf = clientCpfInput.value.trim(); // CPF não é salvo como hash aqui, mas enviado para o backend

        if (!name || !cpf) {
            showPopup('Erro de Cadastro', 'Nome e CPF são obrigatórios.', true);
            return;
        }

        const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
        if (phone && !phoneRegex.test(phone)) {
            showPopup('Erro de Cadastro', 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.', true);
            return;
        }

        const clientData = { name, phone, address, cpf };
        let url = '/api/clients';
        let method = 'POST';

        if (id) { // Se houver um ID, é uma edição (PUT)
            url = `/api/clients?id=${id}`; // AGORA O ID É ENVIADO COMO PARÂMETRO DE CONSULTA
            method = 'PUT';
            // Para PUT, o CPF não deve ser enviado pois ele é o que o hash foi feito com base
            // Se precisar editar CPF, seria um caso mais complexo de "alterar CPF" no backend
            delete clientData.cpf;
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

            showPopup('Sucesso', `Cliente ${id ? 'atualizado' : 'adicionado'} com sucesso!`, false, () => {
                clearForm();
                fetchClients(); // Recarrega a lista
            });

        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            showPopup('Erro ao Salvar Cliente', error.message, true);
        }
    }

    async function deleteClient(id) {
        showConfirm('Confirmar Exclusão', 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.', async () => {
            try {
                // Modificado para enviar ID como query parameter, igual ao PUT
                const response = await fetch(`/api/clients?id=${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erro ao excluir cliente.');
                }

                showPopup('Sucesso', 'Cliente excluído com sucesso!', false, fetchClients); // Recarrega a lista
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                showPopup('Erro ao Excluir Cliente', error.message, true);
            }
        });
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
        cancelEditBtn.classList.remove('hidden'); // Mostra o botão cancelar
    }

    function clearForm() {
        clientIdInput.value = '';
        clientNameInput.value = '';
        clientPhoneInput.value = '';
        clientAddressInput.value = '';
        clientCpfInput.value = '';
        clientCpfInput.disabled = false; // Habilita o campo CPF
        saveClientBtn.textContent = 'Salvar Cliente';
        cancelEditBtn.classList.add('hidden'); // Esconde o botão cancelar
    }

    // ==== Listeners de Eventos ====
    saveClientBtn.addEventListener('click', saveClient);
    cancelEditBtn.addEventListener('click', clearForm);

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