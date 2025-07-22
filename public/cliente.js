// public/clientes.js
// Lógica específica da tela de Cadastro de Clientes

if (document.body.id === 'page-clientes' || location.pathname.includes('clientes.html')) {

    // --- ELEMENTOS DO DOM ---
    const filtroClientesInput = document.getElementById('filtro-clientes');
    const listaClientes = document.getElementById('lista-clientes');

    // Modais e Formulário
    const clienteModalOverlay = document.getElementById('cliente-modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const clienteForm = document.getElementById('cliente-form');
    const clienteIdInput = document.getElementById('cliente-id');
    const clienteNomeInput = document.getElementById('cliente-nome');
    const clienteEnderecoInput = document.getElementById('cliente-endereco');
    const clienteNumeroInput = document.getElementById('cliente-numero');
    const clienteCpfInput = document.getElementById('cliente-cpf');
    const saveClienteBtn = document.getElementById('save-cliente-btn');
    const deleteClienteBtn = document.getElementById('delete-cliente-btn');
    const cancelClienteBtn = document.getElementById('cancel-cliente-btn');
    const openAddModalBtn = document.getElementById('open-add-modal-btn');

    // --- ESTADO DA APLICAÇÃO ---
    let clientes = [];

    // --- FUNÇÕES AUXILIARES ---

    // Reutiliza a função de requisição à API do common.js ou define localmente se necessário
    // Assumindo que `fazerRequisicaoApi` é globalmente disponível via common.js
    async function fazerRequisicaoApi(url, method, data = {}) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (method !== 'GET' && method !== 'HEAD') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const responseData = await response.json().catch(() => null); 
        
        if (!response.ok) {
            throw new Error(responseData?.error || `Erro na requisição ${method} ${url}: Status ${response.status}`);
        }
        return responseData;
    }

    const openModal = (overlay) => overlay.classList.remove('hidden');
    const closeModal = (overlay) => {
        overlay.classList.add('hidden');
        clienteForm.reset();
        clienteIdInput.value = ''; // Limpa o ID oculto
        deleteClienteBtn.classList.add('hidden'); // Esconde o botão de excluir por padrão
        modalTitle.textContent = ''; // Limpa o título do modal
    }

    function formatCpf(cpf) {
        // Remove tudo que não for dígito
        cpf = cpf.replace(/\D/g, '');
        // Adiciona a formatação: 000.000.000-00
        return cpf.replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }

    // --- FUNÇÕES DE CLIENTES ---

    async function carregarClientes() {
        try {
            clientes = await fazerRequisicaoApi('/api/clientes', 'GET');
            renderizarListaClientes();
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            showCustomPopup('Erro', 'Não foi possível carregar os clientes do servidor.', 'error');
        }
    }

    function renderizarListaClientes() {
        listaClientes.innerHTML = '';
        const filtro = filtroClientesInput.value.toLowerCase();
        const clientesFiltrados = clientes.filter(c =>
            c.nome.toLowerCase().includes(filtro) ||
            // No frontend, se precisar mostrar o CPF para filtro,
            // você precisaria de uma versão não-hashed. Por segurança,
            // a API não retorna o CPF, então o filtro por CPF seria apenas no backend
            // com base no hash, ou um campo de pesquisa separado que force exatidão.
            // Aqui, filtro apenas por nome.
            c.endereco.toLowerCase().includes(filtro)
        );

        if (clientesFiltrados.length === 0) {
            listaClientes.innerHTML = `<li style="justify-content: center; color: var(--text-muted);">${filtro ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</li>`;
            return;
        }

        clientesFiltrados.forEach((cliente) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${cliente.nome}</span>
                    <span class="product-quantity">${cliente.endereco}, ${cliente.numero}</span>
                    <span class="product-price">CPF: ****.${cliente.cpf_hash.substring(cliente.cpf_hash.length - 4)}</span> </div>
                <div class="actions">
                    <button class="btn-action btn-edit" title="Editar Cliente" data-id="${cliente.id}"><i class="fas fa-pencil-alt"></i></button>
                </div>
            `;
            listaClientes.appendChild(li);
        });
    }

    async function handleSubmitCliente(e) {
        e.preventDefault();

        const id = clienteIdInput.value;
        const nome = clienteNomeInput.value.trim();
        const endereco = clienteEnderecoInput.value.trim();
        const numero = clienteNumeroInput.value.trim();
        const cpf = clienteCpfInput.value.trim(); // CPF will be validated and hashed in backend

        if (!nome || !endereco || !numero || !cpf) {
            showCustomPopup('Erro', 'Por favor, preencha todos os campos obrigatórios.', 'error');
            return;
        }

        const clienteData = { nome, endereco, numero, cpf };
        
        try {
            if (id) { // Editando cliente existente
                await fazerRequisicaoApi(`/api/clientes?id=${id}`, 'PUT', clienteData);
                showCustomPopup('Sucesso', 'Cliente atualizado com sucesso!', 'success');
            } else { // Adicionando novo cliente
                await fazerRequisicaoApi('/api/clientes', 'POST', clienteData);
                showCustomPopup('Sucesso', 'Cliente cadastrado com sucesso!', 'success');
            }
            closeModal(clienteModalOverlay);
            await carregarClientes(); // Recarrega a lista
        } catch (error) {
            console.error('Erro ao salvar cliente:', error);
            showCustomPopup('Erro', error.message || 'Não foi possível salvar o cliente.', 'error');
        }
    }

    async function handleDeleteCliente() {
        const id = clienteIdInput.value;
        if (!id) return;

        const confirmDelete = await showCustomConfirm('Confirmação', 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.');
        if (confirmDelete) {
            try {
                await fazerRequisicaoApi(`/api/clientes?id=${id}`, 'DELETE');
                showCustomPopup('Sucesso', 'Cliente excluído com sucesso!', 'success');
                closeModal(clienteModalOverlay);
                await carregarClientes();
            } catch (error) {
                console.error('Erro ao excluir cliente:', error);
                showCustomPopup('Erro', error.message || 'Não foi possível excluir o cliente.', 'error');
            }
        }
    }

    // --- EVENT LISTENERS ---

    openAddModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Adicionar Novo Cliente';
        deleteClienteBtn.classList.add('hidden'); // Garante que o botão excluir está escondido ao adicionar
        openModal(clienteModalOverlay);
    });

    cancelClienteBtn.addEventListener('click', () => closeModal(clienteModalOverlay));
    clienteModalOverlay.addEventListener('click', (e) => {
        if(e.target === clienteModalOverlay) closeModal(clienteModalOverlay);
    });

    clienteForm.addEventListener('submit', handleSubmitCliente);
    deleteClienteBtn.addEventListener('click', handleDeleteCliente);

    listaClientes.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (editBtn) {
            const id = parseInt(editBtn.dataset.id);
            const clienteToEdit = clientes.find(c => c.id === id);
            if (clienteToEdit) {
                modalTitle.textContent = 'Editar Cliente';
                clienteIdInput.value = clienteToEdit.id;
                clienteNomeInput.value = clienteToEdit.nome;
                clienteEnderecoInput.value = clienteToEdit.endereco;
                clienteNumeroInput.value = clienteToEdit.numero;
                // NOTA: Não é possível popular o CPF original aqui, pois a API não o retorna por LGPD.
                // O usuário teria que digitar novamente se fosse necessário alterar.
                clienteCpfInput.value = ''; // Limpar CPF para que o usuário digite novamente se for alterar
                deleteClienteBtn.classList.remove('hidden'); // Mostra o botão excluir ao editar
                openModal(clienteModalOverlay);
            }
        }
    });

    filtroClientesInput.addEventListener('input', renderizarListaClientes);

    clienteCpfInput.addEventListener('input', (e) => {
        // Remove caracteres não numéricos enquanto digita
        let value = e.target.value.replace(/\D/g, '');
        // Limita a 11 caracteres para CPF
        if (value.length > 11) {
            value = value.substring(0, 11);
        }
        e.target.value = formatCpf(value);
    });

    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', carregarClientes);
}