// public/venda.js

// ==== Seleção de Elementos do DOM (existente) ====
const searchProdutoInput = document.getElementById('search-produto-input');
const findProductBtn = document.getElementById('find-product-btn');
const foundProductDetails = document.getElementById('found-product-details');
const foundProductName = document.getElementById('found-product-name');
const foundProductCod = document.getElementById('found-product-cod');
const foundProductQuantityStock = document.getElementById('found-product-quantity-stock');
const quantidadeItemInput = document.getElementById('quantidade-item');
const valorUnitarioItemInput = document.getElementById('valor-unitario-item');
const valorTotalItemInput = document.getElementById('valor-total-item');
const addItemToCartBtn = document.getElementById('add-item-to-cart-btn');
const cartItemsList = document.getElementById('cart-items-list');
const totalVolumesSpan = document.getElementById('total-volumes');
const totalSaleDisplay = document.getElementById('total-sale-display');
const finalizeSaleBtn = document.getElementById('finalize-sale-btn');
const cancelAllItemsBtn = document.getElementById('cancel-all-items-btn');
const aplicarDescontoCheckbox = document.getElementById('aplicar-desconto');
const valorDescontoGlobalInput = document.getElementById('valor-desconto-global');
const productDisplayCard = document.querySelector('.product-display-card');
const productNameDisplay = document.getElementById('product-name-display');

// ==== Seleção de Elementos do DOM para Clientes (NOVOS) ====
const searchClientInput = document.getElementById('search-client-input');
const findClientBtn = document.getElementById('find-client-btn');
const clearClientBtn = document.getElementById('clear-client-btn');
const foundClientDetails = document.getElementById('found-client-details');
const foundClientName = document.getElementById('found-client-name');
const foundClientPhone = document.getElementById('found-client-phone');
const foundClientAddress = document.getElementById('found-client-address');
const selectedClientIdInput = document.getElementById('selected-client-id');
const addNewClientBtn = document.getElementById('add-new-client-btn');
const addClientPopupOverlay = document.getElementById('add-client-popup-overlay');
const saveNewClientBtn = document.getElementById('save-new-client-btn');
const cancelAddClientBtn = document.getElementById('cancel-add-client-btn');
const newClientNameInput = document.getElementById('new-client-name');
const newClientPhoneInput = document.getElementById('new-client-phone');
const newClientAddressInput = document.getElementById('new-client-address');
const newClientCpfInput = document.getElementById('new-client-cpf');


// Variáveis de estado (existente)
let cart = [];
let selectedProduct = null;
let currentProductId = null;
let currentProductStock = 0;

// Variáveis de estado (NOVO para clientes)
let selectedClient = null; // Para armazenar o objeto do cliente selecionado

// ==== Funções de Utilidade (existente) ====
function showPopup(title, message, isError = false, callback = null) {
    const popupOverlay = document.getElementById('custom-popup-overlay');
    const popupTitle = document.getElementById('custom-popup-title');
    const popupMessage = document.getElementById('custom-popup-message');
    const popupCloseBtn = document.getElementById('custom-popup-close-btn');

    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popupOverlay.classList.remove('hidden');

    // Estilo de erro
    if (isError) {
        popupTitle.style.color = 'var(--color-danger)';
    } else {
        popupTitle.style.color = ''; // Reseta para a cor padrão
    }

    // Garante que o event listener só é adicionado uma vez
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

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função para formatar telefone (NOVO)
function formatPhone(phone) {
    if (!phone) return '';
    // Remove tudo que não for dígito
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
    if (match) {
        return `(${match[1]})${match[2]}-${match[3]}`;
    }
    return phone; // Retorna o original se não conseguir formatar
}


// ==== Lógica do Produto (existente, com pequenas adaptações) ====
async function fetchProduct(query) {
    try {
        const response = await fetch(`/api/produtos?search=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar produto.');
        }
        const products = await response.json();
        if (products.length > 0) {
            selectedProduct = products[0]; // Assume o primeiro resultado
            currentProductId = selectedProduct.id;
            currentProductStock = selectedProduct.quantidade;

            foundProductName.textContent = selectedProduct.nome;
            foundProductCod.textContent = selectedProduct.codigo;
            foundProductQuantityStock.textContent = selectedProduct.quantidade;
            foundProductDetails.classList.remove('hidden');
            addItemToCartBtn.disabled = false;
            productNameDisplay.textContent = selectedProduct.nome; // Atualiza o nome no card
            valorUnitarioItemInput.value = selectedProduct.preco_venda.toFixed(2);
            updateValorTotalItem();
        } else {
            showPopup('Produto Não Encontrado', 'Nenhum produto encontrado com o código ou nome fornecido.', true);
            clearProductSelection();
        }
    } catch (error) {
        console.error('Erro ao buscar produto:', error);
        showPopup('Erro', 'Não foi possível buscar o produto. Tente novamente.', true);
        clearProductSelection();
    }
}

function clearProductSelection() {
    selectedProduct = null;
    currentProductId = null;
    currentProductStock = 0;
    foundProductDetails.classList.add('hidden');
    foundProductName.textContent = '';
    foundProductCod.textContent = '';
    foundProductQuantityStock.textContent = '';
    addItemToCartBtn.disabled = true;
    productNameDisplay.textContent = 'Produto Selecionado';
    searchProdutoInput.value = '';
    quantidadeItemInput.value = 1;
    valorUnitarioItemInput.value = '0.00';
    valorTotalItemInput.value = '0.00';
}

function updateValorTotalItem() {
    const quantidade = parseFloat(quantidadeItemInput.value);
    const valorUnitario = parseFloat(valorUnitarioItemInput.value);
    if (!isNaN(quantidade) && !isNaN(valorUnitario)) {
        valorTotalItemInput.value = (quantidade * valorUnitario).toFixed(2);
    } else {
        valorTotalItemInput.value = '0.00';
    }
}

function updateCartSummary() {
    let totalVolumes = 0;
    let totalSale = 0;

    cart.forEach(item => {
        totalVolumes += item.quantidadeVendida;
        totalSale += item.totalItem;
    });

    totalVolumesSpan.textContent = totalVolumes;
    totalSaleDisplay.textContent = formatCurrency(totalSale);

    finalizeSaleBtn.disabled = cart.length === 0;
    cancelAllItemsBtn.disabled = cart.length === 0;

    // Aplica o desconto global se a checkbox estiver marcada
    if (aplicarDescontoCheckbox.checked && parseFloat(valorDescontoGlobalInput.value) > 0) {
        const desconto = parseFloat(valorDescontoGlobalInput.value);
        if (!isNaN(desconto) && desconto < totalSale) {
            totalSaleDisplay.textContent = formatCurrency(totalSale - desconto);
        } else if (desconto >= totalSale) {
            // Evita valor negativo, opcionalmente pode mostrar um erro
            totalSaleDisplay.textContent = formatCurrency(0);
        }
    }
}

function renderCart() {
    cartItemsList.innerHTML = '';
    if (cart.length === 0) {
        cartItemsList.innerHTML = '<li class="empty-cart-message">Nenhum item no carrinho.</li>';
        return;
    }

    cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.classList.add('cart-item-row');
        li.dataset.index = index;
        li.innerHTML = `
            <span>${index + 1}</span>
            <span>${item.codProduto}</span>
            <span>${item.nomeProduto}</span>
            <span>${item.quantidadeVendida}</span>
            <span>${formatCurrency(item.precoUnitarioVenda)}</span>
            <span>${formatCurrency(item.totalItem)}</span>
            <span class="cart-item-actions">
                <button type="button" class="btn-icon btn-remove-item" data-index="${index}" title="Remover Item"><i class="fas fa-times"></i></button>
            </span>
        `;
        cartItemsList.appendChild(li);
    });
    updateCartSummary();
}

function addItemToCart() {
    if (!selectedProduct) {
        showPopup('Erro', 'Selecione um produto primeiro.', true);
        return;
    }

    const quantidade = parseInt(quantidadeItemInput.value);
    const valorUnitario = parseFloat(valorUnitarioItemInput.value);
    const totalItem = parseFloat(valorTotalItemInput.value);

    if (isNaN(quantidade) || quantidade <= 0) {
        showPopup('Erro', 'Quantidade inválida.', true);
        return;
    }
    if (isNaN(valorUnitario) || valorUnitario <= 0) {
        showPopup('Erro', 'Valor unitário inválido.', true);
        return;
    }
    if (quantidade > currentProductStock) {
        showPopup('Estoque Insuficiente', `Quantidade em estoque: ${currentProductStock}. Você está tentando adicionar ${quantidade}.`, true);
        return;
    }

    // Verificar se o item já está no carrinho e atualizar
    const existingItemIndex = cart.findIndex(item => item.produtoId === selectedProduct.id);

    if (existingItemIndex > -1) {
        const existingItem = cart[existingItemIndex];
        const newTotalQuantity = existingItem.quantidadeVendida + quantidade;

        if (newTotalQuantity > currentProductStock) {
            showPopup('Estoque Insuficiente', `Adicionar este item excederia o estoque. Limite: ${currentProductStock - existingItem.quantidadeVendida} unidades adicionais.`, true);
            return;
        }
        existingItem.quantidadeVendida = newTotalQuantity;
        existingItem.totalItem = newTotalQuantity * existingItem.precoUnitarioVenda; // Recalcula o total do item
    } else {
        const item = {
            produtoId: selectedProduct.id,
            codProduto: selectedProduct.codigo,
            nomeProduto: selectedProduct.nome,
            quantidadeVendida: quantidade,
            precoUnitarioOriginal: selectedProduct.preco_venda,
            precoUnitarioVenda: valorUnitario, // Permite alterar o preço de venda
            totalItem: totalItem
        };
        cart.push(item);
    }
    
    renderCart();
    clearProductSelection(); // Limpa a seleção após adicionar ao carrinho
    searchProdutoInput.focus();
}

function removeItemFromCart(index) {
    showConfirm('Confirmar Remoção', 'Tem certeza que deseja remover este item do carrinho?', () => {
        cart.splice(index, 1);
        renderCart();
    });
}

async function finalizeSale() {
    if (cart.length === 0) {
        showPopup('Carrinho Vazio', 'Adicione itens ao carrinho antes de finalizar a venda.', true);
        return;
    }

    let totalBruto = 0;
    cart.forEach(item => {
        totalBruto += (item.quantidadeVendida * item.precoUnitarioVenda);
    });

    let valorDesconto = 0;
    if (aplicarDescontoCheckbox.checked) {
        valorDesconto = parseFloat(valorDescontoGlobalInput.value) || 0;
        if (valorDesconto > totalBruto) {
            showPopup('Erro de Desconto', 'O valor do desconto não pode ser maior que o total bruto da venda.', true);
            return;
        }
    }

    const totalFinal = totalBruto - valorDesconto;

    const transactionData = {
        tipo: 'venda',
        descricao: `Venda de ${cart.length} itens.`,
        valor: totalFinal, // Valor final da transação após o desconto
        data: new Date().toISOString().slice(0, 10), // Data atual no formato YYYY-MM-DD
        detalhesVenda: {
            totalBruto: totalBruto,
            valorDesconto: valorDesconto,
            itens: cart.map(item => ({
                produtoId: item.produtoId,
                codProduto: item.codProduto,
                nomeProduto: item.nomeProduto,
                quantidadeVendida: item.quantidadeVendida,
                precoUnitarioOriginal: item.precoUnitarioOriginal,
                precoUnitarioVenda: item.precoUnitarioVenda,
                totalItem: item.totalItem
            }))
        }
    };

    // Adiciona o client_id se um cliente estiver selecionado
    if (selectedClient && selectedClient.id) {
        transactionData.clientId = selectedClient.id;
    }

    try {
        const response = await fetch('/api/transacoes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(transactionData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao finalizar a venda.');
        }

        const result = await response.json();
        showPopup('Venda Finalizada', 'Venda registrada com sucesso! ID da Transação: ' + result.id, false, () => {
            // Limpa o carrinho e a seleção de produto e cliente após a venda
            cart = [];
            renderCart();
            clearProductSelection();
            clearClientSelection(); // Limpa seleção de cliente
            aplicarDescontoCheckbox.checked = false;
            valorDescontoGlobalInput.classList.add('hidden');
            valorDescontoGlobalInput.value = 0;

            // Redireciona para a página de nota após a venda (NOVO)
            // Você pode querer que isso seja um "botão de visualizar nota" após a confirmação
            // ou um redirecionamento automático para a nota.
            // Por enquanto, faremos um redirecionamento direto para a nota.
            window.location.href = `receipt.html?transactionId=${result.id}`;
        });

    } catch (error) {
        console.error('Erro ao finalizar a venda:', error);
        showPopup('Erro ao Finalizar Venda', error.message, true);
    }
}

function cancelAllItems() {
    showConfirm('Cancelar Venda', 'Tem certeza que deseja cancelar todos os itens do carrinho? Esta ação não pode ser desfeita.', () => {
        cart = [];
        renderCart();
        clearProductSelection();
        clearClientSelection(); // Limpa seleção de cliente
        aplicarDescontoCheckbox.checked = false;
        valorDescontoGlobalInput.classList.add('hidden');
        valorDescontoGlobalInput.value = 0;
    });
}

// ==== Lógica do Cliente (NOVAS FUNÇÕES) ====

async function fetchClient(query) {
    try {
        const response = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar cliente.');
        }
        const clients = await response.json();
        if (clients.length > 0) {
            selectedClient = clients[0]; // Assume o primeiro resultado
            foundClientName.textContent = selectedClient.name;
            foundClientPhone.textContent = formatPhone(selectedClient.phone);
            foundClientAddress.textContent = selectedClient.address;
            selectedClientIdInput.value = selectedClient.id; // Armazena o ID
            foundClientDetails.classList.remove('hidden');
            showPopup('Cliente Selecionado', `Cliente "${selectedClient.name}" selecionado com sucesso.`);
        } else {
            showPopup('Cliente Não Encontrado', 'Nenhum cliente encontrado com o nome ou CPF fornecido.', true);
            clearClientSelection();
        }
    } catch (error) {
        console.error('Erro ao buscar cliente:', error);
        showPopup('Erro', 'Não foi possível buscar o cliente. Tente novamente.', true);
        clearClientSelection();
    }
}

function clearClientSelection() {
    selectedClient = null;
    foundClientDetails.classList.add('hidden');
    foundClientName.textContent = '';
    foundClientPhone.textContent = '';
    foundClientAddress.textContent = '';
    selectedClientIdInput.value = '';
    searchClientInput.value = '';
}

function openAddClientPopup() {
    newClientNameInput.value = '';
    newClientPhoneInput.value = '';
    newClientAddressInput.value = '';
    newClientCpfInput.value = '';
    addClientPopupOverlay.classList.remove('hidden');
}

function closeAddClientPopup() {
    addClientPopupOverlay.classList.add('hidden');
}

async function saveNewClient() {
    const name = newClientNameInput.value.trim();
    const phone = newClientPhoneInput.value.trim();
    const address = newClientAddressInput.value.trim();
    const cpf = newClientCpfInput.value.trim();

    if (!name || !cpf) {
        showPopup('Erro de Cadastro', 'Nome e CPF são obrigatórios para o novo cliente.', true);
        return;
    }

    // Validação de formato de telefone (básica, mais robusta pode ser feita no backend)
    const phoneRegex = /^\(\d{2}\)\d{4,5}-\d{4}$/;
    if (phone && !phoneRegex.test(phone)) {
        showPopup('Erro de Cadastro', 'Formato de telefone inválido. Use (DD)NNNNN-NNNN ou (DD)NNNN-NNNN.', true);
        return;
    }


    try {
        const response = await fetch('/api/clients', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone, address, cpf })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao adicionar novo cliente.');
        }

        const result = await response.json();
        showPopup('Cliente Adicionado', `Cliente "${result.client.name}" adicionado com sucesso!`, false, () => {
            closeAddClientPopup();
            // Opcional: Selecionar o cliente recém-criado automaticamente
            selectedClient = result.client;
            foundClientName.textContent = selectedClient.name;
            foundClientPhone.textContent = formatPhone(selectedClient.phone);
            foundClientAddress.textContent = selectedClient.address;
            selectedClientIdInput.value = selectedClient.id;
            foundClientDetails.classList.remove('hidden');
        });

    } catch (error) {
        console.error('Erro ao salvar novo cliente:', error);
        showPopup('Erro ao Cadastrar Cliente', error.message, true);
    }
}


// ==== Listeners de Eventos (existente + NOVOS) ====
findProductBtn.addEventListener('click', () => {
    const query = searchProdutoInput.value.trim();
    if (query) {
        fetchProduct(query);
    } else {
        showPopup('Atenção', 'Digite um código ou nome de produto para pesquisar.');
    }
});

searchProdutoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        findProductBtn.click();
    }
});

quantidadeItemInput.addEventListener('input', updateValorTotalItem);
valorUnitarioItemInput.addEventListener('input', updateValorTotalItem);

addItemToCartBtn.addEventListener('click', addItemToCart);

cartItemsList.addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-item')) {
        const index = parseInt(e.target.closest('.btn-remove-item').dataset.index);
        removeItemFromCart(index);
    }
});

finalizeSaleBtn.addEventListener('click', finalizeSale);
cancelAllItemsBtn.addEventListener('click', cancelAllItems);

aplicarDescontoCheckbox.addEventListener('change', () => {
    if (aplicarDescontoCheckbox.checked) {
        valorDescontoGlobalInput.classList.remove('hidden');
    } else {
        valorDescontoGlobalInput.value = 0;
        valorDescontoGlobalInput.classList.add('hidden');
    }
    updateCartSummary(); // Atualiza o total da venda ao aplicar/remover desconto
});

valorDescontoGlobalInput.addEventListener('input', updateCartSummary); // Recalcula o total ao digitar o desconto


// ==== Listeners de Eventos para Clientes (NOVOS) ====
findClientBtn.addEventListener('click', () => {
    const query = searchClientInput.value.trim();
    if (query) {
        fetchClient(query);
    } else {
        showPopup('Atenção', 'Digite um nome ou CPF do cliente para pesquisar.');
    }
});

searchClientInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        findClientBtn.click();
    }
});

clearClientBtn.addEventListener('click', clearClientSelection);
addNewClientBtn.addEventListener('click', openAddClientPopup);
saveNewClientBtn.addEventListener('click', saveNewClient);
cancelAddClientBtn.addEventListener('click', closeAddClientPopup);

// Mask para o campo de telefone (opcional, pode ser feito com uma biblioteca)
newClientPhoneInput.addEventListener('input', (e) => {
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

// Mask para o campo de CPF (opcional, pode ser feito com uma biblioteca)
newClientCpfInput.addEventListener('input', (e) => {
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


// Inicialização (existente)
renderCart();