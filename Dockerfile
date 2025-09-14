FROM node:22-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm ci 

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando de inicialização
CMD ["node", "dist/main"]