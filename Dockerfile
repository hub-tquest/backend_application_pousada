# Dockerfile
FROM node:18-alpine AS builder

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build

# Etapa de produção
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache libc6-compat

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Criar diretório da aplicação
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Copiar dependências do builder
COPY --from=builder /app/node_modules ./node_modules

# Copiar build
COPY --from=builder /app/dist ./dist

# Copiar arquivos estáticos se necessário
COPY --from=builder /app/src/shared ./dist/shared

# Alterar permissões
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expor porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api || exit 1

# Comando de inicialização
CMD ["node", "dist/main.js"]