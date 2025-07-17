// estoque.js
// Lógica específica da tela de Estoque

// Garante que o código só rode na página de estoque
if (document.body.id === 'page-estoque' || location.pathname.includes('estoque.html')) {

  // --- ELEMENTOS DO DOM (tela de Estoque) ---
  const filtroInput = document.getElementById('filtro');
  const listaProdutos = document.getElementById('lista-produtos');

  // --- MODAIS ---
  const openAddModalBtn = document.getElementById('open-add-modal-btn');
  const addModalOverlay = document.getElementById('add-modal-overlay');
  const addForm = document.getElementById('add-form');
  const addNomeInput = document.getElementById('add-nome');
  const addCodProdutoInput = document.getElementById('add-cod-produto');
  const addQuantidadeInput = document.getElementById('add-quantidade');
  const addMinQuantidadeInput = document.getElementById('add-min-quantidade');
  const addPrecoUnitarioInput = document.getElementById('add-preco-unitario');
  const cancelAddBtn = document.getElementById('cancel-add-btn');

  const editModalOverlay = document.getElementById('edit-modal-overlay');
  const editForm = document.getElementById('edit-form');
  const editIdInput = document.getElementById('edit-id');
  const editNomeInput = document.getElementById('edit-nome');
  const editCodProdutoInput = document.getElementById('edit-cod-produto');
  const editQuantidadeInput = document.getElementById('edit-quantidade');
  const editMinQuantidadeInput = document.getElementById('edit-min-quantidade');
  const editPrecoUnitarioInput = document.getElementById('edit-preco-unitario');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const deleteBtn = document.getElementById('delete-btn');

  // --- ESTADO DA APLICAÇÃO (apenas para estoque) ---
  let produtos = [];

  // --- FUNÇÕES DE ESTOQUE ---

  // Não precisamos mais de 'atualizarNotificacoes' separada aqui,
  // pois 'renderizarNotificacoesComuns' é chamada após o carregamento/renderização da lista.

  function renderizarLista() {
    listaProdutos.innerHTML = '';
    const filtro = filtroInput.value.toLowerCase();
    const produtosFiltrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(filtro) ||
        (p.cod_produto && p.cod_produto.toLowerCase().includes(filtro))
    );

    if (produtosFiltrados.length === 0) {
      listaProdutos.innerHTML = `<li style="justify-content: center; color: var(--text-light-color);">${filtro ? 'Nenhum produto encontrado.' : 'Seu estoque está vazio.'}</li>`;
      return;
    }

    produtosFiltrados.forEach((produto) => {
      const li = document.createElement('li');
      if (produto.quantidade < produto.min_quantidade) {
          li.classList.add('low-stock');
      }

      li.innerHTML = `
        <div class="product-info">
          <span class="product-name">${produto.nome} <small>(Cód: ${produto.cod_produto || 'N/A'})</small></span>
          <span class="product-quantity">${produto.quantidade} unidades (Mín: ${produto.min_quantidade})</span>
          <span class="product-price">R$ ${parseFloat(produto.preco_unitario).toFixed(2)} /unidade</span>
        </div>
        <div class="actions">
          <button class="btn-action btn-quantity-decrease" title="Diminuir" data-id="${produto.id}"><i class="fas fa-minus"></i></button>
          <button class="btn-action btn-quantity-increase" title="Aumentar" data-id="${produto.id}"><i class="fas fa-plus"></i></button>
          <button class="btn-action btn-edit" title="Editar Item" data-id="${produto.id}"><i class="fas fa-pencil-alt"></i></button>
        </div>
      `;
      listaProdutos.appendChild(li);
    });
    // Atualiza as notificações comuns com base nos dados que acabaram de ser renderizados
    renderizarNotificacoesComuns();
  }

  // Função para carregar produtos da API
  async function carregarProdutos() {
    try {
      const response = await fetch('/api/produtos');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      produtos = await response.json();
      renderizarLista();
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      showCustomPopup('Erro', 'Não foi possível carregar os produtos do servidor.', 'error');
    }
  }

  // Função auxiliar para fazer requisições à API
  async function fazerRequisicaoProduto(method, data = {}, id = '') {
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    const url = id ? `/api/produtos?id=${id}` : '/api/produtos';

    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => ({})); // Tenta ler JSON, ou retorna objeto vazio se não houver
    
    if (!response.ok) {
        // Se a resposta não for OK, lança um erro com a mensagem do backend
        throw new Error(responseData.error || `Erro na requisição: ${response.status}`);
    }
    return responseData;
  }

  const openModal = (overlay) => overlay.classList.remove('hidden');
  const closeModal = (overlay) => {
    overlay.classList.add('hidden');
    addForm.reset();
    editForm.reset();
  }

  // --- EVENT LISTENERS DE ESTOQUE ---

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = addNomeInput.value.trim();
    const codProduto = addCodProdutoInput.value.trim();
    const quantidade = parseInt(addQuantidadeInput.value, 10);
    const minQuantidade = parseInt(addMinQuantidadeInput.value, 10);
    const precoUnitario = parseFloat(addPrecoUnitarioInput.value);

    // Validação básica do formulário
    if (!nome || !codProduto || isNaN(quantidade) || isNaN(minQuantidade) || minQuantidade < 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
        showCustomPopup('Erro', 'Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.', 'error');
        return;
    }

    try {
      // Faz a requisição POST para a API
      const novoProduto = await fazerRequisicaoProduto('POST', { nome, codProduto, quantidade, minQuantidade, precoUnitario });
      
      // Se a requisição for bem-sucedida, recarrega os produtos e mostra sucesso
      await carregarProdutos(); // Recarrega todos os produtos para atualizar a lista
      closeModal(addModalOverlay);
      showCustomPopup('Sucesso', 'Produto adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      showCustomPopup('Erro', error.message || 'Não foi possível adicionar o produto.', 'error');
    }
  });

  listaProdutos.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('.btn-action');
    if (!targetButton) return;

    const id = parseInt(targetButton.dataset.id);
    const produtoIndex = produtos.findIndex(p => p.id === id);
    if (produtoIndex === -1) return;

    if (targetButton.classList.contains('btn-quantity-decrease') || targetButton.classList.contains('btn-quantity-increase')) {
        const produto = produtos[produtoIndex];
        let novaQuantidade = produto.quantidade;

        if (targetButton.classList.contains('btn-quantity-increase')) {
            novaQuantidade++;
        } else {
            novaQuantidade = Math.max(0, produto.quantidade - 1);
        }

        try {
            // Requisição PUT para atualizar apenas a quantidade
            await fazerRequisicaoProduto('PUT', {
                nome: produto.nome, // Envia o nome, pois é um campo obrigatório na API
                quantidade: novaQuantidade,
                min_quantidade: produto.min_quantidade, // Envia min_quantidade
                preco_unitario: produto.preco_unitario // Envia preco_unitario
            }, id);
            
            await carregarProdutos(); // Recarrega para refletir a mudança
            showCustomPopup('Sucesso', 'Quantidade atualizada!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar quantidade:', error);
            showCustomPopup('Erro', error.message || 'Não foi possível atualizar a quantidade.', 'error');
        }
    } else if (targetButton.classList.contains('btn-edit')) {
        const produto = produtos[produtoIndex];
        editIdInput.value = produto.id;
        editNomeInput.value = produto.nome;
        editCodProdutoInput.value = produto.cod_produto; // Preenche o código do produto
        editQuantidadeInput.value = produto.quantidade;
        editMinQuantidadeInput.value = produto.min_quantidade;
        editPrecoUnitarioInput.value = produto.preco_unitario; // Preenche o preço unitário
        openModal(editModalOverlay);
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = parseInt(editIdInput.value);
    
    const nome = editNomeInput.value.trim();
    const quantidade = parseInt(editQuantidadeInput.value, 10);
    const minQuantidade = parseInt(editMinQuantidadeInput.value, 10);
    const precoUnitario = parseFloat(editPrecoUnitarioInput.value); // Captura o preço unitário

    // Validação básica
    if (!nome || isNaN(quantidade) || isNaN(minQuantidade) || minQuantidade < 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
        showCustomPopup('Erro', 'Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.', 'error');
        return;
    }

    try {
        // Envia os dados para a API via PUT
        await fazerRequisicaoProduto('PUT', { 
            nome: nome, 
            quantidade: quantidade, 
            min_quantidade: minQuantidade, 
            preco_unitario: precoUnitario 
        }, id);

        await carregarProdutos(); // Recarrega a lista
        closeModal(editModalOverlay);
        showCustomPopup('Sucesso', 'Produto atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao atualizar produto:', error);
        showCustomPopup('Erro', error.message || 'Não foi possível atualizar o produto.', 'error');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    const confirmDelete = await showCustomConfirm('Confirmação', 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.');
    if (confirmDelete) {
      const id = parseInt(editIdInput.value);
      try {
        await fazerRequisicaoProduto('DELETE', {}, id); // DELETE não precisa de body
        await carregarProdutos(); // Recarrega a lista
        closeModal(editModalOverlay);
        showCustomPopup('Sucesso', 'Produto excluído com sucesso!', 'success');
      } catch (error) {
        console.error('Erro ao excluir produto:', error);
        showCustomPopup('Erro', error.message || 'Não foi possível excluir o produto.', 'error');
      }
    }
  });

  openAddModalBtn.addEventListener('click', () => openModal(addModalOverlay));
  cancelAddBtn.addEventListener('click', () => closeModal(addModalOverlay));
  addModalOverlay.addEventListener('click', (e) => {
      if(e.target === addModalOverlay) closeModal(addModalOverlay);
  });

  cancelEditBtn.addEventListener('click', () => closeModal(editModalOverlay));
  editModalOverlay.addEventListener('click', (e) => {
    if(e.target === editModalOverlay) closeModal(editModalOverlay);
  });

  filtroInput.addEventListener('input', renderizarLista);

  document.addEventListener('DOMContentLoaded', carregarProdutos);
}