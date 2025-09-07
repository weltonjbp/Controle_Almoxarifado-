# Em app/routes/veiculos.py

from flask import Blueprint, jsonify, request
from ..models import db, Veiculo, TipoVeiculo
from flask_login import login_required
from ..decorators import gerente_required

veiculos_bp = Blueprint('veiculos', __name__)

@veiculos_bp.route('/veiculos', methods=['GET'])
@login_required
def get_veiculos():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Veiculo.query
    if search:
        query = query.filter(Veiculo.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Veiculo.nome).paginate(page=page, per_page=per_page, error_out=False)
    veiculos = pagination.items

    dados_veiculos = []
    for v in veiculos:
        dados_veiculos.append({
            'id': v.id,
            'nome': v.nome,
            'placa': v.placa,
            'hodometro_horimetro': v.hodometro_horimetro, # <-- Linha adicionada
            'tipo_veiculo_nome': v.tipo_veiculo.nome if v.tipo_veiculo else 'Tipo Removido'
        })
        
    return jsonify({
        'data': dados_veiculos,
        'total_pages': pagination.pages,
        'current_page': pagination.page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })
    
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

    # --- CORREÇÃO APLICADA AQUI ---
    # Se a placa vier como uma string vazia, converte-a para None.
    placa = data.get('placa')
    if placa == '':
        placa = None

    # Verifica se a placa (se não for None) já existe
    if placa and Veiculo.query.filter_by(placa=placa).first():
        return jsonify({'error': 'Já existe um veículo com esta matrícula.'}), 409

    novo_veiculo = Veiculo(
        nome=data['nome'],
        placa=placa,  # Usa a variável placa tratada
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
    
    # --- CORREÇÃO APLICADA TAMBÉM NA ATUALIZAÇÃO ---
    placa = data.get('placa', veiculo.placa)
    if placa == '':
        placa = None
    
    # Verifica se a nova placa já está em uso por OUTRO veículo
    if placa and veiculo.placa != placa and Veiculo.query.filter_by(placa=placa).first():
        return jsonify({'error': 'Esta matrícula já está em uso por outro veículo.'}), 409

    veiculo.nome = data.get('nome', veiculo.nome)
    veiculo.placa = placa # Usa a variável placa tratada
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