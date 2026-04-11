FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install
RUN npm run build:contracts
RUN npm run build -w cloud-web

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY . .

RUN npm install
RUN npm prune --omit=dev

COPY --from=builder /app/apps/cloud-web/.next ./apps/cloud-web/.next
COPY --from=builder /app/packages/shared-contracts/dist ./packages/shared-contracts/dist

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "cloud-web"]
