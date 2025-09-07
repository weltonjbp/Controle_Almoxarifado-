# Em app/routes/fornecedores.py

from flask import Blueprint, jsonify, request
from ..models import db, Fornecedor
from flask_login import login_required
from ..decorators import gerente_required

fornecedores_bp = Blueprint('fornecedores', __name__)

@fornecedores_bp.route('/fornecedores', methods=['GET'])
@login_required
def get_fornecedores():
    page = request.args.get('page', 1, type=int)
    per_page = 20
    search = request.args.get('search', '')

    query = Fornecedor.query
    if search:
        query = query.filter(Fornecedor.nome.ilike(f'%{search}%'))

    pagination = query.order_by(Fornecedor.nome).paginate(page=page, per_page=per_page, error_out=False)
    fornecedores = pagination.items

    fornecedores_data = [{
        'id': f.id,
        'nome': f.nome,
        'razao_social': f.razao_social,
        'contato': f.contato,
        'fone': f.fone,
        'cidade': f.cidade
    } for f in fornecedores]
    
    return jsonify({
        'data': fornecedores_data,
        'total_pages': pagination.pages,
        'current_page': pagination.page
    })

@fornecedores_bp.route('/fornecedores/<int:id>', methods=['GET'])
@login_required
def get_fornecedor(id):
    f = Fornecedor.query.get_or_404(id)
    return jsonify({
        'id': f.id,
        'nome': f.nome,
        'razao_social': f.razao_social,
        'contato': f.contato,
        'cnpj': f.cnpj,
        'inscricao_estadual': f.inscricao_estadual,
        'fone': f.fone,
        'cel': f.cel,
        'whatsapp': f.whatsapp,
        'endereco': f.endereco,
        'bairro': f.bairro,
        'cep': f.cep,
        'cidade': f.cidade,
        'estado': f.estado,
        'email': f.email,
        'site': f.site,
        'observacao': f.observacao
    })

@fornecedores_bp.route('/fornecedores', methods=['POST'])
@login_required
@gerente_required
def create_fornecedor():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do fornecedor é obrigatório.'}), 400

    if data.get('cnpj') and Fornecedor.query.filter_by(cnpj=data['cnpj']).first():
        return jsonify({'error': 'Este CNPJ já está registado.'}), 409

    novo_fornecedor = Fornecedor(
        nome=data.get('nome'),
        razao_social=data.get('razao_social'),
        contato=data.get('contato'),
        cnpj=data.get('cnpj'),
        inscricao_estadual=data.get('inscricao_estadual'),
        fone=data.get('fone'),
        cel=data.get('cel'),
        whatsapp=data.get('whatsapp'),
        endereco=data.get('endereco'),
        bairro=data.get('bairro'),
        cep=data.get('cep'),
        cidade=data.get('cidade'),
        estado=data.get('estado'),
        email=data.get('email'),
        site=data.get('site'),
        observacao=data.get('observacao')
    )
    db.session.add(novo_fornecedor)
    db.session.commit()
    return jsonify({'message': 'Fornecedor criado com sucesso!'}), 201

@fornecedores_bp.route('/fornecedores/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_fornecedor(id):
    f = Fornecedor.query.get_or_404(id)
    data = request.get_json()
    
    # Verifica se o CNPJ foi alterado e se o novo já existe
    novo_cnpj = data.get('cnpj')
    if novo_cnpj and novo_cnpj != f.cnpj and Fornecedor.query.filter_by(cnpj=novo_cnpj).first():
        return jsonify({'error': 'Este CNPJ já está em uso por outro fornecedor.'}), 409

    f.nome = data.get('nome', f.nome)
    f.razao_social = data.get('razao_social', f.razao_social)
    f.contato = data.get('contato', f.contato)
    f.cnpj = data.get('cnpj', f.cnpj)
    f.inscricao_estadual = data.get('inscricao_estadual', f.inscricao_estadual)
    f.fone = data.get('fone', f.fone)
    f.cel = data.get('cel', f.cel)
    f.whatsapp = data.get('whatsapp', f.whatsapp)
    f.endereco = data.get('endereco', f.endereco)
    f.bairro = data.get('bairro', f.bairro)
    f.cep = data.get('cep', f.cep)
    f.cidade = data.get('cidade', f.cidade)
    f.estado = data.get('estado', f.estado)
    f.email = data.get('email', f.email)
    f.site = data.get('site', f.site)
    f.observacao = data.get('observacao', f.observacao)
    
    db.session.commit()
    return jsonify({'message': 'Fornecedor atualizado com sucesso!'})

@fornecedores_bp.route('/fornecedores/<int:id>', methods=['DELETE'])
@login_required
@gerente_required
def delete_fornecedor(id):
    fornecedor = Fornecedor.query.get_or_404(id)
    db.session.delete(fornecedor)
    db.session.commit()
    return jsonify({'message': 'Fornecedor apagado com sucesso!'})