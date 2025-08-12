# Em app/routes/relatorios.py

from flask import Blueprint, jsonify, request, render_template, Response
from ..models import db, Movimentacao
from flask_login import login_required
from datetime import datetime

# --- NOVAS IMPORTAÇÕES ---
from io import BytesIO
from xhtml2pdf import pisa

relatorios_bp = Blueprint('relatorios', __name__)

# --- FUNÇÃO AUXILIAR PARA CRIAR O PDF ---
def criar_pdf(html_renderizado):
    """Converte uma string HTML para um objeto PDF em memória."""
    pdf_buffer = BytesIO()
    pisa.CreatePDF(BytesIO(html_renderizado.encode('UTF-8')), dest=pdf_buffer)
    pdf_buffer.seek(0)
    return pdf_buffer

# Rota para ver o relatório na tela (sem alterações)
@relatorios_bp.route('/relatorios/movimentacoes', methods=['GET'])
@login_required
def get_relatorio_movimentacoes():
    # ... (código existente, sem alterações)
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    query = Movimentacao.query
    if data_inicio:
        query = query.filter(Movimentacao.data >= data_inicio)
    if data_fim:
        query = query.filter(Movimentacao.data <= f'{data_fim} 23:59:59')
    movimentacoes = query.order_by(Movimentacao.data.desc()).all()
    dados_relatorio = [{
        'data': m.data.strftime('%d/%m/%Y %H:%M'),
        'produto_nome': m.produto.nome,
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome,
        'usuario_nome': m.usuario.username, # Garanta que esta linha existe
        'valor_total': (m.produto.preco_unitario * m.quantidade) if m.produto.preco_unitario else 0
    } for m in movimentacoes]
    return jsonify(dados_relatorio)

# --- ROTA DE PDF ATUALIZADA ---
@relatorios_bp.route('/relatorios/movimentacoes/pdf', methods=['GET'])
@login_required
def gerar_pdf_movimentacoes():
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')

    query = Movimentacao.query
    if data_inicio_str:
        query = query.filter(Movimentacao.data >= data_inicio_str)
    if data_fim_str:
        query = query.filter(Movimentacao.data <= f'{data_fim_str} 23:59:59')

    movimentacoes = query.order_by(Movimentacao.data.asc()).all()
    
    dados_para_template = [{
        'data': m.data.strftime('%d/%m/%Y %H:%M'),
        'produto_nome': m.produto.nome,
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome,
        'usuario_nome': m.usuario.username,
        'valor_total': (m.produto.preco_unitario * m.quantidade) if m.produto.preco_unitario else 0
    } for m in movimentacoes]

    # Renderiza o mesmo template HTML de antes
    html_renderizado = render_template(
        'relatorio_pdf.html',
        movimentacoes=dados_para_template,
        data_inicio=datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_inicio_str else 'Início',
        data_fim=datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_fim_str else 'Fim',
        data_geracao=datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    )

    # Usa a nossa nova função para criar o PDF
    pdf = criar_pdf(html_renderizado)

    return Response(
        pdf,
        mimetype='application/pdf',
        headers={'Content-Disposition': 'attachment;filename=relatorio_movimentacoes.pdf'}
    )
