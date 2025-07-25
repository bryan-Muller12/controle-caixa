// public/receipt.js

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const transactionId = params.get('transactionId');

    if (!transactionId) {
        alert('ID da transação não encontrado na URL.');
        window.close(); // Fecha a guia se não houver ID
        return;
    }

    // Função para formatar moeda (do common.js ou repetida aqui para simplicidade)
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    }

    // Função para formatar telefone (do venda.js ou repetida aqui)
    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = ('' + phone).replace(/\D/g, '');
        const match = cleaned.match(/^(\d{2})(\d{4,5})(\d{4})$/);
        if (match) {
            return `(${match[1]})${match[2]}-${match[3]}`;
        }
        return phone;
    }

    // Elementos do DOM para preencher
    const clientNameSpan = document.getElementById('client-name');
    const clientAddressSpan = document.getElementById('client-address');
    const clientPhoneSpan = document.getElementById('client-phone');
    const clientCpfSpan = document.getElementById('client-cpf'); // CPF não é retornado pela API de transações por segurança, mas mantido para estrutura

    const transactionIdSpan = document.getElementById('transaction-id');
    const saleDateSpan = document.getElementById('sale-date');
    const sellerNameSpan = document.getElementById('seller-name'); // Vendedor não está na API de transações, pode ser um valor fixo ou buscado separadamente

    const itemsTableBody = document.getElementById('items-table-body');
    const totalBrutoDisplay = document.getElementById('total-bruto-display');
    const discountDisplay = document.getElementById('discount-display');
    const totalFinalDisplay = document.getElementById('total-final-display');
    const printReceiptBtn = document.getElementById('print-receipt-btn');

    try {
        const response = await fetch(`/api/transacoes?transactionId=${transactionId}`);
        if (!response.ok) {
            throw new Error('Erro ao buscar detalhes da transação.');
        }
        const transactions = await response.json();
        const transaction = transactions[0]; // A API retorna um array, pegamos o primeiro

        if (!transaction) {
            alert('Transação não encontrada.');
            window.close();
            return;
        }

        // Preencher informações do cliente
        if (transaction.client) {
            clientNameSpan.textContent = transaction.client.name;
            clientAddressSpan.textContent = transaction.client.address || 'N/A';
            clientPhoneSpan.textContent = formatPhone(transaction.client.phone) || 'N/A';
            // CPF não é retornado, então fica N/A ou pode ser uma informação a ser buscada com outro endpoint se necessário
            clientCpfSpan.textContent = 'N/A';
        } else {
            clientNameSpan.textContent = 'Não Vinculado';
            clientAddressSpan.textContent = 'N/A';
            clientPhoneSpan.textContent = 'N/A';
            clientCpfSpan.textContent = 'N/A';
        }

        // Preencher detalhes da venda
        transactionIdSpan.textContent = transaction.id;
        saleDateSpan.textContent = new Date(transaction.data).toLocaleDateString('pt-BR');
        // O nome do vendedor não está na API de transações. Pode ser um valor fixo ou aprimorar a API para incluir.
        sellerNameSpan.textContent = 'Vendedor Padrão'; // Substitua por lógica real se tiver

        // Preencher itens da venda
        itemsTableBody.innerHTML = ''; // Limpa qualquer conteúdo existente
        if (transaction.detalhesVenda && transaction.detalhesVenda.itens.length > 0) {
            transaction.detalhesVenda.itens.forEach((item, index) => {
                const row = itemsTableBody.insertRow();
                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${item.codProduto}</td>
                    <td>${item.nomeProduto}</td>
                    <td>${item.quantidadeVendida}</td>
                    <td>${formatCurrency(item.precoUnitarioVenda)}</td>
                    <td>${formatCurrency(item.totalItem)}</td>
                `;
            });
        } else {
            const row = itemsTableBody.insertRow();
            row.innerHTML = `<td colspan="6">Nenhum item registrado para esta venda.</td>`;
        }

        // Preencher totais
        totalBrutoDisplay.textContent = formatCurrency(transaction.detalhesVenda?.totalBruto || 0);
        discountDisplay.textContent = formatCurrency(transaction.detalhesVenda?.valorDesconto || 0);
        totalFinalDisplay.textContent = formatCurrency(transaction.valor); // transaction.valor é o total final

    } catch (error) {
        console.error('Erro ao carregar a nota:', error);
        alert('Não foi possível carregar a nota de venda. Erro: ' + error.message);
        window.close();
    }

    // Event listener para o botão de imprimir
    printReceiptBtn.addEventListener('click', () => {
        window.print();
    });
});