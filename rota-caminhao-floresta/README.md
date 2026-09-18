# Rota de caminhão no bairro Floresta

Aplicação React + Vite que demonstra uma rota urbana para caminhão entre o Shopping Total e a Vila Flores, em Porto Alegre. O percurso usa o perfil `driving-hgv` do openrouteservice e é desenhado sobre um mapa OpenStreetMap com React Leaflet.

## Requisitos

- Node.js 20.19 ou superior
- Uma chave gratuita do openrouteservice

## Instalação

```bash
npm install
cp .env.example .env
```

Abra `.env` e informe sua chave:

```env
ORS_API_KEY=sua_chave_real
PORT=8787
```

Execute em desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:5173`.

## Produção local

```bash
npm run build
npm start
```

Acesse `http://localhost:8787`.

## Arquitetura

O navegador chama somente `/api/route`. O servidor Node mantém `ORS_API_KEY` fora do código do cliente, geocodifica origem e destino, consulta o endpoint `driving-hgv/geojson` e devolve a rota ao React.

## Atenção

As restrições para caminhões dependem da cobertura e da qualidade dos dados registrados no OpenStreetMap. Valide rotas críticas com fontes oficiais e sinalização local.

Autor: Sandro Martins da Costa - @eisandromc  
Ecossistema: Perestroika Major 3
