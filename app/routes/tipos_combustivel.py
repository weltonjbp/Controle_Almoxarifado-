# Em app/routes/tipos_combustivel.py

from flask import Blueprint, jsonify, request
from ..models import db, TipoCombustivel
from flask_login import login_required
from ..decorators import gerente_required

tipos_combustivel_bp = Blueprint('tipos_combustivel', __name__)

@tipos_combustivel_bp.route('/tipos_combustivel', methods=['GET'])
@login_required
def get_tipos_combustivel():
    tipos = TipoCombustivel.query.order_by(TipoCombustivel.nome).all()
    return jsonify([{'id': t.id, 'nome': t.nome} for t in tipos])

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['GET'])
@login_required
def get_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    return jsonify({'id': tipo.id, 'nome': tipo.nome})

@tipos_combustivel_bp.route('/tipos_combustivel', methods=['POST'])
@login_required
@gerente_required
def create_tipo_combustivel():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do tipo de combustível é obrigatório.'}), 400
    if TipoCombustivel.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Este tipo de combustível já existe.'}), 409

    novo_tipo = TipoCombustivel(nome=data['nome'])
    db.session.add(novo_tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível criado com sucesso!'}), 201

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    data = request.get_json()
    novo_nome = data.get('nome')
    if novo_nome and novo_nome != tipo.nome and TipoCombustivel.query.filter_by(nome=novo_nome).first():
        return jsonify({'error': 'Este nome de tipo de combustível já está em uso.'}), 409
        
    tipo.nome = novo_nome or tipo.nome
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível atualizado com sucesso!'})

@tipos_combustivel_bp.route('/tipos_combustivel/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_tipo_combustivel(id):
    tipo = TipoCombustivel.query.get_or_404(id)
    db.session.delete(tipo)
    db.session.commit()
    return jsonify({'message': 'Tipo de combustível apagado com sucesso!'})
