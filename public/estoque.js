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
  const addPrecoUnitarioInput = document.getElementById('add-preco-unitario'); // NOVO: Campo de Preço Unitário
  const cancelAddBtn = document.getElementById('cancel-add-btn');

  const editModalOverlay = document.getElementById('edit-modal-overlay');
  const editForm = document.getElementById('edit-form');
  const editIdInput = document.getElementById('edit-id');
  const editNomeInput = document.getElementById('edit-nome');
  const editCodProdutoInput = document.getElementById('edit-cod-produto');
  const editQuantidadeInput = document.getElementById('edit-quantidade');
  const editMinQuantidadeInput = document.getElementById('edit-min-quantidade');
  const editPrecoUnitarioInput = document.getElementById('edit-preco-unitario'); // NOVO: Campo de Preço Unitário
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const deleteBtn = document.getElementById('delete-btn');

  // --- ESTADO DA APLICAÇÃO (apenas para estoque) ---
  let produtos = [];

  // --- FUNÇÕES DE ESTOQUE ---

  function atualizarNotificacoes() {
    renderizarNotificacoesComuns(); // Chama a função global de common.js
  }

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
    atualizarNotificacoes();
  }

  function carregarProdutos() {
    const produtosSalvos = localStorage.getItem('produtos');
    produtos = produtosSalvos ? JSON.parse(produtosSalvos) : [];
    renderizarLista();
  }

  function salvarProdutos() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
  }

  const openModal = (overlay) => overlay.classList.remove('hidden');
  const closeModal = (overlay) => {
    overlay.classList.add('hidden');
    addForm.reset();
    editForm.reset();
  }

  // --- EVENT LISTENERS DE ESTOQUE ---

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const codProduto = addCodProdutoInput.value.trim();

    if (produtos.some(p => p.cod_produto === codProduto)) {
        alert('Erro: Já existe um produto com este código. Por favor, insira um código único.');
        return;
    }

    const novoProduto = {
      id: Date.now(),
      nome: addNomeInput.value.trim(),
      cod_produto: codProduto,
      quantidade: parseInt(addQuantidadeInput.value, 10),
      min_quantidade: parseInt(addMinQuantidadeInput.value, 10),
      preco_unitario: parseFloat(addPrecoUnitarioInput.value) // NOVO: Captura o preço unitário
    };

    if (novoProduto.nome && novoProduto.cod_produto && !isNaN(novoProduto.quantidade) && !isNaN(novoProduto.min_quantidade) && novoProduto.min_quantidade >= 0 && !isNaN(novoProduto.preco_unitario) && novoProduto.preco_unitario > 0) {
      produtos.push(novoProduto);
      salvarProdutos();
      renderizarLista();
      closeModal(addModalOverlay);
    } else {
        alert('Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.');
    }
  });

  listaProdutos.addEventListener('click', (e) => {
    const targetButton = e.target.closest('.btn-action');
    if (!targetButton) return;

    const id = parseInt(targetButton.dataset.id);
    const produtoIndex = produtos.findIndex(p => p.id === id);
    if (produtoIndex === -1) return;

    if (targetButton.classList.contains('btn-quantity-decrease') || targetButton.classList.contains('btn-quantity-increase')) {
      if (targetButton.classList.contains('btn-quantity-increase')) {
        produtos[produtoIndex].quantidade++;
      } else {
        produtos[produtoIndex].quantidade = Math.max(0, produtos[produtoIndex].quantidade - 1);
      }
      salvarProdutos();
      renderizarLista();
    } else if (targetButton.classList.contains('btn-edit')) {
        const produto = produtos[produtoIndex];
        editIdInput.value = produto.id;
        editNomeInput.value = produto.nome;
        editCodProdutoInput.value = produto.cod_produto;
        editQuantidadeInput.value = produto.quantidade;
        editMinQuantidadeInput.value = produto.min_quantidade;
        editPrecoUnitarioInput.value = produto.preco_unitario; // NOVO: Preenche o preço unitário
        openModal(editModalOverlay);
    }
  });

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = parseInt(editIdInput.value);
    const produtoIndex = produtos.findIndex(p => p.id === id);

    if (produtoIndex === -1) {
      alert("Produto não encontrado.");
      return;
    }

    const produtoAtualizado = {
        id: id,
        nome: editNomeInput.value.trim(),
        cod_produto: editCodProdutoInput.value.trim(),
        quantidade: parseInt(editQuantidadeInput.value, 10),
        min_quantidade: parseInt(editMinQuantidadeInput.value, 10),
        preco_unitario: parseFloat(editPrecoUnitarioInput.value) // NOVO: Captura o preço unitário
    };

    if (produtoAtualizado.nome && produtoAtualizado.cod_produto && !isNaN(produtoAtualizado.quantidade) && !isNaN(produtoAtualizado.min_quantidade) && produtoAtualizado.min_quantidade >= 0 && !isNaN(produtoAtualizado.preco_unitario) && produtoAtualizado.preco_unitario > 0) {
        produtos[produtoIndex] = produtoAtualizado;
        salvarProdutos();
        renderizarLista();
        closeModal(editModalOverlay);
    } else {
        alert('Por favor, preencha todos os campos corretamente e garanta que o preço unitário seja maior que zero.');
    }
  });

  deleteBtn.addEventListener('click', () => {
    if (confirm('Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.')) {
      const id = parseInt(editIdInput.value);
      produtos = produtos.filter(p => p.id !== id);
      salvarProdutos();
      renderizarLista();
      closeModal(editModalOverlay);
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