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

  function renderizarLista() {
    console.log('[renderizarLista] Iniciando renderização da lista.'); // LOG: Início da renderização
    listaProdutos.innerHTML = '';
    const filtro = filtroInput.value.toLowerCase();
    const produtosFiltrados = produtos.filter(p =>
        p.nome.toLowerCase().includes(filtro) ||
        (p.cod_produto && p.cod_produto.toLowerCase().includes(filtro))
    );

    if (produtosFiltrados.length === 0) {
      listaProdutos.innerHTML = `<li style="justify-content: center; color: var(--text-light-color);">${filtro ? 'Nenhum produto encontrado.' : 'Seu estoque está vazio.'}</li>`;
      console.log('[renderizarLista] Estoque vazio ou nenhum produto encontrado após filtro.'); // LOG: Estoque vazio
      // Tentar atualizar notificações mesmo se lista vazia, caso haja produtos com estoque baixo que não apareceram devido a filtro
      if (typeof atualizarNotificacoesComuns === 'function') {
        atualizarNotificacoesComuns(produtos); // Passa a lista COMPLETA de produtos
      }
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
    if (typeof atualizarNotificacoesComuns === 'function') {
      atualizarNotificacoesComuns(produtos); // Passa a lista COMPLETA de produtos
      console.log('[renderizarLista] Notificações comuns atualizadas.'); // LOG: Notificações atualizadas
    } else {
      console.error('[renderizarLista] Erro: atualizarNotificacoesComuns não está definida. common.js pode não ter carregado corretamente.'); // ERRO: Função não definida
    }
  }

  // Função para carregar produtos da API
  async function carregarProdutos() {
    console.log('[carregarProdutos] Iniciando carregamento de produtos da API...'); // LOG: Início do carregamento
    try {
      const response = await fetch('/api/produtos');
      console.log(`[carregarProdutos] Resposta da API /api/produtos: Status ${response.status}`); // LOG: Status da resposta
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      produtos = await response.json();
      console.log('[carregarProdutos] Produtos recebidos da API:', produtos); // LOG: Produtos recebidos
      renderizarLista();
    } catch (error) {
      console.error('[carregarProdutos] Erro ao carregar produtos:', error); // LOG: Erro no carregamento
      showCustomPopup('Erro', error.message || 'Não foi possível carregar os produtos do servidor.', 'error');
    }
  }

  // Função auxiliar para fazer requisições à API (já existe no common.js, mas aqui para visibilidade)
  // Certifique-se de que a `fazerRequisicaoApi` do `common.js` está sendo usada ou que esta versão local não conflita.
  // Idealmente, `fazerRequisicaoApi` deveria ser movida para common.js e ser global.
  async function fazerRequisicaoProduto(method, data = {}, id = '') {
    console.log(`[fazerRequisicaoProduto] Chamando API: ${method} /api/produtos${id ? '?id='+id : ''}`, data); // LOG: Requisição produto
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };

    const url = id ? `/api/produtos?id=${id}` : '/api/produtos';

    const response = await fetch(url, options);
    const responseData = await response.json().catch(() => ({}));
    
    if (!response.ok) {
        console.error(`[fazerRequisicaoProduto] Erro da API para /api/produtos:`, responseData.error || `Status ${response.status}`); // LOG: Erro da API
        throw new Error(responseData.error || `Erro na requisição: ${response.status}`);
    }
    console.log(`[fazerRequisicaoProduto] Resposta de /api/produtos:`, responseData); // LOG: Resposta da API
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
    console.log('[addForm] Tentando adicionar novo produto...'); // LOG: Adicionar produto

    const nome = addNomeInput.value.trim();
    const codProduto = addCodProdutoInput.value.trim();
    const quantidade = parseInt(addQuantidadeInput.value, 10);
    const minQuantidade = parseInt(addMinQuantidadeInput.value, 10);
    const precoUnitario = parseFloat(addPrecoUnitarioInput.value);

    if (!nome || !codProduto || isNaN(quantidade) || isNaN(minQuantidade) || minQuantidade < 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
        showCustomPopup('Erro', 'Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.', 'error');
        return;
    }

    try {
      const novoProduto = await fazerRequisicaoProduto('POST', { nome, codProduto, quantidade, minQuantidade, precoUnitario });
      console.log('[addForm] Produto adicionado via API:', novoProduto); // LOG: Produto adicionado
      
      await carregarProdutos();
      closeModal(addModalOverlay);
      showCustomPopup('Sucesso', 'Produto adicionado com sucesso!', 'success');
    } catch (error) {
      console.error('[addForm] Erro ao adicionar produto:', error); // LOG: Erro ao adicionar
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
        console.log('[listaProdutos] Atualizando quantidade do produto ID:', id); // LOG: Atualizar quantidade
        const produto = produtos[produtoIndex];
        let novaQuantidade = produto.quantidade;

        if (targetButton.classList.contains('btn-quantity-increase')) {
            novaQuantidade++;
        } else {
            novaQuantidade = Math.max(0, produto.quantidade - 1);
        }

        try {
            await fazerRequisicaoProduto('PUT', {
                nome: produto.nome, 
                quantidade: novaQuantidade,
                min_quantidade: produto.min_quantidade, 
                preco_unitario: produto.preco_unitario 
            }, id);
            console.log('[listaProdutos] Quantidade atualizada via API para ID:', id, 'Nova Qtd:', novaQuantidade); // LOG: Quantidade atualizada
            
            await carregarProdutos();
            showCustomPopup('Sucesso', 'Quantidade atualizada!', 'success');
        } catch (error) {
            console.error('[listaProdutos] Erro ao atualizar quantidade:', error); // LOG: Erro atualizar quantidade
            showCustomPopup('Erro', error.message || 'Não foi possível atualizar a quantidade.', 'error');
        }
    } else if (targetButton.classList.contains('btn-edit')) {
        console.log('[listaProdutos] Abrindo edição para produto ID:', id); // LOG: Abrir edição
        const produto = produtos[produtoIndex];
        editIdInput.value = produto.id;
        editNomeInput.value = produto.nome;
        editCodProdutoInput.value = produto.cod_produto; 
        editQuantidadeInput.value = produto.quantidade;
        editMinQuantidadeInput.value = produto.min_quantidade;
        editPrecoUnitarioInput.value = produto.preco_unitario; 
        openModal(editModalOverlay);
    }
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('[editForm] Tentando salvar alterações do produto...'); // LOG: Salvar edição
    const id = parseInt(editIdInput.value);
    
    const nome = editNomeInput.value.trim();
    const quantidade = parseInt(editQuantidadeInput.value, 10);
    const minQuantidade = parseInt(editMinQuantidadeInput.value, 10);
    const precoUnitario = parseFloat(editPrecoUnitarioInput.value); 

    if (!nome || isNaN(quantidade) || isNaN(minQuantidade) || minQuantidade < 0 || isNaN(precoUnitario) || precoUnitario <= 0) {
        showCustomPopup('Erro', 'Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.', 'error');
        return;
    }

    try {
        await fazerRequisicaoProduto('PUT', { 
            nome: nome, 
            quantidade: quantidade, 
            min_quantidade: minQuantidade, 
            preco_unitario: precoUnitario 
        }, id);
        console.log('[editForm] Produto atualizado via API para ID:', id); // LOG: Produto atualizado

        await carregarProdutos();
        closeModal(editModalOverlay);
        showCustomPopup('Sucesso', 'Produto atualizado com sucesso!', 'success');
    } catch (error) {
        console.error('[editForm] Erro ao atualizar produto:', error); // LOG: Erro ao atualizar
        showCustomPopup('Erro', error.message || 'Não foi possível atualizar o produto.', 'error');
    }
  });

  deleteBtn.addEventListener('click', async () => {
    console.log('[deleteBtn] Tentando excluir produto...'); // LOG: Excluir produto
    const confirmDelete = await showCustomConfirm('Confirmação', 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.');
    if (confirmDelete) {
      const id = parseInt(editIdInput.value);
      try {
        await fazerRequisicaoProduto('DELETE', {}, id);
        console.log('[deleteBtn] Produto excluído via API para ID:', id); // LOG: Produto excluído
        await carregarProdutos();
        closeModal(editModalOverlay);
        showCustomPopup('Sucesso', 'Produto excluído com sucesso!', 'success');
      } catch (error) {
        console.error('[deleteBtn] Erro ao excluir produto:', error); // LOG: Erro ao excluir
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