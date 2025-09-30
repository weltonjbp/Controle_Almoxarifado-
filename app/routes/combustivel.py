# Em app/routes/combustivel.py

from flask import Blueprint, jsonify, request
from ..models import db, CombustivelEstoque, CombustivelEntrada, CombustivelSaida, TipoCombustivel, Veiculo, Funcionario, Implemento, Usuario
from flask_login import login_required, current_user
from datetime import datetime

combustivel_bp = Blueprint('combustivel', __name__)

@combustivel_bp.route('/combustivel/dados', methods=['GET'])
@login_required
def get_dados_combustivel():
    estoques = CombustivelEstoque.query.all()
    saidas = CombustivelSaida.query.order_by(CombustivelSaida.data.desc()).limit(20).all()
    funcionarios = Funcionario.query.order_by(Funcionario.nome).all()
    implementos = Implemento.query.order_by(Implemento.nome).all()

    estoque_data = [{'tipo_combustivel_nome': e.tipo_combustivel.nome, 'quantidade': e.quantidade} for e in estoques]
    
    historico_data = [{
        'id': s.id,
        'data': s.data.strftime('%d/%m/%Y'),
        'veiculo_nome': s.veiculo.nome,
        'funcao_nome': s.funcao.nome,
        'quantidade': s.quantidade_abastecida,
        'horas_trabalhadas': s.horas_trabalhadas,
        'hodometro_horimetro': s.horimetro_final,
        'usuario_nome': s.usuario.username,
        'funcionario_nome': s.funcionario.nome if s.funcionario else '',
        'implemento_nome': s.implemento.nome if s.implemento else ''
    } for s in saidas]
    
    funcionarios_data = [{'id': f.id, 'nome': f.nome} for f in funcionarios]
    implementos_data = [{'id': i.id, 'nome': i.nome} for i in implementos]

    return jsonify({
        'estoque': estoque_data,
        'historico': historico_data,
        'funcionarios': funcionarios_data,
        'implementos': implementos_data
    })


# =====> CORREÇÃO PRINCIPAL APLICADA AQUI <=====
@combustivel_bp.route('/combustivel/entradas', methods=['GET', 'POST'])
@login_required
def handle_entradas():
    # Se o pedido for GET, lista todas as entradas
    if request.method == 'GET':
        entradas = CombustivelEntrada.query.order_by(CombustivelEntrada.data.desc()).all()
        return jsonify([{'id': e.id, 'data': e.data.strftime('%d/%m/%Y'), 'tipo_combustivel': e.tipo_combustivel.nome, 'quantidade': e.quantidade, 'preco_litro': e.preco_litro} for e in entradas])
    
    # Se o pedido for POST, cria uma nova entrada
    if request.method == 'POST':
        data = request.get_json()
        if not all(k in data for k in ['tipo_combustivel_id', 'quantidade', 'preco_litro']):
            return jsonify({'error': 'Dados incompletos.'}), 400

        estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=data['tipo_combustivel_id']).first()
        if not estoque:
            estoque = CombustivelEstoque(tipo_combustivel_id=data['tipo_combustivel_id'], quantidade=0)
            db.session.add(estoque)
        
        estoque.quantidade += float(data['quantidade'])
        
        nova_entrada = CombustivelEntrada(
            quantidade=data['quantidade'], 
            preco_litro=data['preco_litro'],
            data=datetime.utcnow().date(),
            tipo_combustivel_id=data['tipo_combustivel_id'], 
            usuario_id=current_user.id,
            observacao=data.get('observacao'),
            fornecedor_id=data.get('fornecedor_id') if data.get('fornecedor_id') else None
        )
        db.session.add(nova_entrada)
        db.session.commit()
        return jsonify({'message': 'Entrada de combustível registada com sucesso!'}), 201

    # Adiciona um retorno padrão para garantir que sempre retorna algo
    return jsonify({'error': 'Método não permitido.'}), 405

@combustivel_bp.route('/combustivel/entradas/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def handle_entrada_by_id(id):
    entrada = CombustivelEntrada.query.get_or_404(id)

    if request.method == 'GET':
        return jsonify({
            'id': entrada.id, 'quantidade': entrada.quantidade, 'preco_litro': entrada.preco_litro,
            'data': entrada.data.strftime('%Y-%m-%d'), 'observacao': entrada.observacao,
            'tipo_combustivel_id': entrada.tipo_combustivel_id, 'fornecedor_id': entrada.fornecedor_id
        })

    elif request.method == 'PUT':
        data = request.get_json()
        estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=entrada.tipo_combustivel_id).first()
        
        if estoque:
            estoque.quantidade -= entrada.quantidade
            estoque.quantidade += float(data.get('quantidade', entrada.quantidade))

        entrada.quantidade = float(data.get('quantidade', entrada.quantidade))
        entrada.preco_litro = float(data.get('preco_litro', entrada.preco_litro))
        entrada.observacao = data.get('observacao', entrada.observacao)
        entrada.fornecedor_id = data.get('fornecedor_id') if data.get('fornecedor_id') else None
        db.session.commit()
        return jsonify({'message': 'Entrada atualizada com sucesso!'})

    elif request.method == 'DELETE':
        estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=entrada.tipo_combustivel_id).first()
        if estoque:
            estoque.quantidade -= entrada.quantidade
        
        db.session.delete(entrada)
        db.session.commit()
        return jsonify({'message': 'Entrada excluída com sucesso!'})

    # Explicitly handle unsupported methods
    return jsonify({'error': 'Método não permitido.'}), 405


@combustivel_bp.route('/combustivel/saidas', methods=['POST'])
@login_required
def registrar_saida():
    data = request.get_json()
    required_fields = ['tipo_combustivel_id', 'quantidade_abastecida', 'veiculo_id', 'funcao_id', 'data', 'horimetro_inicial', 'horimetro_final', 'funcionario_id']
    if not all(k in data for k in required_fields):
        return jsonify({'error': 'Dados incompletos.'}), 400

    horimetro_inicial = float(data['horimetro_inicial'])
    horimetro_final = float(data['horimetro_final'])

    if horimetro_final < horimetro_inicial:
        return jsonify({'error': 'O horímetro final não pode ser menor que o inicial.'}), 400
    
    horas_trabalhadas = horimetro_final - horimetro_inicial

    estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=data['tipo_combustivel_id']).first()
    quantidade_saida = float(data['quantidade_abastecida'])
    if not estoque or estoque.quantidade < quantidade_saida:
        return jsonify({'error': f'Stock insuficiente. Disponível: {estoque.quantidade if estoque else 0} L'}), 400
    estoque.quantidade -= quantidade_saida

    veiculo = Veiculo.query.get(data['veiculo_id'])
    if veiculo:
        veiculo.hodometro_horimetro = horimetro_final
        db.session.add(veiculo)

    nova_saida = CombustivelSaida(
        quantidade_abastecida=quantidade_saida, data=datetime.strptime(data['data'], '%Y-%m-%d').date(),
        horimetro_inicial=horimetro_inicial,
        horimetro_final=horimetro_final,
        horas_trabalhadas=horas_trabalhadas,
        descricao=data.get('descricao'),
        veiculo_id=data['veiculo_id'], funcao_id=data['funcao_id'], tipo_combustivel_id=data['tipo_combustivel_id'],
        usuario_id=current_user.id, funcionario_id=data.get('funcionario_id'),
        implemento_id=data.get('implemento_id') if data.get('implemento_id') else None
    )
    db.session.add(nova_saida)
    db.session.commit()
    return jsonify({'message': 'Saída de combustível registada com sucesso!'}), 201


@combustivel_bp.route('/combustivel/saidas/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@login_required
def handle_saida_by_id(id):
    saida = CombustivelSaida.query.get_or_404(id)

    if request.method == 'GET':
        return jsonify({
            'id': saida.id, 'data': saida.data.strftime('%Y-%m-%d'),
            'funcionario_id': saida.funcionario_id, 'veiculo_id': saida.veiculo_id,
            'implemento_id': saida.implemento_id, 'tipo_combustivel_id': saida.tipo_combustivel_id,
            'funcao_id': saida.funcao_id,
            'horimetro_inicial': saida.horimetro_inicial, 'horimetro_final': saida.horimetro_final,
            'quantidade_abastecida': saida.quantidade_abastecida, 'descricao': saida.descricao
        })

    if request.method == 'PUT':
        data = request.get_json()
        estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=saida.tipo_combustivel_id).first()
        
        quantidade_antiga = saida.quantidade_abastecida
        quantidade_nova = float(data.get('quantidade_abastecida', quantidade_antiga))

        if estoque:
            estoque.quantidade += quantidade_antiga
            if estoque.quantidade < quantidade_nova:
                 estoque.quantidade -= quantidade_antiga
                 return jsonify({'error': f'Stock insuficiente para esta correção. Disponível: {estoque.quantidade}'}), 400
            estoque.quantidade -= quantidade_nova
        
        horimetro_inicial = float(data.get('horimetro_inicial', 0))
        horimetro_final = float(data.get('horimetro_final', 0))

        saida.data = datetime.strptime(data['data'], '%Y-%m-%d').date()
        saida.funcionario_id = data.get('funcionario_id')
        saida.veiculo_id = data.get('veiculo_id')
        saida.implemento_id = data.get('implemento_id')
        saida.tipo_combustivel_id = data.get('tipo_combustivel_id')
        saida.funcao_id = data.get('funcao_id')
        saida.horimetro_inicial = horimetro_inicial
        saida.horimetro_final = horimetro_final
        saida.horas_trabalhadas = horimetro_final - horimetro_inicial
        saida.quantidade_abastecida = quantidade_nova
        saida.descricao = data.get('descricao')

        db.session.commit()
        return jsonify({'message': 'Saída atualizada com sucesso!'})

    if request.method == 'DELETE':
        estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=saida.tipo_combustivel_id).first()
        if estoque:
            estoque.quantidade += saida.quantidade_abastecida
        
        db.session.delete(saida)
        db.session.commit()
        return jsonify({'message': 'Saída excluída com sucesso e estoque corrigido!'})
# Adiciona um retorno padrão para garantir que sempre retorna algo
    return jsonify({'error': 'Método não permitido.'}), 405
