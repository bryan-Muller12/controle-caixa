// controle.js
// Lógica específica da tela de Controle de Caixa

// Garante que o código só rode na página de controle
if (document.body.id === 'page-controle' || location.pathname.includes('controle.html')) {
    // --- ELEMENTOS DO DOM ---
    const saldoAtualDisplay = document.getElementById('saldo-atual');
    const listaTransacoes = document.getElementById('lista-transacoes');
    const filterButtons = document.querySelectorAll('.transaction-type-filter button');
    const outraTransacaoForm = document.getElementById('outra-transacao-form');
    const tipoTransacaoSelect = document.getElementById('tipo-transacao');
    const descricaoTransacaoInput = document.getElementById('descricao-transacao');
    const valorTransacaoInput = document.getElementById('valor-transacao');
    const dataTransacaoInput = document.getElementById('data-transacao');

    // Elementos do DOM para Relatórios de Caixa
    const dataRelatorioInput = document.getElementById('data-relatorio');
    const mesRelatorioInput = document.getElementById('mes-relatorio');
    const gerarRelatorioDiarioBtn = document.getElementById('gerar-relatorio-diario');
    const gerarRelatorioMensalBtn = document.getElementById('gerar-relatorio-mensal');
    const relatorioOutput = document.getElementById('relatorio-output');

    // NOVO: Elementos do DOM para Relatórios de Vendas
    const dataInicioVendasInput = document.getElementById('data-inicio-vendas');
    const dataFimVendasInput = document.getElementById('data-fim-vendas');
    const gerarRelatorioVendasBtn = document.getElementById('gerar-relatorio-vendas-btn');
    const relatorioVendasOutput = document.getElementById('relatorio-vendas-output');


    // --- ESTADO DA APLICAÇÃO ---
    let historicoTransacoes = [];
    let saldoAtual = 0;
    let filtroAtual = 'all'; // 'all', 'entrada', 'saida'

    // --- FUNÇÕES ---

    function carregarDados() {
        historicoTransacoes = JSON.parse(localStorage.getItem('historicoTransacoes')) || [];
        calcularESetarSaldo();
        renderizarHistorico();
        atualizarNotificacoesComuns(); // Atualiza as notificações comuns
    }

    function salvarDados() {
        localStorage.setItem('historicoTransacoes', JSON.stringify(historicoTransacoes));
    }

    function calcularESetarSaldo() {
        saldoAtual = historicoTransacoes.reduce((acc, transacao) => {
            if (transacao.tipo === 'entrada') {
                return acc + transacao.valor;
            } else if (transacao.tipo === 'saida') {
                return acc - transacao.valor;
            }
            return acc;
        }, 0);
        saldoAtualDisplay.textContent = `R$ ${saldoAtual.toFixed(2)}`;
    }

    function renderizarHistorico() {
        listaTransacoes.innerHTML = '';
        const transacoesFiltradas = historicoTransacoes.filter(transacao => {
            if (filtroAtual === 'all') return true;
            return transacao.tipo === filtroAtual;
        }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()); // Ordena por data mais recente

        if (transacoesFiltradas.length === 0) {
            listaTransacoes.innerHTML = `<li style="justify-content: center; color: var(--text-light-color);">Nenhuma transação encontrada.</li>`;
            return;
        }

        transacoesFiltradas.forEach(transacao => {
            const li = document.createElement('li');
            const valorFormatado = `R$ ${transacao.valor.toFixed(2)}`;
            const valorClasse = transacao.tipo === 'entrada' ? 'positive' : 'negative';
            const sinal = transacao.tipo === 'entrada' ? '+' : '-';

            let detalhesHTML = '';
            if (transacao.detalhesVenda) {
                detalhesHTML = `
                    <details style="margin-top: 10px; padding-top: 5px; border-top: 1px dashed var(--border-color);">
                        <summary style="font-weight: 500; cursor: pointer; color: var(--primary-color);">Ver Detalhes da Venda</summary>
                        <div style="font-size: 0.9em; margin-top: 10px;">
                            <p><strong>Total Bruto:</strong> R$ ${transacao.detalhesVenda.totalBruto}</p>
                            <p><strong>Desconto Aplicado:</strong> R$ ${transacao.detalhesVenda.valorDesconto}</p>
                            <p><strong>Total Final da Venda:</strong> R$ ${transacao.detalhesVenda.totalFinal}</p>
                            <ul style="list-style: none; padding-left: 15px; margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                                <li style="font-weight: bold; margin-bottom: 5px;">Itens Vendidos:</li>
                                ${transacao.detalhesVenda.itens.map(item => `
                                    <li style="margin-bottom: 3px;">- ${item.nomeProduto} (${item.codProduto}): ${item.quantidadeVendida} x R$ ${item.precoUnitarioVenda.toFixed(2)} = R$ ${item.totalItem.toFixed(2)}</li>
                                `).join('')}
                            </ul>
                        </div>
                    </details>
                `;
                transacao.descricao = `Venda (${transacao.detalhesVenda.itens.length} itens)`;
            }

            li.innerHTML = `
                <div class="transaction-info">
                    <span class="transaction-description">${transacao.descricao}</span>
                </div>
                <div class="transaction-details">
                    <span class="transaction-value ${valorClasse}">${sinal} ${valorFormatado}</span>
                    <span class="transaction-date">${new Date(transacao.data).toLocaleDateString('pt-BR')}</span>
                </div>
                ${detalhesHTML}
            `;
            listaTransacoes.appendChild(li);
        });
    }

    function registrarOutraTransacao(e) {
        e.preventDefault();

        const tipo = tipoTransacaoSelect.value;
        const descricao = descricaoTransacaoInput.value.trim();
        const valor = parseFloat(valorTransacaoInput.value);
        const data = dataTransacaoInput.value;

        if (!descricao || isNaN(valor) || valor <= 0 || !data) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }

        const novaTransacao = {
            id: Date.now(),
            tipo: tipo,
            descricao: descricao,
            valor: valor,
            data: data
        };

        historicoTransacoes.push(novaTransacao);
        salvarDados();
        calcularESetarSaldo();
        renderizarHistorico();
        outraTransacaoForm.reset();
        alert('Transação registrada com sucesso!');
    }

    // Remova as funções de relatório diário e mensal
    // function gerarRelatorioDiario() { ... }
    // function gerarRelatorioMensal() { ... }

    // NOVO: Função para gerar Relatório de Vendas (Resumo e Top Vendas)
    function gerarRelatorioVendas() {
        const dataInicio = dataInicioVendasInput.value;
        const dataFim = dataFimVendasInput.value;

        if (!dataInicio || !dataFim) {
            alert('Por favor, selecione as datas de início e fim para o relatório de vendas.');
            return;
        }

        // Ajusta as datas para cobrir o dia inteiro
        const dataInicioObj = new Date(dataInicio + 'T00:00:00');
        const dataFimObj = new Date(dataFim + 'T23:59:59');

        const vendasNoPeriodo = historicoTransacoes.filter(t => {
            // Filtra apenas transações de venda com detalhes
            if (t.tipo === 'entrada' && t.detalhesVenda) {
                const dataTransacao = new Date(t.data + 'T00:00:00');
                return dataTransacao >= dataInicioObj && dataTransacao <= dataFimObj;
            }
            return false;
        });

        let totalVendasPeriodo = 0;
        let totalItensVendidosPeriodo = 0;
        const produtosVendidosDetalhes = {};

        vendasNoPeriodo.forEach(venda => {
            totalVendasPeriodo += parseFloat(venda.detalhesVenda.totalFinal);
            venda.detalhesVenda.itens.forEach(item => {
                totalItensVendidosPeriodo += item.quantidadeVendida;
                if (produtosVendidosDetalhes[item.nomeProduto]) {
                    produtosVendidosDetalhes[item.nomeProduto].quantidade += item.quantidadeVendida;
                    produtosVendidosDetalhes[item.nomeProduto].valorTotal += item.totalItem;
                } else {
                    produtosVendidosDetalhes[item.nomeProduto] = {
                        quantidade: item.quantidadeVendida,
                        valorTotal: item.totalItem
                    };
                }
            });
        });

        const topProdutosVendidos = Object.keys(produtosVendidosDetalhes)
            .map(nome => ({
                nome: nome,
                quantidade: produtosVendidosDetalhes[nome].quantidade,
                valorTotal: produtosVendidosDetalhes[nome].valorTotal
            }))
            .sort((a, b) => b.quantidade - a.quantidade)
            .slice(0, 5);

        let topProdutosHtml = '';
        if (topProdutosVendidos.length > 0) {
            topProdutosHtml = `
                <h4>Top 5 Produtos Mais Vendidos:</h4>
                <ul style="list-style: decimal; padding-left: 20px;">
                    ${topProdutosVendidos.map(p => `
                        <li>${p.nome}: ${p.quantidade} unidades (R$ ${p.valorTotal.toFixed(2)})</li>
                    `).join('')}
                </ul>
            `;
        } else {
            topProdutosHtml = `<p>Nenhum produto vendido no período selecionado.</p>`;
        }

        relatorioVendasOutput.innerHTML = `
            <h3>Relatório de Vendas de ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}</h3>
            <p><strong>Número de Vendas:</strong> ${vendasNoPeriodo.length}</p>
            <p><strong>Valor Total das Vendas:</strong> R$ ${totalVendasPeriodo.toFixed(2)}</p>
            <p><strong>Total de Itens Vendidos:</strong> ${totalItensVendidosPeriodo} unidades</p>
            ${topProdutosHtml}
        `;
    }

    // --- EVENT LISTENERS ---
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            filtroAtual = button.dataset.filter;
            renderizarHistorico();
        });
    });

    outraTransacaoForm.addEventListener('submit', registrarOutraTransacao);

    // Remova os event listeners dos botões de relatório diário e mensal
    // gerarRelatorioDiarioBtn.addEventListener('click', gerarRelatorioDiario);
    // gerarRelatorioMensalBtn.addEventListener('click', gerarRelatorioMensal);

    // NOVO: Event listener para o botão de relatório de vendas
    gerarRelatorioVendasBtn.addEventListener('click', gerarRelatorioVendas);

    // --- INICIALIZAÇÃO ---
    document.addEventListener('DOMContentLoaded', carregarDados);
}