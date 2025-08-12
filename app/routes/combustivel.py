# Em app/routes/combustivel.py

from flask import Blueprint, jsonify, request
from ..models import db, CombustivelEstoque, CombustivelEntrada, CombustivelSaida, TipoCombustivel
from flask_login import login_required, current_user

combustivel_bp = Blueprint('combustivel', __name__)

# --- Rota para a Página Principal do Controlo de Combustível ---
@combustivel_bp.route('/combustivel/dados', methods=['GET'])
@login_required
def get_dados_combustivel():
    """ Retorna os dados necessários para a página: stock e histórico. """
    estoques = CombustivelEstoque.query.all()
    saidas = CombustivelSaida.query.order_by(CombustivelSaida.data.desc()).limit(20).all()

    estoque_data = [{
        'tipo_combustivel_nome': e.tipo_combustivel.nome,
        'quantidade': e.quantidade
    } for e in estoques]

    historico_data = [{
        'data': s.data.strftime('%d/%m/%Y %H:%M'),
        'veiculo_nome': s.veiculo.nome,
        'funcao_nome': s.funcao.nome,
        'quantidade': s.quantidade_abastecida,
        'horas': s.horas_trabalhadas,
        'usuario_nome': s.usuario.username
    } for s in saidas]

    return jsonify({
        'estoque': estoque_data,
        'historico': historico_data
    })

# --- Rota para Registar ENTRADA de Combustível ---
@combustivel_bp.route('/combustivel/entradas', methods=['POST'])
@login_required
def registrar_entrada():
    data = request.get_json()
    
    # Validação
    if not all(k in data for k in ['tipo_combustivel_id', 'quantidade', 'preco_litro']):
        return jsonify({'error': 'Dados incompletos.'}), 400

    # Atualiza ou cria o stock
    estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=data['tipo_combustivel_id']).first()
    if not estoque:
        estoque = CombustivelEstoque(tipo_combustivel_id=data['tipo_combustivel_id'], quantidade=0)
        db.session.add(estoque)
        
    estoque.quantidade += float(data['quantidade'])
    
    # Regista a entrada
    nova_entrada = CombustivelEntrada(
        quantidade=data['quantidade'],
        preco_litro=data['preco_litro'],
        tipo_combustivel_id=data['tipo_combustivel_id'],
        usuario_id=current_user.id,
        observacao=data.get('observacao')
    )
    db.session.add(nova_entrada)
    db.session.commit()
    
    return jsonify({'message': 'Entrada de combustível registada com sucesso!'}), 201

# --- Rota para Registar SAÍDA de Combustível ---
@combustivel_bp.route('/combustivel/saidas', methods=['POST'])
@login_required
def registrar_saida():
    data = request.get_json()
    
    # Validação
    if not all(k in data for k in ['tipo_combustivel_id', 'quantidade_abastecida', 'veiculo_id', 'funcao_id', 'horas_trabalhadas']):
        return jsonify({'error': 'Dados incompletos.'}), 400

    # Verifica o stock
    estoque = CombustivelEstoque.query.filter_by(tipo_combustivel_id=data['tipo_combustivel_id']).first()
    quantidade_saida = float(data['quantidade_abastecida'])

    if not estoque or estoque.quantidade < quantidade_saida:
        return jsonify({'error': f'Stock insuficiente. Disponível: {estoque.quantidade if estoque else 0} L'}), 400
        
    estoque.quantidade -= quantidade_saida

    # Regista a saída
    nova_saida = CombustivelSaida(
        quantidade_abastecida=quantidade_saida,
        horas_trabalhadas=data['horas_trabalhadas'],
        veiculo_id=data['veiculo_id'],
        funcao_id=data['funcao_id'],
        tipo_combustivel_id=data['tipo_combustivel_id'],
        usuario_id=current_user.id
    )
    db.session.add(nova_saida)
    db.session.commit()

    return jsonify({'message': 'Saída de combustível registada com sucesso!'}), 201
