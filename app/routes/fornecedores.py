# Em app/routes/fornecedores.py

from flask import Blueprint, jsonify, request
from ..models import db, Fornecedor
from flask_login import login_required
from ..decorators import gerente_required
# --- NOVO IMPORT ADICIONADO (BIBLIOTECA PADRÃO DO PYTHON) ---
import xml.etree.ElementTree as ET

fornecedores_bp = Blueprint('fornecedores', __name__)

# --- ROTA ATUALIZADA PARA ACEITAR UPLOAD DE XML ---
@fornecedores_bp.route('/fornecedores/consultar-nfe', methods=['POST'])
@login_required
def consultar_nfe_xml():
    """Lê um ficheiro XML de NF-e, extrai os dados do emitente (fornecedor) e retorna um JSON."""
    if 'nfe_xml' not in request.files:
        return jsonify({'error': 'Nenhum ficheiro XML enviado.'}), 400

    file = request.files['nfe_xml']
    if file.filename == '':
        return jsonify({'error': 'Nenhum ficheiro selecionado.'}), 400

    try:
        # Define o namespace padrão do XML da NF-e
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Lê e analisa o conteúdo do ficheiro XML
        tree = ET.parse(file.stream)
        root = tree.getroot()

        # Encontra a secção do emitente (fornecedor)
        emitente_node = root.find('.//nfe:emit', ns)
        if emitente_node is None:
            return jsonify({'error': 'Estrutura do XML inválida: não foi possível encontrar os dados do emitente.'}), 400
            
        endereco_node = emitente_node.find('.//nfe:enderEmit', ns)

        # Função auxiliar para encontrar texto num nó de forma segura
        def find_text(node, path):
            element = node.find(path, ns)
            return element.text if element is not None else ''

        # Extrai os dados e monta o dicionário de resposta
        dados_fornecedor = {
            'cnpj': find_text(emitente_node, 'nfe:CNPJ'),
            'razao_social': find_text(emitente_node, 'nfe:xNome'),
            'nome': find_text(emitente_node, 'nfe:xFant'),
            'endereco': (find_text(endereco_node, 'nfe:xLgr') or '') + ', ' + (find_text(endereco_node, 'nfe:nro') or ''),
            'bairro': find_text(endereco_node, 'nfe:xBairro'),
            'cidade': find_text(endereco_node, 'nfe:xMun'),
            'estado': find_text(endereco_node, 'nfe:UF'),
            'cep': find_text(endereco_node, 'nfe:CEP'),
            'fone': find_text(endereco_node, 'nfe:fone'),
        }

        return jsonify(dados_fornecedor)

    except ET.ParseError:
        return jsonify({'error': 'Ficheiro inválido. O ficheiro não parece ser um XML de NF-e válido.'}), 400
    except Exception as e:
        return jsonify({'error': f'Ocorreu um erro inesperado ao processar o ficheiro: {e}'}), 500


# --- O RESTO DO FICHEIRO CONTINUA IGUAL ---
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
    fornecedores_data = [{'id': f.id, 'nome': f.nome, 'razao_social': f.razao_social, 'contato': f.contato, 'fone': f.fone, 'cidade': f.cidade} for f in fornecedores]
    return jsonify({'data': fornecedores_data, 'total_pages': pagination.pages, 'current_page': pagination.page})

@fornecedores_bp.route('/fornecedores/<int:id>', methods=['GET'])
@login_required
def get_fornecedor(id):
    f = Fornecedor.query.get_or_404(id)
    return jsonify({'id': f.id, 'nome': f.nome, 'razao_social': f.razao_social, 'contato': f.contato, 'cnpj': f.cnpj, 'inscricao_estadual': f.inscricao_estadual, 'fone': f.fone, 'cel': f.cel, 'whatsapp': f.whatsapp, 'endereco': f.endereco, 'bairro': f.bairro, 'cep': f.cep, 'cidade': f.cidade, 'estado': f.estado, 'email': f.email, 'site': f.site, 'observacao': f.observacao})

@fornecedores_bp.route('/fornecedores', methods=['POST'])
@login_required
@gerente_required
def create_fornecedor():
    data = request.get_json()
    if not data or not data.get('nome'):
        return jsonify({'error': 'O nome do fornecedor é obrigatório.'}), 400
    if data.get('cnpj') and Fornecedor.query.filter_by(cnpj=data['cnpj']).first():
        return jsonify({'error': 'Este CNPJ já está registado.'}), 409
    novo_fornecedor = Fornecedor(nome=data.get('nome'), razao_social=data.get('razao_social'), contato=data.get('contato'), cnpj=data.get('cnpj'), inscricao_estadual=data.get('inscricao_estadual'), fone=data.get('fone'), cel=data.get('cel'), whatsapp=data.get('whatsapp'), endereco=data.get('endereco'), bairro=data.get('bairro'), cep=data.get('cep'), cidade=data.get('cidade'), estado=data.get('estado'), email=data.get('email'), site=data.get('site'), observacao=data.get('observacao'))
    db.session.add(novo_fornecedor)
    db.session.commit()
    return jsonify({'message': 'Fornecedor criado com sucesso!'}), 201

@fornecedores_bp.route('/fornecedores/<int:id>', methods=['PUT'])
@login_required
@gerente_required
def update_fornecedor(id):
    f = Fornecedor.query.get_or_404(id)
    data = request.get_json()
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