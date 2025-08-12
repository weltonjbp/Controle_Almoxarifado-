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
    role = db.Column(db.Enum('gerente', 'supervisor', name='user_roles'), nullable=False, default='supervisor')

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
    unidade = db.Column(db.String(20)) # Ex: 'kg', 'unidade', 'litro'
    preco_unitario = db.Column(db.Float)
    estoque = db.Column(db.Integer, default=0)
    
    # Chaves Estrangeiras (Relacionamentos)
    categoria_id = db.Column(db.Integer, db.ForeignKey('categorias.id'), nullable=False)
    almoxarifado_id = db.Column(db.Integer, db.ForeignKey('almoxarifados.id'), nullable=False)
    
    # Relações para facilitar o acesso aos objetos
    categoria = db.relationship('Categoria', backref='produtos')
    almoxarifado = db.relationship('Almoxarifado', backref='produtos')    
    
    
class Movimentacao(db.Model):
    __tablename__ = 'movimentacoes'
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.Enum('entrada', 'saida', name='tipo_movimentacao'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    data = db.Column(db.DateTime, server_default=db.func.now())
    
    # Chaves Estrangeiras
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    setor_id = db.Column(db.Integer, db.ForeignKey('setores.id'), nullable=False)
    
    # Relações
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    produto = db.relationship('Produto', backref='movimentacoes')
    setor = db.relationship('Setor', backref='movimentacoes')    
    usuario = db.relationship('Usuario', backref='movimentacoes')
    
    
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
    placa = db.Column(db.String(20), unique=True, nullable=True) # Placa pode ser opcional
    
    # Relação com Tipo de Veículo
    tipo_veiculo_id = db.Column(db.Integer, db.ForeignKey('tipos_veiculo.id'), nullable=False)
    tipo_veiculo = db.relationship('TipoVeiculo', backref='veiculos')
    
    
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

    tipo_combustivel = db.relationship('TipoCombustivel')
    usuario = db.relationship('Usuario')

class CombustivelSaida(db.Model):
    """ Tabela para registar as saídas (abastecimentos) e o uso dos veículos. """
    __tablename__ = 'combustivel_saidas'
    id = db.Column(db.Integer, primary_key=True)
    quantidade_abastecida = db.Column(db.Float, nullable=False)
    horas_trabalhadas = db.Column(db.Float)
    data = db.Column(db.DateTime, server_default=db.func.now())
    
    veiculo_id = db.Column(db.Integer, db.ForeignKey('veiculos.id'), nullable=False)
    funcao_id = db.Column(db.Integer, db.ForeignKey('funcoes.id'), nullable=False)
    usuario_id = db.Column(db.Integer, db.ForeignKey('usuarios.id'), nullable=False)
    tipo_combustivel_id = db.Column(db.Integer, db.ForeignKey('tipos_combustivel.id'), nullable=False)

    veiculo = db.relationship('Veiculo')
    funcao = db.relationship('Funcao')
    usuario = db.relationship('Usuario')
    tipo_combustivel = db.relationship('TipoCombustivel')

    
        
    