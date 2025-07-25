// public/clients.js

document.addEventListener('DOMContentLoaded', async () => {
    // ==== Seleção de Elementos do DOM ====
    // Seção de Controles
    const filtroClientesInput = document.getElementById('filtro-clientes');
    const openAddClientModalBtn = document.getElementById('open-add-client-modal-btn');

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
    // MUDANÇA AQUI: Agora a referência é para a UL, não para o tbody da tabela
    const clientsList = document.getElementById('clients-list'); //

    // Variável para armazenar todos os clientes (para filtro local)
    let allClients = [];

    // Funções de utilidade para popups (assumindo que common.js as fornece)
    // showCustomPopup e showCustomConfirm

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
        clientsList.innerHTML = '<li>Carregando clientes...</li>'; // Ajuste para <li>
        try {
            const response = await fetch('/api/clients');
            if (!response.ok) {
                throw new Error('Erro ao buscar clientes.');
            }
            allClients = await response.json(); // Armazena todos os clientes
            renderClients(); // Renderiza com base na lista completa (ou filtrada)
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            clientsList.innerHTML = `<li style="color: var(--danger-color);">Erro ao carregar clientes: ${error.message}</li>`; // Ajuste para <li>
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro ao Carregar', error.message, 'error');
            }
        }
    }

    async function saveClient() {
        const id = clientIdInput.value;
        let name = clientNameInput.value.trim();
        let phone = clientPhoneInput.value.trim();
        let address = clientAddressInput.value.trim();
        const cpf = clientCpfInput.value.trim();

        // CONVERTER DADOS PARA MAIÚSCULAS ANTES DE ENVIAR PARA A API
        name = name ? name.toUpperCase() : null;
        phone = phone ? phone.toUpperCase() : null;
        address = address ? address.toUpperCase() : null;


        if (!name || (!id && !cpf)) {
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

        if (id) {
            url = `/api/clients?id=${id}`;
            method = 'PUT';
        } else {
            clientData.cpf = cpf;
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
                    closeModal(editClientModalOverlay);
                    fetchClients();
                });
            } else {
                 closeModal(editClientModalOverlay);
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
        let confirmDelete = true;
        if (typeof showCustomConfirm === 'function') {
            confirmDelete = await showCustomConfirm('Confirmar Exclusão', 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
        } else {
             confirmDelete = confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
        }

        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/clients?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao excluir cliente.');
            }

            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Sucesso', 'Cliente excluído com sucesso!', 'success', fetchClients);
            } else {
                fetchClients();
            }

        } catch (error) {
            console.error('Erro ao excluir cliente:', error);
            if (typeof showCustomPopup === 'function') {
                showCustomPopup('Erro ao Excluir Cliente', error.message, 'error');
            }
        }
    }

    // ==== Funções de UI ====

    function renderClients() {
        clientsList.innerHTML = ''; // Limpa a UL
        const filtro = filtroClientesInput.value.toUpperCase();
        
        const clientsFiltered = allClients.filter(client =>
            client.name.toUpperCase().includes(filtro) ||
            (client.phone && client.phone.toUpperCase().includes(filtro)) ||
            (client.address && client.address.toUpperCase().includes(filtro))
        );

        if (clientsFiltered.length === 0) {
            clientsList.innerHTML = `<li>Nenhum cliente ${filtro ? 'encontrado com o filtro' : 'cadastrado'}.</li>`; // Ajuste para <li>
            return;
        }

        clientsFiltered.forEach(client => {
            const li = document.createElement('li'); // Cria um LI
            // Não precisa de classList.add('product-item') aqui, pois o UL já é 'product-list' e o estilo já se aplica aos LIs.
            // A classe 'product-item' é mais usada no estoque para cada LI individual.
            // Para consistência visual, é bom aplicar a mesma estrutura e classes internas.
            li.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${client.name}</span>
                    <span class="client-detail">Tel: ${formatPhone(client.phone) || 'N/A'}</span>
                    <span class="client-detail">End: ${client.address || 'N/A'}</span>
                </div>
                <div class="actions">
                    <button class="btn-action btn-edit" data-id="${client.id}" data-name="${client.name}" data-phone="${client.phone || ''}" data-address="${client.address || ''}" title="Editar Cliente"><i class="fas fa-pencil-alt"></i></button>
                    <button class="btn-action btn-danger" data-id="${client.id}" title="Excluir Cliente"><i class="fas fa-trash"></i></button>
                </div>
            `;
            clientsList.appendChild(li); // Adiciona o LI à UL
        });
    }

    function editClient(client) {
        clientIdInput.value = client.id;
        clientNameInput.value = client.name;
        clientPhoneInput.value = client.phone;
        clientAddressInput.value = client.address;
        clientCpfInput.value = '';
        clientCpfInput.disabled = true;
        saveClientBtn.textContent = 'Atualizar Cliente';

        openModal(editClientModalOverlay);
    }

    function clearForm() {
        clientIdInput.value = '';
        clientNameInput.value = '';
        clientPhoneInput.value = '';
        clientAddressInput.value = '';
        clientCpfInput.value = '';
        clientCpfInput.disabled = false;
        saveClientBtn.textContent = 'Salvar Cliente';
        clientFormModal.reset();
    }

    // ==== Listeners de Eventos ====
    clientFormModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveClient();
    });

    cancelEditBtn.addEventListener('click', () => {
        clearForm();
        closeModal(editClientModalOverlay);
    });

    openAddClientModalBtn.addEventListener('click', () => {
        clearForm();
        openModal(editClientModalOverlay);
        saveClientBtn.textContent = 'Salvar Cliente';
    });

    // MUDANÇA AQUI: O listener agora está na UL, não no tbody
    clientsList.addEventListener('click', (event) => {
        if (event.target.closest('.btn-edit')) {
            const btn = event.target.closest('.btn-edit');
            const clientData = {
                id: btn.dataset.id,
                name: btn.dataset.name,
                phone: btn.dataset.phone,
                address: btn.dataset.address
            };
            editClient(clientData);
        } else if (event.target.closest('.btn-danger')) {
            const id = event.target.closest('.btn-danger').dataset.id;
            deleteClient(id);
        }
    });

    editClientModalOverlay.addEventListener('click', (e) => {
        if (e.target === editClientModalOverlay) {
            clearForm();
            closeModal(editClientModalOverlay);
        }
    });

    filtroClientesInput.addEventListener('input', renderClients);

    clientPhoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            value = '(' + value;
            if (value.length > 3) {
                value = value.substring(0, 3) + ')' + value.substring(3);
            }
            if (value.length > 9) {
                value = value.substring(0, 9) + '-' + value.substring(9);
            } else if (value.length > 8 && value.length < 10) {
                 value = value.substring(0, 8) + '-' + value.substring(8);
            }
            if (value.length > 14) {
                value = value.substring(0, 14);
            }
        }
        e.target.value = value;
    });

    clientCpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
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
            if (value.length > 14) {
                value = value.substring(0, 14);
            }
        }
        e.target.value = value;
    });

    // ==== Inicialização ====
    fetchClients();
    clearForm();
});