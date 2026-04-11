FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_CLOUD_API_URL
ENV NEXT_PUBLIC_CLOUD_API_URL=$NEXT_PUBLIC_CLOUD_API_URL

COPY . .

RUN npm install
RUN npm run build:contracts
RUN npm run build -w cloud-web

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

ARG NEXT_PUBLIC_CLOUD_API_URL
ENV NEXT_PUBLIC_CLOUD_API_URL=$NEXT_PUBLIC_CLOUD_API_URL

COPY package.json package-lock.json ./
COPY apps/cloud-web/package.json ./apps/cloud-web/package.json
COPY packages/shared-contracts/package.json ./packages/shared-contracts/package.json

RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/apps/cloud-web/.next ./apps/cloud-web/.next
COPY --from=builder /app/apps/cloud-web/public ./apps/cloud-web/public
COPY --from=builder /app/apps/cloud-web/package.json ./apps/cloud-web/package.json
COPY --from=builder /app/apps/cloud-web/next.config.ts ./apps/cloud-web/next.config.ts
COPY --from=builder /app/packages/shared-contracts ./packages/shared-contracts

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "cloud-web"]
