# Stage 1: Build dell'applicazione
FROM oven/bun:1 as builder
WORKDIR /app

# Env var VITE_* richieste a build-time (Vite le inietta nel bundle durante la build,
# vanno passate come --build-arg / Dokploy "Build Args", non come env var runtime)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# Copia i file per l'installazione delle dipendenze
COPY package.json bun.lockb ./

# Installa le dipendenze
RUN bun install

# Copia il resto del codice sorgente
COPY . .

# Costruisci l'app per la produzione
# (Vite piazzerà i file statici compilati nella cartella /app/dist)
RUN bun run build

# Stage 2: Serve con Nginx
FROM nginx:alpine

# Copia il file di configurazione personalizzato di Nginx per le SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia i file buildati dallo stage precedente
COPY --from=builder /app/dist /usr/share/nginx/html

# Esponi la porta 80
EXPOSE 80

# Avvia nginx
CMD ["nginx", "-g", "daemon off;"]
