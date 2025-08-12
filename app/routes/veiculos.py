# Em app/routes/veiculos.py

from flask import Blueprint, jsonify, request
from ..models import db, Veiculo, TipoVeiculo
from flask_login import login_required
from ..decorators import gerente_required

veiculos_bp = Blueprint('veiculos', __name__)

@veiculos_bp.route('/veiculos', methods=['GET'])
@login_required
def get_veiculos():
    veiculos = Veiculo.query.order_by(Veiculo.nome).all()
    return jsonify([{
        'id': v.id,
        'nome': v.nome,
        'placa': v.placa,
        'tipo_veiculo_nome': v.tipo_veiculo.nome
    } for v in veiculos])

@veiculos_bp.route('/veiculos/<int:id>', methods=['GET'])
@login_required
def get_veiculo(id):
    v = Veiculo.query.get_or_404(id)
    return jsonify({
        'id': v.id,
        'nome': v.nome,
        'placa': v.placa,
        'tipo_veiculo_id': v.tipo_veiculo_id
    })

@veiculos_bp.route('/veiculos', methods=['POST'])
@login_required
@gerente_required
def create_veiculo():
    data = request.get_json()
    if not data or not data.get('nome') or not data.get('tipo_veiculo_id'):
        return jsonify({'error': 'Nome e tipo de veículo são obrigatórios.'}), 400
    if Veiculo.query.filter_by(nome=data['nome']).first():
        return jsonify({'error': 'Já existe um veículo com este nome.'}), 409

    novo_veiculo = Veiculo(
        nome=data['nome'],
        placa=data.get('placa'),
        tipo_veiculo_id=data['tipo_veiculo_id']
    )
    db.session.add(novo_veiculo)
    db.session.commit()
    return jsonify({'message': 'Veículo criado com sucesso!'}), 201

@veiculos_bp.route('/veiculos/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_veiculo(id):
    veiculo = Veiculo.query.get_or_404(id)
    data = request.get_json()
    
    veiculo.nome = data.get('nome', veiculo.nome)
    veiculo.placa = data.get('placa', veiculo.placa)
    veiculo.tipo_veiculo_id = data.get('tipo_veiculo_id', veiculo.tipo_veiculo_id)
    
    db.session.commit()
    return jsonify({'message': 'Veículo atualizado com sucesso!'})

@veiculos_bp.route('/veiculos/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_veiculo(id):
    veiculo = Veiculo.query.get_or_404(id)
    db.session.delete(veiculo)
    db.session.commit()
    return jsonify({'message': 'Veículo apagado com sucesso!'})
