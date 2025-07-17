// controle.js
// Lógica específica da tela de Controle de Caixa

// Garante que o código só rode na página de controle
if (document.body.id === 'page-controle' || location.pathname.includes('controle.html')) {
  // --- ELEMENTOS DO DOM ---
  const saldoAtualDisplay = document.getElementById('saldo-atual');
  const historicoList = document.getElementById('historico-list');
  const emptyHistoryMessage = document.querySelector('.empty-history-message');

  // Filtros
  const filtroTipoTransacao = document.getElementById('filtro-tipo-transacao');
  const dataInicioInput = document.getElementById('data-inicio');
  const dataFimInput = document.getElementById('data-fim');
  const aplicarFiltrosBtn = document.getElementById('aplicar-filtros-btn');
  const limparFiltrosBtn = document.getElementById('limpar-filtros-btn');

  // Nova Transação
  const openNovaTransacaoModalBtn = document.getElementById('open-nova-transacao-modal-btn');
  const novaTransacaoModalOverlay = document.getElementById('nova-transacao-modal-overlay');
  const novaTransacaoForm = document.getElementById('nova-transacao-form');
  const transacaoTipoInput = document.getElementById('transacao-tipo');
  const transacaoDescricaoInput = document.getElementById('transacao-descricao');
  const transacaoValorInput = document.getElementById('transacao-valor');
  const cancelarNovaTransacaoBtn = document.getElementById('cancelar-nova-transacao-btn');

  // Relatório de Vendas
  const gerarRelatorioVendasBtn = document.getElementById('gerar-relatorio-vendas-btn');
  const relatorioVendasModalOverlay = document.getElementById('relatorio-vendas-modal-overlay');
  const relatorioPeriodoInput = document.getElementById('relatorio-periodo');
  const relatorioDataInicioInput = document.getElementById('relatorio-data-inicio');
  const relatorioDataFimInput = document.getElementById('relatorio-data-fim');
  const gerarRelatorioBtn = document.getElementById('gerar-relatorio-btn');
  const cancelarRelatorioBtn = document.getElementById('cancelar-relatorio-btn');
  const relatorioDetalhes = document.getElementById('relatorio-detalhes');

  // --- ESTADO DA APLICAÇÃO ---
  let historicoTransacoes = [];
  let produtos = []; // Para notificações de estoque

  // Função auxiliar para fazer requisições à API
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

  // --- FUNÇÕES DE CONTROLE DE CAIXA ---

  async function carregarHistoricoTransacoes(filtros = {}) {
    try {
      // Constrói a URL com base nos filtros
      const params = new URLSearchParams();
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.tipo) params.append('tipo', filtros.tipo);
      
      const url = `/api/transacoes?${params.toString()}`;
      historicoTransacoes = await fazerRequisicaoApi(url, 'GET');
      renderizarHistorico();
      calcularSaldoAtual();
    } catch (error) {
      console.error('Erro ao carregar histórico de transações:', error);
      showCustomPopup('Erro', 'Não foi possível carregar o histórico de transações.', 'error');
    }
  }

  function calcularSaldoAtual() {
    let saldo = 0;
    historicoTransacoes.forEach(transacao => {
      if (transacao.tipo === 'entrada') {
        saldo += transacao.valor;
      } else if (transacao.tipo === 'saida') {
        saldo -= transacao.valor;
      }
    });
    saldoAtualDisplay.textContent = `R$ ${saldo.toFixed(2)}`;
    // Adiciona classe para cor (verde para positivo, vermelho para negativo)
    saldoAtualDisplay.classList.remove('positive', 'negative');
    if (saldo >= 0) {
      saldoAtualDisplay.classList.add('positive');
    } else {
      saldoAtualDisplay.classList.add('negative');
    }
  }

  function renderizarHistorico() {
    historicoList.innerHTML = '';
    if (historicoTransacoes.length === 0) {
      emptyHistoryMessage.classList.remove('hidden');
      return;
    } else {
      emptyHistoryMessage.classList.add('hidden');
    }

    historicoTransacoes.forEach(transacao => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="transaction-info">
          <span class="transaction-description">${transacao.descricao}</span>
          <span class="transaction-date">${new Date(transacao.data).toLocaleDateString('pt-BR')}</span>
        </div>
        <div class="transaction-details">
          <span class="transaction-value ${transacao.tipo === 'entrada' ? 'positive' : 'negative'}">R$ ${transacao.valor.toFixed(2)}</span>
          ${transacao.detalhesVenda ? `<button class="btn-action btn-view-details" data-id="${transacao.id}" title="Ver Detalhes"><i class="fas fa-info-circle"></i></button>` : ''}
        </div>
      `;
      historicoList.appendChild(li);
    });
  }

  async function registrarOutraTransacao() {
    const tipo = transacaoTipoInput.value;
    const descricao = transacaoDescricaoInput.value.trim();
    const valor = parseFloat(transacaoValorInput.value);

    if (!tipo || !descricao || isNaN(valor) || valor <= 0) {
      showCustomPopup('Erro', 'Por favor, preencha todos os campos e garanta que o valor seja positivo.', 'error');
      return;
    }

    const confirmAdd = await showCustomConfirm('Confirmação', `Confirmar a ${tipo} de R$ ${valor.toFixed(2)}?`);
    if (!confirmAdd) {
        return;
    }

    try {
      const novaTransacao = {
        tipo: tipo,
        descricao: descricao,
        valor: valor,
        data: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        total_bruto: valor, // Para outras transações, bruto é igual ao valor
        valor_desconto: 0 // Para outras transações, não há desconto
      };

      await fazerRequisicaoApi('/api/transacoes', 'POST', novaTransacao);
      
      closeModal(novaTransacaoModalOverlay);
      await carregarHistoricoTransacoes(); // Recarrega o histórico após adicionar
      showCustomPopup('Sucesso', 'Transação registrada com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao registrar transação:', error);
      showCustomPopup('Erro', error.message || 'Não foi possível registrar a transação.', 'error');
    }
  }

  // --- FUNÇÕES DE RELATÓRIO ---

  async function gerarRelatorioVendas() {
    const periodo = relatorioPeriodoInput.value;
    let dataInicio = relatorioDataInicioInput.value;
    let dataFim = relatorioDataFimInput.value;

    const hoje = new Date();
    const umMesAtras = new Date(hoje.getFullYear(), hoje.getMonth() - 1, hoje.getDate());
    const umaSemanaAtras = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 7);

    // Ajusta as datas com base no período selecionado, se as datas não foram preenchidas manualmente
    if (!dataInicio && !dataFim) {
      if (periodo === 'semanal') {
        dataInicio = umaSemanaAtras.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
      } else if (periodo === 'mensal') {
        dataInicio = umMesAtras.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
      } else if (periodo === 'diario') {
        dataInicio = hoje.toISOString().split('T')[0];
        dataFim = hoje.toISOString().split('T')[0];
      }
    }
    
    // Validação de datas
    if (dataInicio && dataFim && new Date(dataInicio) > new Date(dataFim)) {
      showCustomPopup('Erro', 'A data de início não pode ser posterior à data de fim.', 'error');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('dataInicio', dataInicio);
      if (dataFim) params.append('dataFim', dataFim);
      params.append('tipo', 'entrada'); // Relatório de VENDAS (entradas)

      const url = `/api/transacoes?${params.toString()}`;
      const vendasNoPeriodo = await fazerRequisicaoApi(url, 'GET');

      let totalVendas = 0;
      let totalDescontos = 0;
      let totalBrutoVendas = 0;

      relatorioDetalhes.innerHTML = ''; // Limpa antes de preencher

      if (vendasNoPeriodo.length === 0) {
        relatorioDetalhes.innerHTML = '<p>Nenhuma venda encontrada para o período selecionado.</p>';
        return;
      }

      vendasNoPeriodo.forEach(venda => {
        totalVendas += venda.valor;
        totalBrutoVendas += venda.detalhesVenda ? parseFloat(venda.detalhesVenda.totalBruto) : 0;
        totalDescontos += venda.detalhesVenda ? parseFloat(venda.detalhesVenda.valorDesconto) : 0;
        
        // Exibe os detalhes de cada venda
        const vendaDiv = document.createElement('div');
        vendaDiv.classList.add('relatorio-venda-item');
        vendaDiv.innerHTML = `
            <h4>Venda ID: ${venda.id} - ${new Date(venda.data).toLocaleDateString('pt-BR')}</h4>
            <p><strong>Total Bruto:</strong> R$ ${parseFloat(venda.detalhesVenda.totalBruto).toFixed(2)}</p>
            <p><strong>Desconto Aplicado:</strong> R$ ${parseFloat(venda.detalhesVenda.valorDesconto).toFixed(2)}</p>
            <p><strong>Total Final:</strong> R$ ${parseFloat(venda.detalhesVenda.totalFinal).toFixed(2)}</p>
            <h5>Itens Vendidos:</h5>
            <ul>
                ${venda.detalhesVenda.itens ? venda.detalhesVenda.itens.map(item => `
                    <li>- ${item.nomeProduto} (${item.codProduto}): ${item.quantidadeVendida} x R$ ${item.precoUnitarioVenda.toFixed(2)} = R$ ${item.totalItem.toFixed(2)}</li>
                `).join('') : '<li>Nenhum item detalhado.</li>'}
            </ul>
        `;
        relatorioDetalhes.appendChild(vendaDiv);
      });

      // Resumo final do relatório
      const resumoDiv = document.createElement('div');
      resumoDiv.classList.add('relatorio-resumo');
      resumoDiv.innerHTML = `
          <h3>Resumo do Período</h3>
          <p><strong>Total de Vendas Brutas:</strong> R$ ${totalBrutoVendas.toFixed(2)}</p>
          <p><strong>Total de Descontos Concedidos:</strong> R$ ${totalDescontos.toFixed(2)}</p>
          <p><strong>Total Líquido de Vendas:</strong> R$ ${totalVendas.toFixed(2)}</p>
      `;
      relatorioDetalhes.prepend(resumoDiv); // Adiciona no início
    } catch (error) {
      console.error('Erro ao gerar relatório de vendas:', error);
      relatorioDetalhes.innerHTML = '<p style="color: var(--danger-color);">Erro ao carregar o relatório de vendas.</p>';
      showCustomPopup('Erro', error.message || 'Não foi possível gerar o relatório de vendas.', 'error');
    }
  }

  // --- FUNÇÕES DE UTILIDADE DE MODAL (comuns) ---
  const openModal = (overlay) => overlay.classList.remove('hidden');
  const closeModal = (overlay) => {
    overlay.classList.add('hidden');
    // Resets para formulários específicos se necessário
    novaTransacaoForm.reset();
    relatorioVendasModalOverlay.classList.add('hidden'); // Garante que o modal de relatório seja fechado
    // Limpa os campos do relatório ao fechar o modal
    relatorioPeriodoInput.value = 'nenhum';
    relatorioDataInicioInput.value = '';
    relatorioDataFimInput.value = '';
    relatorioDetalhes.innerHTML = ''; // Limpa o conteúdo do relatório
  };


  // --- EVENT LISTENERS DE CONTROLE DE CAIXA ---

  // Eventos de filtro
  filtroTipoTransacao.addEventListener('change', () => carregarHistoricoTransacoes({
    dataInicio: dataInicioInput.value,
    dataFim: dataFimInput.value,
    tipo: filtroTipoTransacao.value
  }));
  aplicarFiltrosBtn.addEventListener('click', () => carregarHistoricoTransacoes({
    dataInicio: dataInicioInput.value,
    dataFim: dataFimInput.value,
    tipo: filtroTipoTransacao.value
  }));
  limparFiltrosBtn.addEventListener('click', () => {
    filtroTipoTransacao.value = 'todos';
    dataInicioInput.value = '';
    dataFimInput.value = '';
    carregarHistoricoTransacoes(); // Recarrega sem filtros
  });


  // Eventos de Nova Transação
  openNovaTransacaoModalBtn.addEventListener('click', () => openModal(novaTransacaoModalOverlay));
  cancelarNovaTransacaoBtn.addEventListener('click', () => closeModal(novaTransacaoModalOverlay));
  novaTransacaoModalOverlay.addEventListener('click', (e) => {
      if(e.target === novaTransacaoModalOverlay) closeModal(novaTransacaoModalOverlay);
  });
  novaTransacaoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await registrarOutraTransacao();
  });

  // Eventos de Relatório de Vendas
  gerarRelatorioVendasBtn.addEventListener('click', () => openModal(relatorioVendasModalOverlay));
  cancelarRelatorioBtn.addEventListener('click', () => closeModal(relatorioVendasModalOverlay));
  relatorioVendasModalOverlay.addEventListener('click', (e) => {
      if(e.target === relatorioVendasModalOverlay) closeModal(relatorioVendasModalOverlay);
  });
  gerarRelatorioBtn.addEventListener('click', gerarRelatorioVendas);

  // Evento para visualizar detalhes de transação específica (vendas)
  historicoList.addEventListener('click', (e) => {
    const viewDetailsBtn = e.target.closest('.btn-view-details');
    if (viewDetailsBtn) {
        const transacaoId = parseInt(viewDetailsBtn.dataset.id);
        const transacao = historicoTransacoes.find(t => t.id === transacaoId);
        
        if (transacao && transacao.detalhesVenda) {
            // Preenche o modal de relatório com os detalhes da transação selecionada
            relatorioDetalhes.innerHTML = ''; // Limpa
            const vendaDiv = document.createElement('div');
            vendaDiv.classList.add('relatorio-venda-item');
            vendaDiv.innerHTML = `
                <h4>Venda ID: ${transacao.id} - ${new Date(transacao.data).toLocaleDateString('pt-BR')}</h4>
                <p><strong>Total Bruto:</strong> R$ ${parseFloat(transacao.detalhesVenda.totalBruto).toFixed(2)}</p>
                <p><strong>Desconto Aplicado:</strong> R$ ${parseFloat(transacao.detalhesVenda.valorDesconto).toFixed(2)}</p>
                <p><strong>Total Final:</strong> R$ ${parseFloat(transacao.detalhesVenda.totalFinal).toFixed(2)}</p>
                <h5>Itens Vendidos:</h5>
                <ul>
                    ${transacao.detalhesVenda.itens ? transacao.detalhesVenda.itens.map(item => `
                        <li>- ${item.nomeProduto} (${item.codProduto}): ${item.quantidadeVendida} x R$ ${item.precoUnitarioVenda.toFixed(2)} = R$ ${item.totalItem.toFixed(2)}</li>
                    `).join('') : '<li>Nenhum item detalhado.</li>'}
                </ul>
            `;
            relatorioDetalhes.appendChild(vendaDiv);
            openModal(relatorioVendasModalOverlay); // Reutiliza o modal de relatório para exibir detalhes
        } else {
            showCustomPopup('Informação', 'Não há detalhes de venda para esta transação.', 'info');
        }
    }
  });


  // Carrega produtos para notificações (usando a mesma API de produtos)
  async function loadProdutosForNotifications() {
    try {
        produtos = await fazerRequisicaoApi('/api/produtos', 'GET');
        atualizarNotificacoesComuns(); // Usada para o cabeçalho
    } catch (error) {
        console.error('Erro ao carregar produtos para notificações:', error);
    }
  }

  // No carregamento da página
  document.addEventListener('DOMContentLoaded', async () => {
    await carregarHistoricoTransacoes();
    await loadProdutosForNotifications(); // Carrega produtos para as notificações
  });
}