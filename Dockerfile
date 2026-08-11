# ---------- שלב build ----------
FROM node:22-alpine AS builder
WORKDIR /app

# התקנת תלויות (שכבה נפרדת ל-cache יעיל)
COPY package.json package-lock.json ./
RUN npm ci

# בנייה
COPY . .
RUN npm run build

# ---------- שלב run ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATA_DIR=/data

# משתמש לא-root
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# פלט standalone של Next: server.js + node_modules מינימלי + סטטי
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# תיקיית הנתונים (ווליום) — הבעלות ל-nextjs כדי שיוכל לכתוב
RUN mkdir -p /data && chown -R nextjs:nodejs /data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
