# Em app/routes/produtos.py

from flask import Blueprint, jsonify, request
from ..models import db, Produto, Categoria, Almoxarifado
from flask_login import login_required
from ..decorators import gerente_required # Importar nosso novo decorator
produtos_bp = Blueprint('produtos', __name__)

@produtos_bp.route('/produtos', methods=['GET'])
def get_produtos():
    produtos = Produto.query.order_by(Produto.nome).all()
    # Para cada produto, incluímos o nome da categoria e do almoxarifado
    produtos_data = [{
        'id': p.id, 
        'nome': p.nome,
        'unidade': p.unidade,
        'preco_unitario': p.preco_unitario,
        'estoque': p.estoque,
        'categoria_nome': p.categoria.nome,
        'almoxarifado_nome': p.almoxarifado.nome
    } for p in produtos]
    return jsonify(produtos_data)

@produtos_bp.route('/produtos/<int:id>', methods=['GET'])
def get_produto(id):
    produto = Produto.query.get_or_404(id)
    return jsonify({
        'id': produto.id, 
        'nome': produto.nome,
        'unidade': produto.unidade,
        'preco_unitario': produto.preco_unitario,
        'estoque': produto.estoque,
        'categoria_id': produto.categoria_id,
        'almoxarifado_id': produto.almoxarifado_id
    })

@produtos_bp.route('/produtos', methods=['POST'])
def create_produto():
    data = request.get_json()
    # Adicionando validações para os campos obrigatórios
    required_fields = ['nome', 'categoria_id', 'almoxarifado_id']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Campos obrigatórios ausentes.'}), 400

    novo_produto = Produto(
        nome=data['nome'],
        unidade=data.get('unidade'),
        preco_unitario=data.get('preco_unitario'),
        estoque=data.get('estoque', 0),
        categoria_id=data['categoria_id'],
        almoxarifado_id=data['almoxarifado_id']
    )
    db.session.add(novo_produto)
    db.session.commit()
    return jsonify({'message': 'Produto criado com sucesso!', 'id': novo_produto.id}), 201

@produtos_bp.route('/produtos/<int:id>', methods=['PUT'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def update_produto(id):
    produto = Produto.query.get_or_404(id)
    data = request.get_json()
    
    produto.nome = data.get('nome', produto.nome)
    produto.unidade = data.get('unidade', produto.unidade)
    produto.preco_unitario = data.get('preco_unitario', produto.preco_unitario)
    produto.estoque = data.get('estoque', produto.estoque)
    produto.categoria_id = data.get('categoria_id', produto.categoria_id)
    produto.almoxarifado_id = data.get('almoxarifado_id', produto.almoxarifado_id)
    
    db.session.commit()
    return jsonify({'message': 'Produto atualizado com sucesso!'})

@produtos_bp.route('/produtos/<int:id>', methods=['DELETE'])
@login_required
@gerente_required # <--- SÓ GERENTE PODE DELETAR
def delete_produto(id):
    produto = Produto.query.get_or_404(id)
    db.session.delete(produto)
    db.session.commit()
    return jsonify({'message': 'Produto apagado com sucesso!'})