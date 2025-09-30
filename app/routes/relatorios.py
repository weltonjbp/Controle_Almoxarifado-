# Em app/routes/relatorios.py

from flask import Blueprint, jsonify, request, render_template, Response
# Adicionar func do sqlalchemy para usar a função SUM
from sqlalchemy import func 
# Adicionar os modelos Produto e Setor
from flask_login import login_required
from datetime import datetime
from io import BytesIO
from collections import defaultdict
from xhtml2pdf import pisa
from ..models import db, Movimentacao, Produto, Setor, Veiculo, Manutencao, CombustivelSaida, Usuario, Funcionario, Funcao, TipoCombustivel





relatorios_bp = Blueprint('relatorios', __name__)

def criar_pdf(html_renderizado):
    pdf_buffer = BytesIO()
    pisa.CreatePDF(BytesIO(html_renderizado.encode('UTF-8')), dest=pdf_buffer)
    pdf_buffer.seek(0)
    return pdf_buffer

# ... (a sua rota get_relatorio_movimentacoes e gerar_pdf_movimentacoes continuam aqui, sem alterações) ...
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
        'produto_nome': m.produto.nome if m.produto else 'Produto Removido',
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome if m.setor else 'Setor Removido',
        'usuario_nome': m.usuario.username if m.usuario else 'Utilizador Removido',
        'valor_total': (m.produto.preco_unitario * m.quantidade) if m.produto and m.produto.preco_unitario else 0
    } for m in movimentacoes]
    return jsonify(dados_relatorio)

@relatorios_bp.route('/relatorios/movimentacoes/pdf', methods=['GET'])
@login_required
def gerar_pdf_movimentacoes():
    # ... (código existente, sem alterações)
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
        'produto_nome': m.produto.nome if m.produto else 'Produto Removido',
        'tipo': m.tipo,
        'quantidade': m.quantidade,
        'setor_nome': m.setor.nome if m.setor else 'Setor Removido',
        'usuario_nome': m.usuario.username if m.usuario else 'Utilizador Removido',
        'valor_total': (m.produto.preco_unitario * m.quantidade) if m.produto and m.produto.preco_unitario else 0
    } for m in movimentacoes]

    html_renderizado = render_template(
        'relatorio_pdf.html',
        movimentacoes=dados_para_template,
        data_inicio=datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_inicio_str else 'Início',
        data_fim=datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_fim_str else 'Fim',
        data_geracao=datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    )

    pdf = criar_pdf(html_renderizado)

    return Response(
        pdf,
        mimetype='application/pdf',
        headers={'Content-Disposition': 'attachment;filename=relatorio_movimentacoes.pdf'}
    )


# --- NOVA ROTA ADICIONADA AQUI ---
@relatorios_bp.route('/relatorios/estoque/pdf', methods=['GET'])
@login_required
def gerar_pdf_estoque():
    """ Gera um relatório PDF com a posição atual de todos os produtos em stock, com filtros opcionais. """
    
    # Captura os filtros da URL
    almoxarifado_id = request.args.get('almoxarifado_id')
    categoria_id = request.args.get('categoria_id')

    query = Produto.query

    # Aplica os filtros se eles foram fornecidos e não são 'todos'
    if almoxarifado_id and almoxarifado_id != 'todos':
        query = query.filter(Produto.almoxarifado_id == almoxarifado_id)
    
    if categoria_id and categoria_id != 'todos':
        query = query.filter(Produto.categoria_id == categoria_id)

    produtos = query.order_by(Produto.nome).all()
    
    valor_total_estoque = 0
    
    dados_para_template = []
    for p in produtos:
        valor_item = (p.preco_unitario or 0) * (p.estoque or 0)
        valor_total_estoque += valor_item
        dados_para_template.append({
            'nome': p.nome,
            'categoria': p.categoria.nome if p.categoria else 'N/A',
            'almoxarifado': p.almoxarifado.nome if p.almoxarifado else 'N/A',
            'estoque': p.estoque or 0,
            'unidade': p.unidade or '',
            'valor_unitario': p.preco_unitario or 0,
            'valor_total_item': valor_item
        })

    html_renderizado = render_template(
        'relatorio_estoque_pdf.html',
        produtos=dados_para_template,
        valor_total_estoque=valor_total_estoque,
        data_geracao=datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    )

    pdf = criar_pdf(html_renderizado)

    return Response(
        pdf,
        mimetype='application/pdf',
        headers={'Content-Disposition': 'attachment;filename=relatorio_estoque.pdf'}
    )
    
    
@relatorios_bp.route('/relatorios/gastos-por-setor', methods=['GET'])
@login_required
def get_gastos_por_setor():
    try:
        gastos_query = db.session.query(
            Setor.nome,
            func.sum(Movimentacao.quantidade * Produto.preco_unitario)
        ).join(
            Movimentacao, Setor.id == Movimentacao.setor_id
        ).join(
            Produto, Movimentacao.produto_id == Produto.id
        ).filter(
            Movimentacao.tipo == 'saida',
            Produto.preco_unitario.isnot(None)
        ).group_by(
            Setor.nome
        ).order_by(
            func.sum(Movimentacao.quantidade * Produto.preco_unitario).desc()
        ).all()

        dados_formatados = [{'setor': nome, 'total': float(total)} for nome, total in gastos_query]
        return jsonify(dados_formatados)

    except Exception as e:
        print(f"ERRO NA API DE GASTOS POR SETOR: {e}")
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500   
    
    
    
# --- ROTA DE PDF ATUALIZADA PARA ACEITAR DATAS ---
@relatorios_bp.route('/relatorios/custos-manutencao/pdf', methods=['GET'])
@login_required
def gerar_pdf_custos_manutencao():
    """ Gera um PDF com os custos de manutenção, com filtro de data. """
    try:
        data_inicio_str = request.args.get('data_inicio')
        data_fim_str = request.args.get('data_fim')

        query = db.session.query(Veiculo).join(Manutencao)
        if data_inicio_str:
            query = query.filter(Manutencao.data >= data_inicio_str)
        if data_fim_str:
            query = query.filter(Manutencao.data <= data_fim_str)
            
        veiculos_com_manutencao = query.distinct().all()
        
        custos_data = []
        custo_total_geral = 0
        for veiculo in veiculos_com_manutencao:
            manutencoes_filtradas = [m for m in veiculo.manutencoes if (not data_inicio_str or m.data >= datetime.strptime(data_inicio_str, '%Y-%m-%d').date()) and (not data_fim_str or m.data <= datetime.strptime(data_fim_str, '%Y-%m-%d').date())]

            custo_total_mo = sum(m.custo_mo or 0 for m in manutencoes_filtradas)
            custo_total_pecas = sum(m.custo_pecas for m in manutencoes_filtradas)
            custo_total_veiculo = custo_total_mo + custo_total_pecas
            custo_total_geral += custo_total_veiculo
            
            custos_data.append({
                'veiculo_nome': veiculo.nome,
                'custo_pecas': custo_total_pecas,
                'custo_mo': custo_total_mo,
                'custo_total': custo_total_veiculo
            })

        custos_ordenados = sorted(custos_data, key=lambda x: x['custo_total'], reverse=True)

        html_renderizado = render_template(
            'relatorio_manutencao_pdf.html',
            custos=custos_ordenados,
            custo_total_geral=custo_total_geral,
            data_geracao=datetime.now().strftime('%d/%m/%Y %H:%M:%S'),
            data_inicio=datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_inicio_str else None,
            data_fim=datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d/%m/%Y') if data_fim_str else None
        )

        pdf = criar_pdf(html_renderizado)
        return Response(pdf, mimetype='application/pdf', headers={'Content-Disposition': 'attachment;filename=relatorio_custos_manutencao.pdf'})

    except Exception as e:
        print(f"ERRO AO GERAR PDF DE CUSTOS DE MANUTENÇÃO: {e}")
        return jsonify({"error": "Ocorreu um erro interno ao gerar o PDF."}), 500
    
    
    
# --- ROTA ATUALIZADA PARA ACEITAR DATAS ---
@relatorios_bp.route('/relatorios/custos-manutencao', methods=['GET'])
@login_required
def get_custos_manutencao():
    try:
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')

        query = db.session.query(Veiculo).join(Manutencao)

        if data_inicio:
            query = query.filter(Manutencao.data >= data_inicio)
        if data_fim:
            query = query.filter(Manutencao.data <= data_fim)
            
        veiculos_com_manutencao = query.distinct().all()
        
        resultado = []
        for veiculo in veiculos_com_manutencao:
            manutencoes_filtradas = [m for m in veiculo.manutencoes if (not data_inicio or m.data >= datetime.strptime(data_inicio, '%Y-%m-%d').date()) and (not data_fim or m.data <= datetime.strptime(data_fim, '%Y-%m-%d').date())]
            
            custo_total_mo = sum(m.custo_mo or 0 for m in manutencoes_filtradas)
            custo_total_pecas = sum(m.custo_pecas for m in manutencoes_filtradas)
            
            if custo_total_mo + custo_total_pecas > 0:
                resultado.append({
                    'veiculo_nome': veiculo.nome,
                    'custo_pecas': custo_total_pecas,
                    'custo_mo': custo_total_mo,
                    'custo_total': custo_total_mo + custo_total_pecas
                })

        resultado_ordenado = sorted(resultado, key=lambda x: x['custo_total'], reverse=True)
        return jsonify(resultado_ordenado)

    except Exception as e:
        print(f"ERRO NA API DE CUSTOS DE MANUTENÇÃO: {e}")
        return jsonify({"error": "Ocorreu um erro interno no servidor."}), 500



@relatorios_bp.route('/relatorios/saidas-combustivel', methods=['GET'])
@login_required
def get_saidas_combustivel():
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')
    funcionario_id = request.args.get('funcionario_id')
    funcao_id = request.args.get('funcao_id')
    veiculo_id = request.args.get('veiculo_id')

    query = CombustivelSaida.query
    
    if data_inicio:
        query = query.filter(CombustivelSaida.data >= data_inicio)
    if data_fim:
        query = query.filter(CombustivelSaida.data <= f'{data_fim} 23:59:59')
    
    if funcionario_id and funcionario_id != 'todos':
        query = query.filter(CombustivelSaida.funcionario_id == funcionario_id)
    if funcao_id and funcao_id != 'todos':
        query = query.filter(CombustivelSaida.funcao_id == funcao_id)
    if veiculo_id and veiculo_id != 'todos':
        query = query.filter(CombustivelSaida.veiculo_id == veiculo_id)

    saidas = query.order_by(CombustivelSaida.data.desc()).all()
    
    dados_relatorio = [{
        'data': s.data.strftime('%d/%m/%Y'),
        'veiculo_nome': s.veiculo.nome if s.veiculo else 'N/A',
        'tipo_combustivel_nome': s.tipo_combustivel.nome if s.tipo_combustivel else 'N/A',
        'funcao_nome': s.funcao.nome if s.funcao else 'N/A',
        'quantidade': s.quantidade_abastecida,
        'hodometro_horimetro': s.horimetro_final, # <-- CORREÇÃO AQUI
        'usuario_nome': s.usuario.username if s.usuario else 'N/A',
        'funcionario_nome': s.funcionario.nome if s.funcionario else 'N/A'
    } for s in saidas]

    return jsonify(dados_relatorio)

@relatorios_bp.route('/relatorios/saidas-combustivel/pdf', methods=['GET'])
@login_required
def gerar_pdf_saidas_combustivel():
    data_inicio_str = request.args.get('data_inicio')
    data_fim_str = request.args.get('data_fim')
    funcionario_id = request.args.get('funcionario_id')
    funcao_id = request.args.get('funcao_id')
    veiculo_id = request.args.get('veiculo_id')

    query = CombustivelSaida.query

    # Construção do título dinâmico
    filtros_descricao = []
    if data_inicio_str and data_fim_str:
        filtros_descricao.append(f"Período de {datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y')} a {datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d/%m/%Y')}")
    elif data_inicio_str:
        filtros_descricao.append(f"A partir de {datetime.strptime(data_inicio_str, '%Y-%m-%d').strftime('%d/%m/%Y')}")
    elif data_fim_str:
        filtros_descricao.append(f"Até {datetime.strptime(data_fim_str, '%Y-%m-%d').strftime('%d/%m/%Y')}")

    # Aplica os filtros à query
    if data_inicio_str:
        query = query.filter(CombustivelSaida.data >= data_inicio_str)
    if data_fim_str:
        query = query.filter(CombustivelSaida.data <= f'{data_fim_str} 23:59:59')
        
    if funcionario_id and funcionario_id != 'todos':
        f = Funcionario.query.get(funcionario_id)
        if f:
            filtros_descricao.append(f"Funcionário: {f.nome}")
        query = query.filter(CombustivelSaida.funcionario_id == funcionario_id)
    if funcao_id and funcao_id != 'todos':
        f = Funcao.query.get(funcao_id)
        if f:
            filtros_descricao.append(f"Função: {f.nome}")
        query = query.filter(CombustivelSaida.funcao_id == funcao_id)
    if veiculo_id and veiculo_id != 'todos':
        v = Veiculo.query.get(veiculo_id)
        if v:
            filtros_descricao.append(f"Veículo: {v.nome}")
        query = query.filter(CombustivelSaida.veiculo_id == veiculo_id)

    saidas = query.order_by(CombustivelSaida.veiculo_id, CombustivelSaida.funcao_id, CombustivelSaida.data).all()
    
    # Agrupamento dos dados
    dados_agrupados = defaultdict(lambda: {'registos': [], 'total_litros': 0, 'total_horas': 0})
    for s in saidas:
        chave = (s.veiculo.nome, s.funcao.nome)
        dados_agrupados[chave]['registos'].append({
            'data': s.data.strftime('%d/%m/%Y'),
            'funcionario_nome': s.funcionario.nome if s.funcionario else 'N/A',
            'horimetro_inicial': s.horimetro_inicial,
            'horimetro_final': s.horimetro_final,
            'horas_trabalhadas': s.horas_trabalhadas or 0,
            'quantidade': s.quantidade_abastecida
        })
        dados_agrupados[chave]['total_litros'] += s.quantidade_abastecida
        dados_agrupados[chave]['total_horas'] += s.horas_trabalhadas or 0

    # Converter o dicionário para uma lista de tuplos para o template
    relatorio_final = sorted(dados_agrupados.items())

    html_renderizado = render_template(
        'relatorio_saida_combustivel_pdf.html',
        dados_agrupados=relatorio_final,
        filtros_descricao=", ".join(filtros_descricao) if filtros_descricao else "Geral (sem filtros)",
        data_geracao=datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    )

    pdf = criar_pdf(html_renderizado)
    return Response(pdf, mimetype='application/pdf', headers={'Content-Disposition': 'attachment;filename=relatorio_saida_combustivel.pdf'})