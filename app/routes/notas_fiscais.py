# Em app/routes/notas_fiscais.py

from flask import Blueprint, jsonify, request
from ..models import db, NotaFiscal, Fornecedor
from flask_login import login_required
from ..decorators import gerente_required
from datetime import datetime

notas_fiscais_bp = Blueprint('notas_fiscais', __name__)

# Rota para listar todas as notas de um fornecedor específico
@notas_fiscais_bp.route('/fornecedores/<int:fornecedor_id>/notas', methods=['GET'])
@login_required
def get_notas_por_fornecedor(fornecedor_id):
    fornecedor = Fornecedor.query.get_or_404(fornecedor_id)
    notas = fornecedor.notas_fiscais.order_by(NotaFiscal.data_emissao.desc()).all()
    
    notas_data = [{
        'id': nota.id,
        'numero': nota.numero,
        'data_emissao': nota.data_emissao.strftime('%d/%m/%Y'),
        'valor_total': nota.valor_total
    } for nota in notas]
    
    return jsonify(notas_data)

# Rota para buscar uma única nota fiscal (para edição)
@notas_fiscais_bp.route('/notas-fiscais/<int:id>', methods=['GET'])
@login_required
def get_nota_fiscal(id):
    nota = NotaFiscal.query.get_or_404(id)
    return jsonify({
        'id': nota.id,
        'numero': nota.numero,
        'data_emissao': nota.data_emissao.strftime('%Y-%m-%d'),
        'valor_total': nota.valor_total,
        'fornecedor_id': nota.fornecedor_id
    })

# Rota para criar uma nova nota fiscal
@notas_fiscais_bp.route('/notas-fiscais', methods=['POST'])
@login_required
@gerente_required
def create_nota_fiscal():
    data = request.get_json()
    if not all(k in data for k in ['numero', 'data_emissao', 'valor_total', 'fornecedor_id']):
        return jsonify({'error': 'Todos os campos são obrigatórios.'}), 400

    nova_nota = NotaFiscal(
        numero=data['numero'],
        data_emissao=datetime.strptime(data['data_emissao'], '%Y-%m-%d').date(),
        valor_total=float(data['valor_total']),
        fornecedor_id=data['fornecedor_id']
    )
    db.session.add(nova_nota)
    db.session.commit()
    return jsonify({'message': 'Nota Fiscal registada com sucesso!'}), 201

# Rota para atualizar uma nota fiscal
@notas_fiscais_bp.route('/notas-fiscais/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_nota_fiscal(id):
    nota = NotaFiscal.query.get_or_404(id)
    data = request.get_json()
    
    nota.numero = data.get('numero', nota.numero)
    if data.get('data_emissao'):
        nota.data_emissao = datetime.strptime(data['data_emissao'], '%Y-%m-%d').date()
    nota.valor_total = float(data.get('valor_total', nota.valor_total))
    
    db.session.commit()
    return jsonify({'message': 'Nota Fiscal atualizada com sucesso!'})

# Rota para apagar uma nota fiscal
@notas_fiscais_bp.route('/notas-fiscais/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_nota_fiscal(id):
    nota = NotaFiscal.query.get_or_404(id)
    db.session.delete(nota)
    db.session.commit()
    return jsonify({'message': 'Nota Fiscal apagada com sucesso!'})