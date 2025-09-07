from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class Usuario(db.Model, UserMixin):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    # --- MUDANÇA 1: Adicionado 'supervisor' como uma opção de role ---
    role = db.Column(db.Enum('gerente', 'supervisor', 'operador', name='user_roles'), nullable=False, default='supervisor')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Setor(db.Model):
    __tablename__ = 'setores'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.String(255), nullable=True)    
   
   
class Categoria(db.Model):
    __tablename__ = 'categorias'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.String(255), nullable=True) 
    
    
class Almoxarifado(db.Model):
    __tablename__ = 'almoxarifados'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    localizacao = db.Column(db.String(255), nullable=True)      
    
    
class Produto(db.Model):
    __tablename__ = 'produtos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    unidade = db.Column(db.String(20)) 
    preco_unitario = db.Column(db.Float)
    estoque = db.Column(db.Integer, default=0)
    
    # --- MUDANÇA 1: Adicionado campo para identificar EPI ---
    is_epi = db.Column(db.Boolean, default=False, nullable=False)
     # --- MUDANÇA 1: Adicionado campo para identificar Peça Veicular ---
    is_peca_veicular = db.Column(db.Boolean, default=False, nullable=False)
    
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)
    almoxarifado_id = db.Column(db.Integer, db.ForeignKey('almoxarifados.id'), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=True) # <-- ADICIONAR
    categoria = db.relationship('Categoria', backref='produtos')
    almoxarifado = db.relationship('Almoxarifado', backref='produtos')    
    fornecedor = db.relationship('Fornecedor', backref='produtos') # <-- ADICIONAR 
    
    
class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.Enum('entrada', 'saida', name='tipo_movimentacao'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    data = db.Column(db.DateTime, server_default=db.func.now())
    lote = db.Column(db.String(100), nullable=True)
    data_validade = db.Column(db.Date, nullable=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    setor_id = db.Column(db.Integer, db.ForeignKey('setores.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    funcionario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id'), nullable=True)
    veiculo_id = db.Column(db.Integer, db.ForeignKey('veiculos.id'), nullable=True)

    produto = db.relationship('Produto', backref='movimentacoes')
    setor = db.relationship('Setor', backref='movimentacoes')    
    usuario = db.relationship('Usuario', backref='movimentacoes')
    funcionario = db.relationship('Funcionario', backref='movimentacoes')
    veiculo = db.relationship('Veiculo', backref='movimentacoes')
    
class Funcao(db.Model):
    __tablename__ = 'funcoes'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    descricao = db.Column(db.String(255), nullable=True)
    
    
class TipoCombustivel(db.Model):
    __tablename__ = 'tipos_combustivel'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False, unique=True) # Ex: Diesel S10, Gasolina, Etanol
    
    
class TipoVeiculo(db.Model):
    __tablename__ = 'tipos_veiculo'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True) # Ex: Trator, Camião, Viatura Leve

class Veiculo(db.Model):
    __tablename__ = 'veiculos'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False, unique=True)
    placa = db.Column(db.String(20), unique=True, nullable=True)
    
    # --- GARANTIR QUE ESTA LINHA EXISTE ---
    hodometro_horimetro = db.Column(db.Float, nullable=True, default=0.0)
    
    tipo_veiculo_id = db.Column(db.Integer, db.ForeignKey('tipos_veiculo.id'), nullable=False)
    tipo_veiculo = db.relationship('TipoVeiculo', backref='veiculos')
    manutencoes = db.relationship('Manutencao', backref='veiculo', lazy=True, cascade="all, delete-orphan")


    
class CombustivelEstoque(db.Model):
    """ Tabela para armazenar o stock atual de cada tipo de combustível. """
    __tablename__ = 'combustivel_estoque'
    id = db.Column(db.Integer, primary_key=True)
    quantidade = db.Column(db.Float, nullable=False, default=0.0)
    
    tipo_combustivel_id = db.Column(db.Integer, db.ForeignKey('tipos_combustivel.id'), nullable=False, unique=True)
    tipo_combustivel = db.relationship('TipoCombustivel', backref='estoque', uselist=False)

class CombustivelEntrada(db.Model):
    """ Tabela para registar as entradas (compras) de combustível. """
    __tablename__ = 'combustivel_entradas'
    id = db.Column(db.Integer, primary_key=True)
    quantidade = db.Column(db.Float, nullable=False)
    preco_litro = db.Column(db.Float, nullable=False)
    data = db.Column(db.DateTime, server_default=db.func.now())
    observacao = db.Column(db.String(255))

    tipo_combustivel_id = db.Column(db.Integer, db.ForeignKey('tipos_combustivel.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=True) # <-- ADICIONAR
    tipo_combustivel = db.relationship('TipoCombustivel')
    usuario = db.relationship('Usuario')
    fornecedor = db.relationship('Fornecedor', backref='compras_combustivel') # <-- ADICIONAR
    
    
class CombustivelSaida(db.Model):
    __tablename__ = 'combustivel_saidas'
    id = db.Column(db.Integer, primary_key=True)
    quantidade_abastecida = db.Column(db.Float, nullable=False)
    horas_trabalhadas = db.Column(db.Float)
    
    # --- GARANTIR QUE ESTA LINHA EXISTE ---
    hodometro_horimetro = db.Column(db.Float, nullable=True)
    
    data = db.Column(db.DateTime, server_default=db.func.now())
    veiculo_id = db.Column(db.Integer, db.ForeignKey('veiculos.id'), nullable=False)
    funcao_id = db.Column(db.Integer, db.ForeignKey('funcoes.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    tipo_combustivel_id = db.Column(db.Integer, db.ForeignKey('tipos_combustivel.id'), nullable=False)

    veiculo = db.relationship('Veiculo')
    funcao = db.relationship('Funcao')
    usuario = db.relationship('Usuario')
    tipo_combustivel = db.relationship('TipoCombustivel')


class Funcionario(db.Model):
    __tablename__ = 'funcionarios'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    cargo = db.Column(db.String(100))
    setor_id = db.Column(db.Integer, db.ForeignKey('setores.id'), nullable=False)
    
    setor = db.relationship('Setor', backref='funcionarios')
    
        
    
class EstoqueLote(db.Model):
    __tablename__ = 'estoque_lotes'
    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    lote = db.Column(db.String(100), nullable=False)
    data_validade = db.Column(db.Date, nullable=True)
    quantidade = db.Column(db.Integer, nullable=False, default=0)
    produto = db.relationship('Produto', backref='lotes')    
    
class ManutencaoPecas(db.Model):
    __tablename__ = 'manutencao_pecas'
    id = db.Column(db.Integer, primary_key=True)
    manutencao_id = db.Column(db.Integer, db.ForeignKey('manutencoes.id'), nullable=False)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    produto = db.relationship('Produto')   
    
class Manutencao(db.Model):
    __tablename__ = 'manutencoes'
    id = db.Column(db.Integer, primary_key=True)
    veiculo_id = db.Column(db.Integer, db.ForeignKey('veiculos.id'), nullable=False)
    tipo = db.Column(db.Enum('Preventiva', 'Corretiva', name='tipo_manutencao'), nullable=False)
    data = db.Column(db.Date, nullable=False, default=db.func.current_date())
    descricao = db.Column(db.Text, nullable=False)
    custo_mo = db.Column(db.Float, nullable=True, default=0.0)
    pecas_utilizadas = db.relationship('ManutencaoPecas', backref='manutencao', lazy='dynamic', cascade="all, delete-orphan")

    @property
    def custo_pecas(self):
        total = 0
        for item in self.pecas_utilizadas:
            if item.produto and item.produto.preco_unitario:
                total += item.quantidade * item.produto.preco_unitario
        return total

    @property
    def custo_total(self):
        return (self.custo_mo or 0) + self.custo_pecas    
 
# --- NOVA TABELA ADICIONADA ---
class CodigoAcesso(db.Model):
    __tablename__ = 'codigos_acesso'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(50), unique=True, nullable=False)
    role_permitida = db.Column(db.String(20), nullable=False, default='supervisor')
    usado = db.Column(db.Boolean, default=False, nullable=False)
    data_criacao = db.Column(db.DateTime, server_default=db.func.now())    
    
    
class Fornecedor(db.Model):
    __tablename__ = 'fornecedores'
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    razao_social = db.Column(db.String(150))
    contato = db.Column(db.String(100))
    cnpj = db.Column(db.String(20), unique=True)
    inscricao_estadual = db.Column(db.String(20))
    fone = db.Column(db.String(20))
    cel = db.Column(db.String(20))
    whatsapp = db.Column(db.String(20))
    endereco = db.Column(db.String(255))
    bairro = db.Column(db.String(100))
    cep = db.Column(db.String(10))
    cidade = db.Column(db.String(100))
    estado = db.Column(db.String(2))
    email = db.Column(db.String(120))
    site = db.Column(db.String(255))
    observacao = db.Column(db.Text)
    
    # --- LINHA ADICIONADA PARA CRIAR A RELAÇÃO ---
    notas_fiscais = db.relationship('NotaFiscal', backref='fornecedor', lazy='dynamic', cascade="all, delete-orphan")  
    
    
# --- NOVA TABELA PARA NOTAS FISCAIS ---
# ... (código existente das outras classes, como Fornecedor) ...

# --- NOVA TABELA PARA NOTAS FISCAIS ---
class NotaFiscal(db.Model):
    __tablename__ = 'notas_fiscais'
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(50), nullable=False)
    data_emissao = db.Column(db.Date, nullable=False)
    valor_total = db.Column(db.Float, nullable=False)
    
    # Chave estrangeira que liga a nota fiscal ao fornecedor
    fornecedor_id = db.Column(db.Integer, db.ForeignKey('fornecedores.id'), nullable=False)


# --- ATUALIZAÇÃO NA CLASSE FORNECEDOR ---
# Encontre a sua classe Fornecedor e adicione a linha de relacionamento no final
